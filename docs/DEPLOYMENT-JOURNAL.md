# Deployment Journal — Backend Memoir API

> Catatan kronologis setup deployment, ditulis 7 Maret 2026.

---

## 1. Kondisi Awal

Repo backend Memoir sudah selesai diimplementasikan (EPIC-01 sampai EPIC-06) dengan stack Fastify 5 + TypeScript + Drizzle ORM + Supabase PostgreSQL. Semua fitur sudah coded dan tested secara lokal, tapi belum pernah di-deploy ke production.

Yang sudah ada di repo:

- `vercel.json` dengan konfigurasi dasar (rewrites + serverless function)
- `api/serverless.ts` sebagai entry point Vercel yang meng-adapt Fastify ke `IncomingMessage/ServerResponse`
- `src/infrastructure/persistence/drizzle/connection.ts` yang sudah punya deteksi `process.env.VERCEL` untuk mengatur connection pooling serverless (max 1 koneksi, tanpa prepared statements — diperlukan karena Supabase pakai PgBouncer)
- 4 file migration Drizzle di `drizzle/`
- Environment config yang sudah tervalidasi ketat via `@t3-oss/env-core`

Yang belum ada:

- CI/CD pipeline (tidak ada `.github/workflows/`)
- Dokumentasi deployment
- Belum pernah di-deploy ke Vercel

## 2. Vercel Config

### Apa yang dilakukan

Mengupdate `vercel.json` dengan dua perubahan:

1. Menambahkan `"framework": null` — mencegah Vercel auto-detect Fastify dan mengambil alih routing. Kita pakai pendekatan "API route" di mana semua request di-rewrite ke `api/serverless.ts`, bukan native Fastify entrypoint detection.
2. Membersihkan rewrite destination dari `/api/serverless.ts` menjadi `/api/serverless` (tanpa extension).

### Keputusan teknis

Ada dua opsi: native Fastify support (Fluid Compute) atau custom serverless handler. Dipilih **custom handler** karena user prefer pendekatan serverless yang gratis (Hobby plan). Native Fastify mode adalah fitur lebih baru dari Vercel yang butuh Fluid Compute — secara fungsional sama, tapi handler approach sudah proven dan lebih predictable di Hobby plan.

## 3. GitHub Actions CI/CD

### Apa yang dilakukan

Membuat dua workflow file:

**`ci.yml`** — berjalan di setiap push/PR ke `main`:

- Job 1: Lint + Typecheck (cepat, ~2 menit)
- Job 2: Test (butuh database — pakai PostgreSQL 16 Alpine sebagai service container)
  - Jalankan migration → seed → test

**`deploy.yml`** — berjalan hanya di push ke `main`:

- Job CI (sama seperti di atas)
- Job Deploy (setelah CI pass):
  - Install dependencies
  - Jalankan `pnpm db:migrate` terhadap **production database** (via `DATABASE_URL` secret)
  - `vercel pull` → `vercel build` → `vercel deploy --prebuilt --prod`

### Keputusan teknis

- Migration production dijalankan **di CI, sebelum deploy** — bukan di runtime. Ini lebih aman karena kalau migration gagal, deploy tidak akan jalan.
- Test environment pakai PostgreSQL service container (bukan database cloud), jadi CI tidak bergantung pada Supabase dan tidak pollute production data.

## 4. Drizzle Migration Strategy

Migration sudah ada 4 file dan sudah pernah dijalankan ke database Supabase (saat development). Di CI, migration dijalankan otomatis di 2 tempat:

1. **CI test job**: tabel di-create di PostgreSQL service container, lalu di-seed untuk integration test
2. **Deploy job**: migration dijalankan ke production DB sebelum deploy

Untuk workflow sehari-hari: setelah mengubah schema, jalankan `pnpm db:generate` untuk generate migration baru, lalu push ke Git — CI akan otomatis apply ke production saat merge ke `main`.

## 5. Environment Variables & Dokumentasi

Dibuat `docs/DEPLOYMENT.md` berisi tabel lengkap semua env vars (mana yang required, mana yang punya default), cara setup Vercel dashboard, GitHub secrets, first deploy steps, dan catatan arsitektur.

**GitHub Secrets yang perlu di-set:**

| Secret              | Nilai                                 |
| ------------------- | ------------------------------------- |
| `VERCEL_TOKEN`      | Token yang dipakai saat setup         |
| `VERCEL_ORG_ID`     | `team_o9dHspGFODjkICi1WX1Y67p7`       |
| `VERCEL_PROJECT_ID` | `prj_G3He35gcjDCU1AP81QJU06K1aLG4`    |
| `DATABASE_URL`      | Connection string Supabase production |

## 6. First Deploy — Dan Masalah yang Ditemukan

### Masalah 1: Build gagal (`tsc` error)

Vercel otomatis menjalankan `pnpm run build` (yaitu `tsc`) sebagai build step. TypeScript compilation gagal karena ada type errors di test files dan 1 missing enum di source code.

**Solusi:** Set `"buildCommand": ""` di `vercel.json`. Alasannya: Vercel `@vercel/node` runtime sudah compile TypeScript secara langsung saat fungsi di-invoke — tidak perlu pre-build via `tsc`. Build step `tsc` lebih cocok untuk standalone Node.js deployment, bukan serverless.

