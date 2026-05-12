# owner-dashboard — memoir. Owner Dashboard

Dashboard web untuk studio owner mengelola kiosk, template, subscription, payment configs, dan transaksi. Frontend-only app — semua data dari Backend API via Next.js rewrite proxy.

## Commands

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint — zero-warning policy (--max-warnings 0)
npm run typecheck    # tsc --noEmit
```

Tidak ada test framework. CI: lint → typecheck → build.

## Git Workflow

Dua branch utama:
- `staging` — branch kerja sehari-hari, deploy ke Vercel staging environment
- `main` — production, **JANGAN push langsung** — hanya via PR dari `staging`

```
staging  →  PR  →  main (prod)
```

**Aturan:**
- Semua pekerjaan dilakukan di branch `staging`
- Siap deploy ke prod → buat PR dari `staging` ke `main` di GitHub
- Direct push ke `main` diblokir via GitHub branch protection
- Hotfix tetap lewat `staging` → `main`

## Tech Stack

Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui (New York style, zinc theme), lucide-react icons, TanStack React Query v5, react-hook-form + Zod, Konva.js + react-konva (template editor), react-image-crop (background upload/cropping), sonner (toasts), qrcode.react. Package manager: npm.

## Architecture

### API Proxy

Frontend memanggil `/api/v1/*` (relative path di `src/lib/api.ts`). `next.config.ts` rewrite ke `NEXT_PUBLIC_API_URL`.

Satu-satunya server-side logic: route handler `src/app/api/logout/route.ts` — clear HttpOnly cookie + forward logout ke backend.

### Auth Flow

- **Access token: in-memory** (variable di `api.ts`) — BUKAN localStorage. Hilang saat page refresh, di-restore via refresh token.
- **Refresh token:** HttpOnly cookie (server-set)
- **On 401:** shared-promise deduplicated refresh → retry sekali → jika gagal, redirect `/login`
- **Login ordering:** fetch subscription SEBELUM set user state — mencegah redirect prematur ke `/onboarding`
- **Logout:** `window.location.href = "/login"` (hard reload) — reset semua in-memory state
- **Subscription status:** `ACTIVE`, `PENDING_PAYMENT`, `EXPIRED`, `CANCELLED` (tidak ada GRACE_PERIOD)

### Route Protection (client-side, bukan middleware)

- `(auth)/` — `/login` (public)
- `(dashboard)/` — semua protected routes (redirect ke `/login` jika unauthenticated, ke `/onboarding` jika no active subscription)
- `onboarding/` — subscription selection (redirect ke `/` jika sudah punya active subscription)

### Data Fetching

`apiFetch` return `res.json()` mentah (TIDAK auto-unwrap) — hooks handle unwrap `{ data: T }` sendiri.

## Konvensi

### Umum

- Path alias: `@/*` → `./src/*`
- Bahasa UI: **Bahasa Indonesia** — semua label, pesan error, placeholder
- Currency: Rupiah format id-ID tanpa desimal (`Rp 25.000`)
- Date: `d MMM yyyy` id-ID (`23 Feb 2026`). Datetime: `d MMM, HH.mm` tanpa tahun (`23 Feb, 14.30`)
- shadcn/ui components di `src/components/ui/` — tambah via `npx shadcn@latest add <component>`
- ESLint: unused vars harus prefix `_`
- `cn()` helper (clsx + tailwind-merge) untuk conditional classNames

### API & Types

- Types di `src/lib/types.ts` HARUS match dengan response shapes dari Backend API
- Monetary values: number (integer Rupiah) — JANGAN pakai floating point
- IDs: string (UUID v4), Timestamps: string (ISO 8601), Nullable: `T | null`
- Paginated response: `{ data: T[], meta: { page, limit, total } }`

### Template Editor (Konva)

- Konva HARUS dynamic import dengan `ssr: false` — Konva tidak support SSR
- Element creation: **sequential** (bukan parallel) — menghindari 409 conflict
- Setiap `PHOTO_SLOT` WAJIB punya `captureOrder` (integer, unik per template)
- Template WAJIB minimal 1 `PHOTO_SLOT` — guard delete yang terakhir

### State Management

- Server state: gunakan **TanStack Query** — JANGAN fetch manual atau pakai global store
- Form state: gunakan **react-hook-form** + Zod resolver
- Auth state: gunakan React Context (`auth-provider.tsx`) — JANGAN tambah auth logic di tempat lain
- UI state: `useState` lokal — JANGAN pakai global state (Redux, Zustand, dll)
- **Optimistic updates** dengan rollback pada kiosk update dan template toggle/delete
- **Cache seeding**: template list embed elements → seed ke per-template element query cache

### Error Handling

- `ApiError` class di `src/lib/api.ts` — 401 di-handle otomatis (refresh + retry + redirect)
- Toast (sonner) untuk feedback success/error pada mutations
- Tampilkan pesan Indonesian yang user-friendly, bukan error code mentah

## Business Rules (Frontend)

Aturan di-enforce di backend, tapi frontend harus handle secara UX:

- **Subscription banner** — tampilkan banner dinamis: `ACTIVE` (green), `PENDING_PAYMENT` (yellow), `EXPIRED` (red), `CANCELLED` (gray). EXPIRED → redirect `/onboarding`
- **Pending upgrade** — AuthContext track `pendingUpgrade` (PENDING_PAYMENT saat upgrade in-flight)
- **QRIS payment flow** — QR code + countdown timer + auto-poll payment status
- **Max kiosks reached** → disable "Tambah Kiosk" (cek `activeCount` vs `maxKiosks`)
- **Template delete guard** → 409 jika punya transaksi, sarankan nonaktifkan
- **Photo slot minimum** → tolak delete PHOTO_SLOT terakhir
- **Unique captureOrder** → validasi di form sebelum submit
- **Immutable price snapshot** → transaksi tampilkan harga saat transaksi, bukan harga kiosk saat ini

### BYOP — Payment Configs

Owner mengelola payment provider mereka sendiri via `owner_payment_configs`:

- **Providers**: `DOKU`, `MIDTRANS`, `XENDIT`
- **Payment methods**: `PG` (dynamic QRIS), `CASH` (konfirmasi manual), `STATIC_QRIS` (QRIS statis owner — flow sama seperti CASH)
- **Status config**: `PENDING_VALIDATION` → `ACTIVE` (validasi OK) / `INVALID` (gagal) / `DISABLED` (disuspend)
- **Max 1 default** per owner — tampilkan badge "Default" pada config yang aktif sebagai default
- **Credentials**: JANGAN tampilkan raw credentials — hanya tampilkan `credentialsLastFour`
- **Transaction types**: `NORMAL` (single session, default), `EVENT` (multi-session/batch)
