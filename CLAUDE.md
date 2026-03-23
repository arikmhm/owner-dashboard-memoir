# owner-dashboard — memoir. Owner Dashboard

Dashboard web untuk studio owner mengelola kiosk, template, subscription, wallet, dan transaksi. Frontend-only app — semua data dari Backend API via Next.js rewrite proxy.

Dokumentasi platform (PRD, API docs, Postman, schema) ada di **`../memoir-docs/`**. Saat butuh referensi API contract, response shapes, atau business rules, baca dari sana — jangan duplikasi.

## Commands

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint — zero-warning policy (--max-warnings 0)
npm run typecheck    # tsc --noEmit
```

Tidak ada test framework. CI: lint → typecheck → build.

## Tech Stack

Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui (New York style, zinc theme), lucide-react icons, TanStack React Query v5, react-hook-form + Zod, Konva.js + react-konva (template editor), react-image-crop (background upload/cropping), sonner (toasts), qrcode.react. Package manager: npm.

## Architecture

### API Proxy

Frontend memanggil `/api/v1/*` (relative path di `src/lib/api.ts`). `next.config.ts` rewrite ke `NEXT_PUBLIC_API_URL`. Env variable: `NEXT_PUBLIC_API_URL`.

Satu-satunya server-side logic: route handler `src/app/api/logout/route.ts` — clear HttpOnly cookie + forward logout ke backend untuk delete token dari DB.

### Security Headers

`next.config.ts` set security headers untuk semua routes: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo disabled), `poweredByHeader: false`.

### Auth Flow

`src/components/auth-provider.tsx` + `src/lib/api.ts`:

- **Access token: in-memory** (variable di `api.ts`) — BUKAN localStorage. Hilang saat page refresh, di-restore via refresh token.
- **Refresh token:** HttpOnly cookie (server-set, tidak bisa diakses JS)
- **User info:** decoded dari JWT payload client-side via `decodeTokenUser()` (id, role, email)
- **On 401:** shared-promise deduplicated refresh → retry sekali → jika gagal, dispatch `TOKEN_REMOVED_EVENT` → AuthProvider clear state → redirect `/login`
- **Login ordering:** fetch subscription SEBELUM set user state — mencegah route protection redirect prematur ke `/onboarding`
- **Logout:** `window.location.href = "/login"` (hard reload, bukan router.replace) — reset semua in-memory state + query cache
- **Route protection** (client-side, bukan middleware):
  - Unauthenticated + bukan public route → `/login`
  - Authenticated + di `/login` → `/` (jika ada subscription aktif) atau `/onboarding`
  - Authenticated + dashboard route + no active subscription → `/onboarding`
  - Authenticated + `/onboarding` + punya active subscription → `/`
  - `GRACE_PERIOD` diperlakukan sama dengan `ACTIVE` untuk akses dashboard

### Route Groups

- `(auth)/` — `/login` (public)
- `(dashboard)/` — semua protected routes: kiosks, templates, transactions, wallet, subscription
- `onboarding/` — subscription selection (auth required, no active subscription)
- `api/logout/` — route handler server-side (clear cookie + delete token dari DB)

### Data Fetching

Setiap domain punya hook di `src/hooks/` yang wrap TanStack Query:

| Hook                  | Domain                                       |
| --------------------- | -------------------------------------------- |
| `use-dashboard.ts`    | Dashboard stats (server-aggregated)          |
| `use-kiosks.ts`       | Kiosk CRUD + pairing + activeCount           |
| `use-templates.ts`    | Template & element CRUD + asset upload       |
| `use-subscription.ts` | Plans, invoices, payment status              |
| `use-wallet.ts`       | Balance, mutations, withdrawals              |
| `use-transactions.ts` | Transaction history (paginated + filters)    |
| `use-countdown.ts`    | QRIS payment expiry countdown (mm:ss)        |
| `use-mobile.ts`       | Responsive breakpoint detection (768px = md) |

Semua data hooks menggunakan `src/lib/api.ts`. `apiFetch` return `res.json()` mentah (TIDAK auto-unwrap) — hooks handle unwrap `{ data: T }` sendiri.

### Key Files

| File                                  | Peran                                                                |
| ------------------------------------- | -------------------------------------------------------------------- |
| `src/lib/api.ts`                      | API client — fetch wrapper, in-memory token, refresh, `ApiError`     |
| `src/lib/auth-api.ts`                 | Auth-specific calls: login, logout, getSubscription                  |
| `src/lib/types.ts`                    | TypeScript types yang mirror backend contract (camelCase)            |
| `src/lib/constants.ts`               | Status enums dan display labels (Indonesian)                         |
| `src/lib/format.ts`                   | Currency (Rupiah id-ID) dan date formatting                          |
| `src/lib/template-variables.ts`       | Registry `{{variable}}` placeholders + resolver untuk text elements  |
| `src/lib/utils.ts`                    | `cn()` helper (clsx + tailwind-merge)                                |
| `src/components/auth-provider.tsx`    | Auth context, route protection, subscription state                   |
| `src/components/query-provider.tsx`   | TanStack Query provider + DevTools                                   |

## Konvensi

### Umum

- Path alias: `@/*` → `./src/*`
- Bahasa UI: **Bahasa Indonesia** — semua label, pesan error, placeholder
- Currency: Rupiah format id-ID tanpa desimal (`Rp 25.000`)
- Date: `d MMM yyyy` id-ID, bulan singkat (`23 Feb 2026`). Datetime: `d MMM, HH.mm` tanpa tahun (`23 Feb, 14.30`)
- shadcn/ui components di `src/components/ui/` — tambah via `npx shadcn@latest add <component>`
- ESLint: unused vars harus prefix `_`
- `cn()` helper (clsx + tailwind-merge) untuk conditional classNames

### API & Types

- Types di `src/lib/types.ts` HARUS match dengan response shapes di `../memoir-docs/docs/api/`
- Monetary values: number (integer Rupiah) — JANGAN pakai floating point
- IDs: string (UUID v4)
- Timestamps: string (ISO 8601)
- Nullable fields: `T | null`
- Paginated response: `{ data: T[], meta: { page, limit, total } }`

### Template Editor (Konva)

- Konva HARUS dynamic import dengan `ssr: false` — Konva tidak support SSR
- Element creation: **sequential** (bukan parallel) — menghindari 409 conflict pada server-side sequence constraint
- Setiap `photo_slot` WAJIB punya `captureOrder` (integer, unik per template)
- Template WAJIB minimal 1 `photo_slot` — guard delete yang terakhir
- Max elemen per template: belum di-enforce di kode (tidak ada validasi/guard)

### State Management

- Server state: **TanStack Query** — queries + mutations + cache invalidation
- Form state: **react-hook-form** + Zod resolver
- Auth state: React Context (`auth-provider.tsx`)
- UI state: `useState` lokal (modals, filters, expanded rows)
- JANGAN pakai global state (Redux, Zustand, dll) — TanStack Query sudah cukup
- **Optimistic updates** dengan rollback: digunakan di kiosk update dan template toggle/delete — update cache langsung, rollback `onError`
- **Cache seeding**: template list response embed elements → di-seed ke per-template element query cache (avoid N+1 fetch saat navigate ke editor)

### Error Handling

- `ApiError` class di `src/lib/api.ts` — cek `error.code` untuk behavior spesifik
- 401 di-handle otomatis oleh `apiFetch` (refresh + retry + redirect)
- Form validation errors: tampilkan per-field via react-hook-form
- Toast (sonner) untuk feedback success/error pada mutations
- Tampilkan pesan Indonesian yang user-friendly, bukan error code mentah

### Template Variables

`src/lib/template-variables.ts` — registry `{{variable}}` placeholders untuk text elements, di-resolve saat render di kiosk/server.

| Category   | Variables                                                         |
| ---------- | ----------------------------------------------------------------- |
| Waktu      | `date`, `time`, `datetime`                                        |
| Transaksi  | `order_id`, `total_amount`, `payment_method`, `print_qty`         |
| Kiosk      | `kiosk_name`, `template_name`, `owner_name`, `session_number`     |
| Pelanggan  | `customer_name`, `customer_phone`, `customer_email`               |

- `resolveVariables(content, context)` — replace `{{key}}` dengan value
- `DUMMY_RENDER_CONTEXT` — contoh values untuk preview di editor
- `hasVariables(content)` / `extractVariableKeys(content)` — utility checks

## Business Rules (Frontend)

Aturan ini di-enforce di backend, tapi frontend juga harus handle secara UX:

- **Subscription banner** — dashboard tampilkan banner dinamis berdasarkan status:
  - `ACTIVE` (green) — info periode aktif
  - `GRACE_PERIOD` (amber) — peringatan sisa hari grace period
  - `PENDING_PAYMENT` (blue) — menunggu pembayaran
  - `EXPIRED` (red) — lock + tombol disabled di halaman operasional
  - `CANCELLED` (gray) — subscription dibatalkan
- **Grace period = ACTIVE** — `GRACE_PERIOD` diperlakukan sama dengan `ACTIVE` untuk akses dashboard (`hasActiveSubscription()`)
- **Pending upgrade** — AuthContext track `pendingUpgrade` (PENDING_PAYMENT subscription saat upgrade in-flight), ditampilkan di UI subscription
- **QRIS payment flow** — onboarding/subscription: tampilkan QR code (`qrcode.react`), countdown timer (`use-countdown.ts`), auto-check payment status via polling
- **Max kiosks reached** → disable tombol "Tambah Kiosk", cek `activeCount` dari `useKiosks()` vs `maxKiosks` dari dashboard/subscription
- **Single PENDING withdrawal** → `hasPending` flag di `useWithdrawals()`, disable tombol withdrawal, tampilkan info
- **Template delete guard** → 409 CONFLICT jika template punya transaksi, sarankan nonaktifkan
- **Photo slot minimum** → tolak delete photo_slot terakhir
- **Unique captureOrder** → validasi di form sebelum submit
- **Immutable price snapshot** → transaksi tampilkan "harga saat transaksi", bukan harga kiosk saat ini

## Referensi Dokumentasi

Semua dokumentasi platform ada di `../memoir-docs/`:

- PRD Owner Dashboard: `../memoir-docs/prd-memoir/PRD-02-dashboard-owner.md`
- API endpoints yang dipakai: `../memoir-docs/docs/api/owner.md`, `owner-finance.md`, `owner-subscription.md`, `auth.md`
- Response shapes & error codes: `../memoir-docs/docs/api/`
- Database schema: `../memoir-docs/docs/schema/memoir_schema.dbml`

Saat integrasi atau debugging API, selalu cross-check dengan docs di atas.
