# PRD-01: Backend API — memoir. Platform

> **Versi:** 1.6
> **Tanggal:** 7 Maret 2026
> **Status:** In Progress — EPIC-01 ~ EPIC-07 Implemented
> **Audiens:** Internal dev team & AI coding agents
> **Parent:** [PRD-00-master.md](./PRD-00-master.md) (Platform Overview)

---

## 1. Executive Summary

### 1.1 Problem Statement

Platform memoir. membutuhkan backend terpusat yang melayani 4 client surface (Owner Dashboard Web, Super Admin Dashboard Web, Desktop Kiosk Runner, Mobile Kiosk Runner) dengan kebutuhan yang berbeda: multi-tenant data isolation (per owner), operasi finansial atomik (wallet + withdrawal), integrasi payment gateway, dan autentikasi yang meng-cover web user (JWT + refresh token) maupun kiosk device (permanent device_token).

### 1.2 Proposed Solution

Backend API berbasis **Node.js + Fastify 5.x** dengan arsitektur **Clean Architecture 4-layer** yang memisahkan business logic dari framework. Menggunakan **Drizzle ORM** untuk type-safe database access ke **Supabase PostgreSQL**, dan **Zod** untuk request/response validation. Dokumentasi API disusun dalam `docs/api/` (per endpoint group) dan Postman collection di `docs/postman/` sebagai referensi untuk semua client.

### 1.3 Success Criteria

| #   | KPI                           | Target                                     | Cara Ukur                     |
| --- | ----------------------------- | ------------------------------------------ | ----------------------------- |
| 1   | **API response time**         | p99 < 300ms (endpoint non-upload)          | APM / load test               |
| 2   | **Kiosk endpoint latency**    | < 500ms per endpoint                       | Monitoring                    |
| 3   | **Zero wallet drift**         | 0 duplikat `wallet_mutation` per transaksi | Idempotency integration test  |
| 4   | **Price validation accuracy** | 100% setiap PriceMismatch terdeteksi       | Unit test + integration test  |
| 5   | **Auth security**             | 0 data leakage lintas tenant               | Authorization middleware test |
| 6   | **Uptime**                    | ≥ 99.5% monthly                            | Uptime monitoring             |

---

## 2. Scope & Features

### 2.1 User Personas

> Lihat **[PRD-00 §2 — Target Users & Personas](./PRD-00-master.md)** untuk deskripsi lengkap.
>
> **Mapping ke endpoint group:** P1 (Admin) → `/admin/*` · P2 (Owner) → `/owner/*` · P3 (Kiosk) → `/kiosk/*` · P4 (Customer) → tidak mengakses API langsung.

### 2.2 Epic & Feature Index

| Epic                            | Feature                             | ID         | Priority | Status  |
| ------------------------------- | ----------------------------------- | ---------- | -------- | ------- |
| **EPIC-01: Auth & Pairing**     | User Login (email + password)       | FEAT-01.1  | P0       | ✅ Done |
|                                 | Refresh Token                       | FEAT-01.1b | P0       | ✅ Done |
|                                 | Logout (Revoke Token)               | FEAT-01.1c | P0       | ✅ Done |
|                                 | Kiosk Device Pairing (6-digit code) | FEAT-01.2  | P0       | ✅ Done |
| **EPIC-02: Kiosk Runtime**      | Kiosk Config & Subscription Status  | FEAT-02.1  | P0       | ✅ Done |
|                                 | Template Sync                       | FEAT-02.2  | P0       | ✅ Done |
|                                 | Create Transaction                  | FEAT-02.3  | P0       | ✅ Done |
|                                 | Confirm Cash / QRIS Payment         | FEAT-02.4  | P0       | ✅ Done |
|                                 | Check Payment Gateway Status        | FEAT-02.5  | P0       | ✅ Done |
|                                 | Upload Digital Copy Session         | FEAT-02.6  | P0       | ✅ Done |
| **EPIC-03: Owner Management**   | Kiosk CRUD & Pairing Code Gen       | FEAT-03.1  | P0       | ✅ Done |
|                                 | Template CRUD                       | FEAT-03.2  | P0       | ✅ Done |
|                                 | Template Element CRUD               | FEAT-03.3  | P0       | ✅ Done |
|                                 | Asset Upload                        | FEAT-03.4  | P0       | ✅ Done |
| **EPIC-04: Owner Finance**      | Wallet Balance & Mutation History   | FEAT-04.1  | P0       | ✅ Done |
|                                 | Withdrawal Request                  | FEAT-04.2  | P0       | ✅ Done |
|                                 | Transaction History                 | FEAT-04.3  | P0       | ✅ Done |
| **EPIC-05: Owner Subscription** | Select / Upgrade Plan               | FEAT-05.1  | P0       | ✅ Done |
|                                 | Invoice & Payment Check             | FEAT-05.2  | P0       | ✅ Done |
| **EPIC-06: Admin Platform**     | Owner Account CRUD                  | FEAT-06.1  | P0       | ✅ Done |
|                                 | Subscription Plan CRUD              | FEAT-06.2  | P0       | ✅ Done |
|                                 | Platform Config Management          | FEAT-06.3  | P0       | ✅ Done |
|                                 | Withdrawal Approve / Reject         | FEAT-06.4  | P0       | ✅ Done |
|                                 | Cross-owner Transaction Monitoring  | FEAT-06.5  | P0       | ✅ Done |
| **EPIC-07: Payment Gateway**    | Xendit QRIS Dynamic (v3 API)        | FEAT-07.1  | P0       | ✅ Done |
|                                 | Webhook Receiver (payment.capture)  | FEAT-07.2  | P0       | ✅ Done |
|                                 | Settlement Services (shared logic)  | FEAT-07.3  | P0       | ✅ Done |

### 2.3 Non-Goals

> Daftar lengkap non-goals platform: **[PRD-00 §10.2 — Di Luar Scope MVP](./PRD-00-master.md)**.
>
> Berikut non-goals tambahan yang **spesifik backend**:

| #     | Non-Goal                                   | Alasan                                           |
| ----- | ------------------------------------------ | ------------------------------------------------ |
| NG-05 | OAuth / SSO                                | MVP: email+password only                         |
| NG-06 | Auto-renewal subscription                  | MVP: manual renewal; settlement via webhook      |
| NG-08 | Image processing / compression server-side | Composite dilakukan di client (Electron/Flutter) |
| NG-09 | Scheduled jobs / cron                      | Semua status check dilakukan lazy/on-demand      |

---

## 3. Technical Specifications

### 3.1 Architecture Overview — Clean Architecture 4-Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                      Presentation Layer                         │
│  Routes (Fastify plugins) → Zod Schemas → Controllers           │
│  Auth hooks (verifyJwt / verifyDeviceToken)                     │
│  Error handler plugin                                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ calls
┌───────────────────────────▼─────────────────────────────────────┐
│                      Application Layer                          │
│  Use Cases (business orchestration)                             │
│  Depend on ports (interfaces) — NOT implementations             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ depends on
┌───────────────────────────▼─────────────────────────────────────┐
│                        Domain Layer                             │
│  Entities (13) + Domain Services (PriceCalculator,              │
│  SubscriptionChecker) + Domain Errors (AppError hierarchy)      │
│  PURE — no framework dependency                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │ implemented by
┌───────────────────────────▼─────────────────────────────────────┐
│                    Infrastructure Layer                         │
│  Repositories (Drizzle ORM) + StorageService (Supabase)         │
│  PaymentGateway (Xendit) + HashService (argon2) + TokenService  │
│  (jose) + UnitOfWork (Drizzle transaction)                      │
└─────────────────────────────────────────────────────────────────┘
```

**Dependency Rule:** Inner layers tidak boleh depend pada outer layers. Use cases depend pada interfaces (ports), bukan pada concrete implementations.

### 3.2 Tech Stack

| Layer                | Technology                  | Versi  | Catatan                                                  |
| -------------------- | --------------------------- | ------ | -------------------------------------------------------- |
| Runtime              | Node.js                     | 22 LTS | —                                                        |
| Framework            | **Fastify**                 | 5.x    | Low overhead, plugin architecture, encapsulated contexts |
| Language             | TypeScript                  | 5.x    | Strict mode                                              |
| ORM                  | **Drizzle ORM**             | Latest | Type-safe, lightweight, zero overhead                    |
| Validation           | **Zod**                     | 3.x    | Request/response validation                              |
| Type Provider        | `fastify-type-provider-zod` | —      | Zod ↔ Fastify schema integration                         |
| API Docs             | Markdown file terpisah      | —      | Tidak menggunakan OpenAPI/Swagger untuk sementara        |
| Database             | PostgreSQL                  | 15+    | Via Supabase managed                                     |
| Auth — JWT           | `jose`                      | —      | HS256, stateless access token                            |
| Auth — Refresh Token | Custom (hashed, DB-stored)  | —      | Random 64-char hex, SHA-256 hashed                       |
| Auth — Password      | `argon2`                    | —      | Constant-time verification                               |
| Storage              | `@supabase/supabase-js`     | —      | Service role key (server-only)                           |
| Payment Gateway      | Xendit SDK / REST           | —      | Via `IPaymentGateway` port                               |
| Cookie               | `@fastify/cookie`           | —      | HttpOnly cookie untuk refresh token                      |
| Rate Limiting        | `@fastify/rate-limit`       | —      | Auth + pairing endpoints                                 |
| CORS                 | `@fastify/cors`             | —      | Whitelist origins, `credentials: true`                   |
| Security Headers     | `@fastify/helmet`           | —      | Default security headers                                 |
| Multipart            | `@fastify/multipart`        | —      | File upload (asset, session)                             |
| Linting              | Biome                       | —      | Lint + format                                            |
| Testing              | Vitest + Supertest          | —      | Unit + integration                                       |
| Package Manager      | pnpm                        | —      | Konsisten lintas repo                                    |

---

## 4. Data Model

> Database schema (12 tabel), ER diagram, daftar enums, dan model polymorphic template elements: **[PRD-00 §7 — Data Model Overview](./PRD-00-master.md)**.

### 4.1 Domain Services (Pure Logic)

#### PriceCalculator

```
Resolusi harga (priority):
  1. template.override_price_* (jika tidak null)
  2. kiosk.price_* (fallback)

Kalkulasi total:
  extra_qty = max(0, print_qty - 1)
  total = base_price
        + (extra_qty × extra_print_price)
        + (has_digital_copy ? digital_copy_price : 0)