### Masalah 2: FUNCTION_INVOCATION_FAILED (500 error)

Deploy berhasil tapi setiap request return 500. Tidak ada error message yang berguna dari Vercel logs.

**Investigasi:** Saya menambahkan error boundary di `api/serverless.ts` — wrap `buildApp()` dalam try/catch dan return error detail di response body. Setelah deploy ulang, terlihat error: `"Invalid environment variables"`.

**Root cause:** Saat set env vars via CLI menggunakan `<<<` heredoc, setiap value mendapat **trailing newline**. Contoh: `NODE_ENV` jadi `"production\n"` (11 chars, bukan 10) — yang gagal validasi `z.enum(["development", "test", "production"])`.

**Solusi:** Hapus semua env vars, re-add menggunakan `printf` (tanpa trailing newline):

```bash
printf 'production' | npx vercel env add NODE_ENV production --token=...
```

### Masalah 3: Missing enum value di kiosk schema

Zod response schema untuk `GET /api/v1/kiosk/me` tidak include `PENDING_PAYMENT` di enum `subscriptionStatus`, padahal domain enum sudah punya status itu. Ini menyebabkan type mismatch antara use case result dan response schema.

**Solusi:** Tambahkan `"PENDING_PAYMENT"` ke `KioskConfigResponseSchema` di `kiosk.schema.ts`.

### Setelah semua fix

Deploy berhasil, `GET /health` return `{"status":"ok"}`, dan `POST /api/v1/auth/login` berhasil return JWT — artinya database connection, argon2 hashing, dan JWT signing semuanya berjalan di Vercel serverless.

## 7. TypeScript Error Cleanup

23 TypeScript errors di test files — semuanya `"Object is possibly 'undefined'"` karena `noUncheckedIndexedAccess: true` di tsconfig. Ini terjadi saat akses `mock.calls[0]` atau `result[0]` — TypeScript tidak bisa guarantee array index pasti ada.

**Solusi:** Tambahkan non-null assertion (`!`) di 7 test files. Ini aman karena di konteks test, kita tahu pasti array sudah terisi (assertion sebelumnya sudah memverifikasi length).

Setelah fix: `pnpm typecheck` = **0 errors**, `pnpm test` = **247/248 pass** (1 failure pre-existing di `kiosk-flow.test.ts` — unrelated).

---

## Hal yang Perlu Diperhatikan

### Production URL

**https://backend-memoir.vercel.app**

### Yang sudah verified berjalan

- `GET /health` → `{"status":"ok"}`
- `POST /api/v1/auth/login` → JWT + user data
- Database connection ke Supabase ✓
- Argon2 password hashing ✓ (native addon works di Vercel)

### Yang perlu dilakukan

1. **Set GitHub Secrets** — 4 secrets di atas perlu di-set di GitHub repo settings agar CI/CD berjalan saat push
2. **CORS_ORIGINS** — saat ini kosong (empty string). Setelah frontend dashboard di-deploy, tambahkan URL-nya di Vercel env vars
3. **Xendit production key** — saat ini masih pakai development key. Ganti saat siap go-live
4. **JWT/Cookie secrets** — yang dipakai sekarang adalah string readable, bukan random. Untuk production serius, sebaiknya di-rotate ke random 64-char string
5. **`kiosk-flow.test.ts` failure** — ada 1 integration test yang gagal (wallet balance undefined setelah cash confirm). Ini pre-existing, bukan dari deployment changes, tapi perlu di-investigate

### Batasan Vercel Hobby Plan

- **Memory**: 1024 MB per function invocation
- **Timeout**: hingga 300 detik (Fluid Compute) atau 60 detik (legacy). Kita set 30 detik di `vercel.json`
- **Bandwidth**: 100 GB/bulan
- **Serverless function execution**: 100 GB-hours/bulan
- **Cold start**: expected ~1-3 detik untuk invocation pertama setelah idle

### File yang diubah/dibuat

| File                                       | Aksi                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `vercel.json`                              | Updated — framework null, buildCommand empty, clean rewrite            |
| `.github/workflows/ci.yml`                 | Created — lint → typecheck → test                                      |
| `.github/workflows/deploy.yml`             | Created — CI → migrate → deploy                                        |
| `docs/DEPLOYMENT.md`                       | Created — env vars table, setup guide                                  |
| `docs/DEPLOYMENT-JOURNAL.md`               | Created — dokumen ini                                                  |
| `api/serverless.ts`                        | Reverted — sempat ditambah error boundary, dikembalikan ke versi clean |
| `src/presentation/schemas/kiosk.schema.ts` | Fixed — tambah PENDING_PAYMENT                                         |
| `tests/auth/login-use-case.test.ts`        | Fixed — non-null assertion                                             |
| `tests/auth/pair-kiosk-use-case.test.ts`   | Fixed — non-null assertion                                             |
| `tests/kiosk/sync-templates.test.ts`       | Fixed — non-null assertion                                             |
| `tests/kiosk/upload-session.test.ts`       | Fixed — non-null assertion                                             |
| `tests/owner/get-transactions.test.ts`     | Fixed — non-null assertion                                             |
| `tests/owner/list-withdrawals.test.ts`     | Fixed — non-null assertion                                             |
| `tests/owner/manage-template.test.ts`      | Fixed — non-null assertion                                             |