```

#### SubscriptionChecker

```
if (subscription == null) → EXPIRED (canOperate: false)
if (subscription.status == CANCELLED) → CANCELLED (canOperate: false, gracePeriodEndsAt computed)
if (subscription.status == PENDING_PAYMENT) → PENDING_PAYMENT (canOperate: false, gracePeriodEndsAt: null)
if (now <= period_end) → ACTIVE (canOperate: true)
if (now <= period_end + grace_period_days) → GRACE_PERIOD (canOperate: true)
else → EXPIRED (canOperate: false)
```

> **Catatan:** `CANCELLED` dicek sebelum period check, sehingga kiosk yang ownernya membatalkan subscription langsung mendapat status CANCELLED terlepas dari sisa periode.

### 4.2 Domain Error Hierarchy

| Error Class                    | HTTP | Error Code                  | Deskripsi                   |
| ------------------------------ | ---- | --------------------------- | --------------------------- |
| `AppError`                     | —    | —                           | Base class                  |
| `ValidationError`              | 400  | `VALIDATION_ERROR`          | Input tidak valid           |
| `PriceMismatchError`           | 400  | `PRICE_MISMATCH`            | Harga client ≠ server       |
| `InsufficientBalanceError`     | 400  | `INSUFFICIENT_BALANCE`      | Saldo tidak cukup           |
| `BelowMinimumError`            | 400  | `BELOW_MINIMUM`             | Di bawah minimum withdrawal |
| `UnauthorizedError`            | 401  | `UNAUTHORIZED`              | Token invalid/missing       |
| `ForbiddenError`               | 403  | `FORBIDDEN`                 | Role/ownership mismatch     |
| `MaxKiosksReachedError`        | 403  | `MAX_KIOSKS_REACHED`        | Limit kiosk per plan        |
| `NotFoundError`                | 404  | `NOT_FOUND`                 | Resource tidak ditemukan    |
| `ConflictError`                | 409  | `CONFLICT`                  | Duplicate/has references    |
| `PendingWithdrawalExistsError` | 409  | `PENDING_WITHDRAWAL_EXISTS` | Max 1 PENDING withdrawal    |
| `UnprocessableEntityError`     | 422  | `UNPROCESSABLE_ENTITY`      | Invalid state transition    |
| `RateLimitedError`             | 429  | `RATE_LIMITED`              | Too many requests           |
| `InternalServerError`          | 500  | `INTERNAL_SERVER_ERROR`     | Unexpected error            |

---

## 5. API Design

### 5.1 Conventions

- **Base prefix:** `/api/v1`
- **Success response:** `{ data: ... }`
- **Paginated response:** `{ data: [...], meta: { page, limit, total } }`
- **Error response:** `{ error: "ERROR_CODE", message: "..." }`
- **Validation error:** `{ error: "VALIDATION_ERROR", details: { fieldErrors: { ... } } }`
- **Field naming:** camelCase
- **Monetary values:** `bigint` (IDR)
- **Timestamps:** ISO 8601
- **IDs:** UUID v4

### 5.2 Endpoint Summary

#### Auth Endpoints (no auth required)

| Method | Path            | Deskripsi                                     | Rate Limit |
| ------ | --------------- | --------------------------------------------- | ---------- |
| `POST` | `/auth/login`   | Login → access token + refresh token (cookie) | 5/min/IP   |
| `POST` | `/auth/refresh` | Refresh access token (dari cookie)            | 10/min/IP  |
| `POST` | `/auth/logout`  | Revoke refresh token + clear cookie           | —          |

> **Rate limit** dikonfigurasi per-route via `@fastify/rate-limit` (bukan global).

#### Kiosk Endpoints (`Authorization: Bearer {device_token}`)

| Method | Path                                    | Deskripsi                                          |
| ------ | --------------------------------------- | -------------------------------------------------- |
| `POST` | `/kiosk/pair`                           | Tukar pairing code → device_token (no auth)        |
| `GET`  | `/kiosk/me`                             | Config kiosk + subscription status                 |
| `GET`  | `/kiosk/templates`                      | Semua template aktif + elements (full dump)        |
| `POST` | `/kiosk/transactions`                   | Buat transaksi baru (server-side price validation) |
| `POST` | `/kiosk/transactions/:id/confirm-cash`  | Konfirmasi CASH/QRIS (idempotent, atomic)          |
| `POST` | `/kiosk/transactions/:id/check-payment` | Cek status PG (idempotent)                         |
| `POST` | `/kiosk/sessions`                       | Upload digital copy (multipart)                    |

#### Owner Endpoints (`Authorization: Bearer {jwt}`, role: `studio_owner`)

| Method   | Path                                             | Deskripsi                                 |
| -------- | ------------------------------------------------ | ----------------------------------------- |
| `GET`    | `/owner/kiosks`                                  | List kiosk milik owner                    |
| `POST`   | `/owner/kiosks`                                  | Buat kiosk (enforce max_kiosks)           |
| `PATCH`  | `/owner/kiosks/:id`                              | Edit kiosk (nama, harga, status)          |
| `POST`   | `/owner/kiosks/:id/generate-pairing`             | Generate pairing code baru                |
| `GET`    | `/owner/templates`                               | List template milik owner                 |
| `GET`    | `/owner/templates/:id`                           | Detail template + elements                |
| `POST`   | `/owner/templates`                               | Buat template baru                        |
| `PATCH`  | `/owner/templates/:id`                           | Edit template                             |
| `DELETE` | `/owner/templates/:id`                           | Hapus template (guard: no transactions)   |
| `GET`    | `/owner/templates/:id/elements`                  | List elements                             |
| `POST`   | `/owner/templates/:id/elements`                  | Tambah element                            |
| `PATCH`  | `/owner/templates/:id/elements/:elementId`       | Edit element                              |
| `DELETE` | `/owner/templates/:id/elements/:elementId`       | Hapus element (guard: min 1 photo_slot)   |
| `POST`   | `/owner/assets/upload`                           | Upload asset (background/overlay/element) |
| `GET`    | `/owner/transactions`                            | List transaksi (filtered, paginated)      |
| `GET`    | `/owner/wallet`                                  | Saldo + mutation history (paginated)      |
| `GET`    | `/owner/withdrawals`                             | List withdrawal (paginated)               |
| `POST`   | `/owner/withdrawals`                             | Request withdrawal baru                   |
| `GET`    | `/owner/subscription`                            | Subscription aktif + status               |
| `GET`    | `/owner/subscription/plans`                      | List active subscription plans            |
| `POST`   | `/owner/subscription`                            | Subscribe / upgrade plan                  |
| `GET`    | `/owner/subscription/invoices`                   | Invoice history                           |
| `POST`   | `/owner/subscription/invoices/:id/check-payment` | Cek status PG invoice                     |

#### Admin Endpoints (`Authorization: Bearer {jwt}`, role: `platform_admin`)

| Method  | Path                             | Deskripsi                       |
| ------- | -------------------------------- | ------------------------------- |
| `GET`   | `/admin/owners`                  | List owner (filterable)         |
| `POST`  | `/admin/owners`                  | Buat owner baru (temp password) |
| `PATCH` | `/admin/owners/:id`              | Edit / soft-delete owner        |
| `GET`   | `/admin/subscription-plans`      | List semua plans                |
| `POST`  | `/admin/subscription-plans`      | Buat plan baru                  |
| `PATCH` | `/admin/subscription-plans/:id`  | Edit plan                       |
| `GET`   | `/admin/platform-config`         | List all config                 |
| `PATCH` | `/admin/platform-config/:id`     | Update config value             |
| `GET`   | `/admin/withdrawals`             | List withdrawal (FIFO)          |
| `POST`  | `/admin/withdrawals/:id/approve` | Approve (atomic debit wallet)   |
| `POST`  | `/admin/withdrawals/:id/reject`  | Reject + catatan                |
| `GET`   | `/admin/transactions`            | Semua transaksi lintas owner    |

#### Health

| Method | Path      | Deskripsi                         |
| ------ | --------- | --------------------------------- |
| `GET`  | `/health` | Health check → `{ status: "ok" }` |

> Detail request/response shapes per endpoint tersedia di file markdown terpisah di `docs/api/`.

---

## 6. Authentication & Authorization

### 6.1 Web Authentication (Admin & Owner)

```
Login Flow:
POST /auth/login { email, password }
  → Verify argon2 hash
  → Check deleted_at (soft-delete)
  → Sign access token (JWT, 15 min) → { id, role }
  → Generate refresh token (random 64-char hex)
  → Hash refresh token (SHA-256) → store in DB
  → Return { accessToken } + Set-Cookie: refresh_token (HttpOnly)

Refresh Flow:
POST /auth/refresh (cookie: refresh_token)
  → Hash incoming token → find in DB
  → Validate: exists, not revoked, not expired, user not deleted
  → Sign new access token
  → Return { accessToken }

Logout Flow:
POST /auth/logout (cookie: refresh_token)
  → Hash incoming token → revoke in DB
  → Clear cookie → 204 No Content
```

### 6.2 Kiosk Authentication

```
Pairing Flow:
POST /kiosk/pair { pairingCode: "123456" }
  → Find kiosk by pairing_code
  → Check pairing_code_expires_at not expired
  → Sign device_token (JWT, ~10 tahun) → { kioskId, ownerId }
  → Update kiosk: set device_token, clear pairing_code, set paired_at
  → Return { deviceToken, kioskConfig }
```

### 6.3 Refresh Token Details

| Aspek            | Detail                                                              |
| ---------------- | ------------------------------------------------------------------- |
| Format           | Random 64-character hex string                                      |
| Storage (server) | SHA-256 hash di tabel `refresh_tokens`                              |
| Storage (client) | HttpOnly cookie (`refresh_token`)                                   |
| Cookie config    | `HttpOnly`, `Secure` (prod), `SameSite=Strict`, `Path=/api/v1/auth` |
| Expiry           | 7 hari (configurable via `REFRESH_TOKEN_EXPIRES_IN`)                |
| Rotation         | Tidak ada rotation (no race condition risk)                         |
| Revocation       | On logout atau soft-delete user                                     |
| Max per user     | Tidak dibatasi (bisa login dari multiple devices)                   |

### 6.4 Authorization Middleware

| Hook                | Dekode                   | Attaches                             | Used by                               |
| ------------------- | ------------------------ | ------------------------------------ | ------------------------------------- |
| `verifyJwt`         | Access token dari header | `request.userId`, `request.userRole` | `/owner/*`, `/admin/*`                |
| `verifyDeviceToken` | Device token dari header | `request.kioskId`, `request.ownerId` | `/kiosk/*`                            |
| `requireRole(role)` | Cek `request.userRole`   | —                                    | `/admin/*` (require `platform_admin`) |

**Ownership guard:** Semua query owner di-scope by `owner_id` dari JWT. Kiosk queries di-scope by `ownerId` dari device token. Enforced di repository layer.

---

## 7. Business Rules & Edge Cases

### 7.1 Transaksi Booth

| Rule                              | Detail                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Price server-side validation**  | Backend WAJIB re-validate harga client vs server sebelum buat transaksi                                                                                        |
| **Price snapshot immutable**      | `applied_*_price` dan `total_amount` TIDAK pernah diupdate setelah insert                                                                                      |
| **PG call before DB insert**      | Untuk metode `PG`, payment gateway dipanggil **sebelum** transaksi disimpan ke DB. Jika PG gagal, tidak ada orphaned PENDING record di database                |
| **PG timeout 5 detik**            | Semua call ke Xendit API menggunakan `AbortController` timeout 5 detik. Jika timeout → error di-throw (CreateTransaction) atau return PENDING (CheckPgPayment) |
| **CheckPg error → PENDING**       | Jika `checkStatus()` PG throw error/timeout, `CheckPgPaymentUseCase` return `{ status: 'PENDING' }` tanpa mengubah state transaksi                             |
| **Idempotent confirm**            | Jika sudah PAID → return 200 tanpa side effect (no double mutation)                                                                                            |
| **Atomic payment confirmation**   | set PAID + insert CREDIT mutation + update wallet_balance dalam 1 DB transaction                                                                               |
| **Owner ID denormalized**         | `transactions.owner_id` diambil dari `kiosk.owner_id` (server), bukan dari client                                                                              |
| **Abandoned PG transactions**     | PENDING selamanya jika tidak pernah di-check — acceptable untuk MVP                                                                                            |
| **Template disabled mid-session** | Transaksi yang sudah dibuat tetap valid, tidak ada rollback                                                                                                    |

### 7.2 Subscription

| Rule                    | Detail                                                                                                                                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PENDING_PAYMENT**     | Subscription baru dibuat dengan status `PENDING_PAYMENT`, diaktifkan ke `ACTIVE` setelah PG settlement via webhook Xendit. Subscription ACTIVE lama **tidak disentuh** sampai pembayaran selesai. Check-payment hanya membaca status dari DB.                                                |
| **Lazy status**         | Dihitung on-the-fly: `now > period_end + grace_days` → EXPIRED. Tidak ada cron                                                                                                                                                                  |
| **Grace period**        | Dari `platform_config`; kiosk masih operasi selama grace. Hanya tampil saat status `GRACE_PERIOD`                                                                                                                                               |
| **One active**          | Satu owner maksimal 1 subscription ACTIVE (enforced app-layer)                                                                                                                                                                                  |
| **Multiple pending allowed** | Owner diperbolehkan membuat subscription baru meskipun sudah ada PENDING_PAYMENT. Di-log sebagai warning, tidak di-reject.                                                                                                                           |
| **Safe upgrade**        | Upgrade/change plan selalu buat **subscription row baru** (PENDING_PAYMENT). Subscription lama tetap ACTIVE. Saat settlement: subscription baru ACTIVE, subscription lama CANCELLED. Saat expire: subscription baru EXPIRED, lama tetap ACTIVE. |
| **Duplicate guard**     | Re-subscribe ke plan+period yang sama saat ACTIVE → 409 Conflict                                                                                                                                                                                |
| **Max kiosks**          | Enforce saat create kiosk: count aktif vs `plan.max_kiosks` → 403                                                                                                                                                                               |
| **Price snapshot**      | `subscriptions.price_paid` = snapshot saat subscribe; perubahan harga plan tidak retroaktif                                                                                                                                                     |
| **No cron**             | Semua status check on-demand/lazy                                                                                                                                                                                                               |
| **Atomic subscribe**    | ManageSubscriptionUseCase di-wrap dalam UnitOfWork transaction. PG call di luar transaction (safe: PENDING_PAYMENT)                                                                                                                             |
| **Payment redirect**    | `XenditPaymentService` set `success_redirect_url` ke `${FRONTEND_URL}/onboarding?invoice_id=${invoice.id}` — Xendit redirect user kembali ke frontend setelah bayar. `FRONTEND_URL` env optional; tanpa itu user tetap di halaman sukses Xendit |
| **Atomic settlement**   | CheckSubscriptionPaymentUseCase: settlement (invoice PAID + subscription baru ACTIVE + subscription lama CANCELLED) dalam 1 transaction                                                                                                         |
| **Atomic expire**       | CheckSubscriptionPaymentUseCase: expire (invoice FAILED + subscription baru EXPIRED, subscription lama tetap ACTIVE) dalam 1 transaction                                                                                                        |
| **PG error resilience** | Check-payment hanya membaca DB (tidak call Xendit). Settlement errors ditangani via webhook retry.                                                                                                                                                            |
| **GET subscription**    | Memprioritaskan subscription ACTIVE via `findActiveByUserId`. Response menyertakan field `pendingUpgrade` jika ada PENDING_PAYMENT                                                                                                              |

### 7.3 Withdrawal

| Rule                          | Detail                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Atomic approve**            | `SELECT FOR UPDATE` → validate balance → debit wallet → update status, semua dalam 1 DB transaction                                                     |
| **Atomic request**            | Request withdrawal juga dalam DB transaction: `findByIdForUpdate` user → cek pending → cek balance → create. Mencegah race condition concurrent request |
| **Re-check balance**          | Admin approve → backend re-cek saldo terbaru sebelum debit                                                                                              |
| **Single pending**            | Max 1 withdrawal PENDING per owner                                                                                                                      |
| **Minimum amount**            | Dari `platform_config` key `minimum_withdrawal_amount`. Jika config belum diisi → 500 error                                                             |
| **No wallet debit on create** | Wallet hanya berubah saat admin APPROVE, bukan saat owner request                                                                                       |
| **Manual bank transfer**      | Transfer dana ke rekening dilakukan di luar sistem                                                                                                      |
| **Bank field limits**         | `bankName` max 100, `bankAccountNumber` max 50, `bankAccountName` max 200 chars, auto-trimmed                                                           |

### 7.4 Template & Sync

| Rule                             | Detail                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Min photo_slot**               | Template wajib minimal 1 elemen `photo_slot` — backend tolak delete jika satu-satunya                                    |
| **Unique sequence**              | `sequence` tidak boleh duplikat per template                                                                             |
| **`captureOrder` di photo_slot** | JSONB `properties` photo_slot wajib punya `captureOrder` (integer); tidak boleh duplikat antar photo_slot dalam template |
| **`updated_at` touch**           | Setiap mutasi template/element → update `updated_at` template (sync signal untuk kiosk)                                  |
| **Delete protection**            | Tolak delete template jika ada transaction yang references                                                               |
| **Cascade delete**               | Delete template → cascade hapus semua `template_elements`                                                                |
| **Asset ownership guard**        | `backgroundUrl` / `overlayUrl` wajib milik owner → validasi via `IStorageService.isOwnedByUser()`                        |

### 7.5 Kiosk & Pairing

| Rule                       | Detail                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Pairing code expiry**    | Code valid untuk durasi terbatas; expired → 404                                                                       |
| **Inactive kiosk pairing** | `PairKioskUseCase` menolak pairing jika `kiosk.isActive == false` → `UnprocessableEntityError('Kiosk is not active')` |
| **Reset pairing**          | Owner generate pairing code → `device_token` lama di-null → Electron mendapat 401                                     |
| **Kiosk non-aktif**        | `/kiosk/me` return `isActive: false` → kiosk lock screen                                                              |

### 7.6 Registration

| Rule                  | Detail                                                             |
| --------------------- | ------------------------------------------------------------------ |
| **Admin-only create** | Owner tidak bisa self-register                                     |
| **Temp password**     | Dikomunikasikan manual (email/WhatsApp) — tidak ada email otomatis |

---

## 8. Application Layer — Use Cases

### 8.1 Auth Use Cases

| Use Case              | Dependencies                                                      | Deskripsi                           |
| --------------------- | ----------------------------------------------------------------- | ----------------------------------- |
| `LoginUseCase`        | `IUserRepo`, `IHashService`, `ITokenService`, `IRefreshTokenRepo` | Login → JWT + refresh token         |
| `RefreshTokenUseCase` | `IRefreshTokenRepo`, `IUserRepo`, `ITokenService`                 | Validate refresh → new access token |
| `LogoutUseCase`       | `IRefreshTokenRepo`, `ITokenService`                              | Revoke refresh token                |
| `PairKioskUseCase`    | `IKioskRepo`, `ITokenService`                                     | Pairing code → device_token         |

### 8.2 Kiosk Use Cases

| Use Case                    | Dependencies                                                                          | Deskripsi                              |
| --------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------- |
| `GetKioskConfigUseCase`     | `IKioskRepo`, `ISubscriptionRepo`, `IPlatformConfigRepo`, SubscriptionChecker         | Config + lazy subscription status      |
| `SyncTemplatesUseCase`      | `ITemplateRepo`                                                                       | Semua template aktif + elements        |
| `CreateTransactionUseCase`  | `IKioskRepo`, `ITemplateRepo`, `ITransactionRepo`, `IPaymentGateway`, PriceCalculator | Buat transaksi + PG call jika perlu    |
| `ConfirmCashPaymentUseCase` | `ITransactionRepo`, `IWalletRepo`, `IUnitOfWork`                                      | Idempotent: set PAID + CREDIT (atomic) |
| `CheckPgPaymentUseCase`     | `ITransactionRepo`, `IWalletRepo`, `IPaymentGateway`, `IUnitOfWork`                   | Poll PG + atomic update jika PAID      |
| `UploadSessionUseCase`      | `ITransactionRepo`, `ISessionRepo`, `IStorageService`                                 | Upload digital copy                    |

### 8.3 Owner Use Cases

| Use Case                          | Dependencies                                           | Deskripsi                                                                |
| --------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `ManageKioskUseCase`              | `IKioskRepo`, `ISubscriptionRepo`                      | CRUD + enforce max_kiosks                                                |
| `ManageTemplateUseCase`           | `ITemplateRepo`, `ITransactionRepo`, `IStorageService` | CRUD + asset ownership validation                                        |
| `ManageTemplateElementsUseCase`   | `ITemplateRepo`                                        | CRUD elements + invariant checks                                         |
| `UploadAssetUseCase`              | `IStorageService`                                      | Upload ke Supabase Storage                                               |
| `GetTransactionsUseCase`          | `ITransactionRepo`                                     | Paginated + filtered list                                                |
| `GetWalletUseCase`                | `IUserRepo`, `IWalletRepo`                             | Balance + mutation history                                               |
| `RequestWithdrawalUseCase`        | `IUnitOfWork`, `IPlatformConfigRepo`                   | Atomic: validate → create PENDING                                        |
| `ListWithdrawalsUseCase`          | `IWithdrawalRepo`                                      | Paginated owner withdrawals                                              |
| `ManageSubscriptionUseCase`       | `IUnitOfWork`, `IPaymentGateway`                       | Subscribe/upgrade + PG call (PENDING_PAYMENT → ACTIVE via check-payment) |
| `CheckSubscriptionPaymentUseCase` | `IUnitOfWork`, `IPaymentGateway`                       | Atomic: poll PG + activate/expire subscription                           |

### 8.4 Admin Use Cases

| Use Case                     | Dependencies                | Deskripsi                                 |
| ---------------------------- | --------------------------- | ----------------------------------------- |
| `ManageOwnersUseCase`        | `IUserRepo`, `IHashService` | CRUD owner (admin creates, hash password) |
| `ManagePlansUseCase`         | `ISubscriptionRepo`         | CRUD subscription plans                   |
| `ManageConfigUseCase`        | `IPlatformConfigRepo`       | Read/update key-value config              |
| `ApproveWithdrawalUseCase`   | `IUnitOfWork`               | Atomic: validate → debit → update status  |
| `RejectWithdrawalUseCase`    | `IWithdrawalRepo`           | Set REJECTED + note                       |
| `ListAllWithdrawalsUseCase`  | `IWithdrawalRepo`           | FIFO paginated list                       |
| `ListAllTransactionsUseCase` | `ITransactionRepo`          | Read-only cross-owner                     |

---

## 9. Infrastructure — UnitOfWork Pattern

Use cases yang memerlukan operasi atomik menggunakan `IUnitOfWork.withTransaction()`. Di dalam callback, semua repo yang diakses (`uow.transactionRepo`, `uow.userRepo`, dll.) beroperasi dalam **satu DB transaction**. Implementasi: `DrizzleUnitOfWork` membungkus `db.transaction()` dan membuat scoped repos yang menggunakan `tx`.

**Digunakan di:** `ConfirmCashPaymentUseCase`, `CheckPgPaymentUseCase`, `ApproveWithdrawalUseCase`, `RequestWithdrawalUseCase`, `ManageSubscriptionUseCase`, `CheckSubscriptionPaymentUseCase`.

---

## 10. Security

| Area                   | Implementasi                                                                |
| ---------------------- | --------------------------------------------------------------------------- |
| **Password hashing**   | argon2 via `IHashService`; constant-time verification                       |
| **Access Token (JWT)** | jose, HS256, 15 menit expiry, min 256-bit secret                            |
| **Refresh Token**      | Random 64-char hex, SHA-256 hashed di DB, HttpOnly cookie                   |
| **Cookie security**    | `HttpOnly`, `Secure` (prod), `SameSite=Strict`, `Path=/api/v1/auth`         |
| **Rate limiting**      | `@fastify/rate-limit` pada auth (5/min) + pairing (5/min) endpoints         |
| **CORS**               | `@fastify/cors` — whitelist specific origins, `credentials: true`           |
| **Security headers**   | `@fastify/helmet` — default security headers                                |
| **SQL injection**      | Drizzle parameterized queries (built-in protection)                         |
| **Input validation**   | Zod di presentation layer + domain validation di entities                   |
| **Authorization**      | Role-based (`platform_admin` / `studio_owner`) + ownership guard            |
| **Service role key**   | Supabase service_role key hanya di backend env, never exposed               |
| **Asset guard**        | `backgroundUrl` / `overlayUrl` validated milik owner via storage path check |
| **File upload**        | MIME type validation + size limit (5MB assets, 10MB sessions)               |

---

## 11. Testing Strategy

### 11.1 Test Pyramid

| Layer              | Test Target                          | Approach                  | Complexity |
| ------------------ | ------------------------------------ | ------------------------- | ---------- |
| **Domain**         | PriceCalculator, SubscriptionChecker | Pure unit test (no mocks) | ✅ Easy    |
| **Application**    | Use cases                            | Mock ports (interfaces)   | ✅ Easy    |
| **Controller**     | Controller methods                   | Mock use cases            | ✅ Easy    |
| **Infrastructure** | Repositories                         | Real test DB              | ⚠️ Medium  |
| **Presentation**   | Routes end-to-end                    | Supertest + full app      | ⚠️ Medium  |

### 11.2 Testing Commands

```bash
pnpm test                # Run all tests (Vitest)
pnpm test:watch          # Watch mode
pnpm test:coverage       # Coverage report
pnpm typecheck           # tsc --noEmit
pnpm lint                # Biome check
```

### 11.3 Critical Test Scenarios

| Scenario                                | Type        | Alasan                      |
| --------------------------------------- | ----------- | --------------------------- |
| Price mismatch detection                | Unit        | Revenue protection          |
| Idempotent cash confirm (double-tap)    | Integration | Zero duplicate mutations    |
| Concurrent withdrawal approve           | Integration | Pessimistic lock validation |
| Lazy subscription status computation    | Unit        | Core business logic         |
| JWT expired → 401                       | Integration | Auth flow                   |
| Owner scoping (no cross-tenant leak)    | Integration | Data isolation              |
| File upload MIME/size validation        | Integration | Security                    |
| Template delete with transactions → 409 | Integration | Data integrity              |

---

## 12. Deployment

| Aspek    | Pilihan                      | Catatan                                   |
| -------- | ---------------------------- | ----------------------------------------- |
| Platform | **Vercel** (Fluid Compute)   | Fastify via `@fastify/aws-lambda` adapter |
| Database | **Supabase** PostgreSQL      | Managed, free tier                        |
| Storage  | **Supabase** Storage         | Backgrounds, overlays, session results    |
| CI/CD    | **GitHub Actions** (planned) | Lint → typecheck → test → deploy          |

> Deployment strategy lengkap per komponen platform: **[PRD-00 §11 — Deployment & Infrastructure](./PRD-00-master.md)**.
>
> Environment variables: lihat `example.env` di root repository.

---

## 13. Risks & Mitigations

| Risk                              | Dampak                                 | Mitigasi                                                                                                                                                                                    |
| --------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Xendit API downtime               | Transaksi PG tidak bisa dibuat/dicheck | `IPaymentGateway` abstraction; **5-detik `AbortController` timeout** pada semua Xendit API call; `CheckPgPaymentUseCase` return PENDING on error (no state change); CASH/QRIS tetap operasi |
| `wallet_balance` cache drift      | Inkonsistensi keuangan                 | Setiap mutasi via atomic UnitOfWork; integration test verifikasi                                                                                                                            |
| Race condition withdrawal approve | Double debit wallet                    | `SELECT FOR UPDATE` pessimistic lock                                                                                                                                                        |
| Race condition withdrawal reject  | Approve+reject concurrent corruption   | `RejectWithdrawalUseCase` now wrapped in `IUnitOfWork.withTransaction` with `findByIdForUpdate` lock                                                                                        |
| Supabase storage outage           | Upload session gagal                   | Retry + error handling; kiosk skip digital copy jika gagal                                                                                                                                  |
| JWT secret compromised            | Seluruh token invalid                  | Min 256-bit secret; rotasi manual + invalidate semua refresh tokens                                                                                                                         |
| Drizzle schema migration failure  | Downtime                               | Test migration di staging; rollback procedure                                                                                                                                               |

---

## 14. Changelog

| Tanggal    | Versi | Perubahan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-03-05 | 1.0   | Initial draft — synthesized dari referensi backend (API_CONTRACT, ARCHITECTURE, FEATURE_SPECS, PRD v2.1, schema v3). OI-01 & OI-02 resolved. Context7 best practices applied (Fastify 5, Drizzle ORM).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-03-07 | 1.1   | **Implementation sync** — EPIC-01 & EPIC-02 marked as done. Updated: (1) SubscriptionChecker algorithm — CANCELLED checked before period check; (2) Transaction rules — PG called before DB insert, 5s AbortController timeout, CheckPg returns PENDING on error; (3) Pairing rules — inactive kiosk rejection added; (4) UnitOfWork interface — `execute()` → `withTransaction()` with all repos exposed; (5) Project structure — actual paths (`persistence/drizzle/`, `tests/`, `docs/`); (6) Added `docs/api/` and `docs/postman/` to structure; (7) Domain layer structure — `enums/`, file naming convention.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-03-07 | 1.2   | **EPIC-03 Owner Management done.** Fixes: (1) `MaxKiosksReachedError` domain error added (403); (2) No-subscription now returns distinct `ForbiddenError`; (3) `pairingCode` removed from kiosk list response; (4) Sequence conflict returns 409 `ConflictError`; (5) `photo_slot` validates `captureOrder` in properties; (6) `overlayUrl` uses explicit null check instead of truthy; (7) Zod schemas: kiosk prices `.int().nonneg()`, template prices `.int().nonneg()`, element dims `.int()`, overlayUrl `.min(1)`. 53 unit tests added (4 test files). API docs `docs/api/owner.md`, Postman `docs/postman/owner.postman_collection.json`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-03-07 | 1.3   | **EPIC-04 Owner Finance done.** Fixes: (1) `RequestWithdrawalUseCase` wrapped in `UnitOfWork.withTransaction` with `findByIdForUpdate` row lock — prevents race condition on concurrent pending check + balance check; (2) LIKE wildcards escaped in `DrizzleTransactionRepository` search — prevents data exposure via `%`/`_` injection; (3) `minimum_withdrawal_amount` config missing now throws `InternalServerError` instead of defaulting to 0; (4) `endDate` filter changed from `lte` to `lt` (exclusive upper bound) — fixes off-by-one; (5) Defensive `Math.min(limit, 100)` clamp added in all paginated use cases; (6) `BelowMinimumError` message now includes the minimum amount value; (7) `listByOwnerId` in transaction repo now has `ORDER BY createdAt DESC`; (8) Bank field schemas: `bankName` max(100), `bankAccountNumber` max(50), `bankAccountName` max(200), all trimmed. 36 unit tests added (4 test files). API docs `docs/api/owner-finance.md`, Postman `docs/postman/owner-finance.postman_collection.json`.                                                                       |
| 2026-03-07 | 1.4   | **EPIC-05 Owner Subscription done.** Fixes: (1) Added `PENDING_PAYMENT` to `subscription_status` enum — subscription no longer ACTIVE before payment; (2) `ManageSubscriptionUseCase` refactored to use `IUnitOfWork` for atomic DB writes + PG call outside transaction (safe: PENDING_PAYMENT); (3) `CheckSubscriptionPaymentUseCase` refactored to use `IUnitOfWork` — settlement (invoice PAID + sub ACTIVE) and expire (invoice FAILED + sub EXPIRED) now atomic; (4) PG error in checkStatus caught → returns PENDING, no state change; (5) Duplicate subscribe guard — same plan+period re-subscribe → 409 ConflictError; (6) `gracePeriodDaysRemaining` only shown for GRACE_PERIOD status; (7) ORDER BY added to `listPlans`/`listActivePlans`; (8) `findSubscriptionByUserId` ordered by `createdAt DESC`. DB migration: `0003_add_pending_payment_status.sql`. 23 unit tests added (2 test files + 1 existing test updated). API docs `docs/api/owner-subscription.md`, Postman `docs/postman/owner-subscription.postman_collection.json`.                                                              |
| 2026-03-07 | 1.5   | **Document restructure.** Removed duplicate content already covered in PRD-00: User Personas (→ §2), Non-Goals (→ §10.2), ER diagram + Entity table (→ §7), Deployment strategy (→ §11). Removed stale code blocks: Project Structure, Fastify Plugin Architecture, DI Wiring, Port Interfaces table, Environment Variables (source: repo & `example.env`). UnitOfWork §9 condensed to prose. Open Issues removed (all resolved). Non-Goals trimmed to 5 backend-specific items. Sections renumbered §1-§14. Lines reduced ~912 → ~480.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-03-07 | 1.6   | **EPIC-06 Admin Platform done.** 11 issues fixed: (1) `findByIdIncludeDeleted` added to `IUserRepo` — owner restore path no longer dead code; (2) `RejectWithdrawalUseCase` refactored from `IWithdrawalRepo` to `IUnitOfWork` with `findByIdForUpdate` — prevents approve+reject race condition; (3) `ManageOwnersUseCase.update` — email update applied before soft-delete, no longer silently dropped; (4) Defensive `Math.min(limit, 100)` clamp added to `ListAllTransactionsUseCase` and `ListAllWithdrawalsUseCase`; (5) `findByEmail` in `DrizzleUserRepository` now filters `isNull(deletedAt)` — soft-deleted emails reclaimable; (6) `listByRole` — `ORDER BY createdAt DESC` added; (7) Email normalization `.trim().toLowerCase()` on admin schemas; (8) Search string trimmed in admin transactions; (9) `findPlanByName` added — plan name uniqueness enforced on create+update; (10) Empty-update guard in `ManagePlansUseCase.update`; (11) Password schema: `.max(128)` added. 41 unit tests (7 test files). API docs `docs/api/admin.md`, Postman `docs/postman/admin.postman_collection.json`. |
| 2026-03-08 | 1.7   | **Deployment & improvements.** (1) `GET /owner/subscription/plans` endpoint — owner can list active plans (controller calls `listActivePlans()`, excludes internal fields); (2) `FRONTEND_URL` optional env var added; (3) `XenditPaymentService` now sets `success_redirect_url` on subscription invoices → `${FRONTEND_URL}/onboarding?invoice_id=${invoice.id}` — Xendit redirects user back to frontend after payment, eliminating sessionStorage bridge; (4) Transaction (kiosk) payments unaffected. 7 unit tests added (2 test files). Docs updated: `owner-subscription.md`, `DEPLOYMENT.md`, PRD-00 §6.6, PRD-02 §5.2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-03-08 | 1.8   | **Safe subscription upgrade (bugfix).** `ManageSubscriptionUseCase` no longer mutates existing ACTIVE subscription on upgrade — always creates **new subscription row** (`PENDING_PAYMENT`). Old ACTIVE stays untouched. (1) `CheckSubscriptionPaymentUseCase` settlement now: activates new sub + cancels old ACTIVE in 1 transaction; expire: expires new sub only, old ACTIVE untouched; (2) New guard: max 1 PENDING_PAYMENT per owner (409 Conflict if pending exists); (3) `getSubscription` prioritizes ACTIVE via `findActiveByUserId`, adds `pendingUpgrade` field; (4) `GetKioskConfigUseCase` uses `findActiveByUserId` — kiosk keeps running during pending upgrade; (5) New repo method `findPendingPaymentByUserId`; (6) Response schema `GetOwnerSubscriptionResponseSchema` updated with `pendingUpgrade`. Tests updated: manage-subscription (13 tests), check-subscription-payment (10 tests). PRD-00 §6.3 + §6.6, PRD-01 §7.2 updated.                                                                                                                                                          |
