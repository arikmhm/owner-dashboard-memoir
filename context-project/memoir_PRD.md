# memoir. — Product Requirements Document

> **Versi:** 1.1
> **Tanggal:** Februari 2026
> **Status:** Draft — For Developer Review
> **Audiens:** Developer (Backend, Frontend, Desktop/Electron)

---

## Daftar Dokumen

| Dokumen | Deskripsi |
|---|---|
| `memoir_PRD.md` | Dokumen ini — overview, arsitektur, model bisnis, API, edge cases |
| `memoir_APP_platform-admin.md` | Spesifikasi aplikasi Platform Admin Web (memoir. internal) |
| `memoir_APP_owner-dashboard.md` | Spesifikasi aplikasi Dashboard Owner Web |
| `memoir_APP_kiosk-runner.md` | Spesifikasi aplikasi Kiosk Runner (Electron) |
| `memoir_schema_v2.dbml` | Schema database lengkap dalam format DBML |

---

## 1. Ringkasan Produk

### 1.1 Visi

memoir. adalah platform SaaS yang memungkinkan siapa saja membangun dan mengoperasikan bisnis photobooth receipt tanpa harus membangun sistem dari nol. Platform menyediakan infrastruktur lengkap mulai dari manajemen template, sistem pembayaran, hingga aplikasi runner untuk device booth fisik.

### 1.2 Problem Statement

Operator photobooth saat ini harus membangun sendiri sistem kasir, manajemen file, dan integrasi printer — yang membutuhkan keahlian teknis tinggi dan waktu pengembangan lama. memoir. hadir sebagai solusi siap pakai: operator cukup menyiapkan hardware fisik, semua software sudah tersedia.

### 1.3 Target Pengguna

| Persona | Deskripsi | Kebutuhan Utama |
|---|---|---|
| **Studio Owner** | Pemilik bisnis photobooth yang mendaftar ke platform | Kelola template, lihat transaksi, tarik saldo, pantau booth |
| **Operator Booth** | Orang yang menjalankan booth fisik sehari-hari | Jalankan sesi foto, tidak perlu akses dashboard web |
| **Customer / Pengunjung** | Pengguna akhir di lokasi booth | Pilih template, bayar, cetak, opsional dapat softfile |
| **Platform Admin** | Tim internal memoir. | Onboard owner, kelola plan, proses withdrawal |

### 1.4 Proposisi Nilai

- Owner tidak perlu coding — daftar, setup template, kiosk siap jalan
- Satu platform untuk semua booth — multi-kiosk dari satu dashboard
- Model bisnis berbasis subscription, bukan potongan per transaksi
- Electron runner yang ringan dan bisa beroperasi semi-offline

---

## 2. Arsitektur Sistem

### 2.1 Gambaran Umum

```
memoir. Platform (Platform Admin Web)
    └── Dashboard Owner (Web)
            └── Kiosk Runner (Electron App)
                    └── Hardware (Kamera, Printer, Payment Terminal)
```

Tiga surface utama yang berkomunikasi melalui REST API ke Node.js backend, dengan Supabase sebagai database dan storage.

### 2.2 Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Node.js, Express / Fastify, TypeScript |
| Auth | JWT custom (di-sign dan di-verify di Node.js backend) |
| Database | Supabase (PostgreSQL) — diakses via service_role key dari backend |
| File Storage | Supabase Storage |
| Frontend Web | Next.js, TypeScript, Tailwind CSS |
| Desktop App | Electron, TypeScript |
| Payment Gateway | Midtrans / Xendit (untuk metode PG) |
| State Lokal Electron | electron-store (JSON config tersimpan di device) |

### 2.3 Catatan Penting Arsitektur Auth

- Backend Node.js menggunakan **service_role key** Supabase untuk semua operasi database — RLS Supabase tidak digunakan, authorization ditangani di application layer (Node.js)
- **Web app** (Admin & Owner): autentikasi via JWT yang di-generate backend saat login, disimpan di httpOnly cookie atau localStorage
- **Electron runner**: autentikasi via `device_token` (JWT terpisah) yang di-generate backend saat proses pairing, disimpan terenkripsi di electron-store via `safeStorage`
- `device_token` tidak memiliki expiry — berlaku permanen sampai owner melakukan reset pairing dari dashboard

### 2.4 Komunikasi Electron ↔ Backend

- Semua request dari Electron menggunakan header `Authorization: Bearer {device_token}`
- Sync template: polling saat startup, bandingkan `updated_at` dari server dengan cache lokal
- **Harga selalu di-fetch fresh dari server** setiap startup — tidak pernah pakai nilai dari cache
- Status pembayaran PG: **on-demand via button** yang ditekan customer/operator, bukan webhook otomatis
- Tidak ada WebSocket / push notification untuk MVP — semua berbasis request-response

---

## 3. Model Bisnis & Subscription

### 3.1 Model Revenue

memoir. menggunakan **subscription tiered per owner**. Platform tidak mengambil potongan dari setiap transaksi sesi foto — seluruh pendapatan booth masuk ke wallet owner. Revenue memoir. berasal dari tagihan langganan bulanan atau tahunan.

### 3.2 Tier Langganan

Tier dan harga dikonfigurasi oleh platform admin via tabel `subscription_plans`. Contoh tier:

| Tier | Max Kiosk | Harga Bulanan | Harga Tahunan |
|---|---|---|---|
| Starter | 1 booth | Rp 99.000 | Rp 990.000 |
| Pro | 3 booth | Rp 249.000 | Rp 2.490.000 |
| Business | 10 booth | Rp 599.000 | Rp 5.990.000 |

> Nilai di atas adalah contoh. Semua dikelola via platform admin dashboard, tidak hardcode.

### 3.3 Business Rules Subscription

- Satu owner hanya boleh memiliki satu subscription **ACTIVE** pada satu waktu
- **Status subscription dihitung secara lazy** — tidak ada cron job yang mengubah status. Backend membandingkan `current_period_end` dengan `now()` setiap kali ada request yang membutuhkan pengecekan status
- Jika `now() > current_period_end` dan belum ada invoice baru yang PAID, subscription dianggap **expired** secara logis
- Grace period dikonfigurasi via `platform_config` (key: `grace_period_days`). Selama dalam grace period, kiosk masih bisa beroperasi
- Setelah grace period habis, kiosk tidak dapat memulai sesi baru
- Enforcement `max_kiosks`: saat owner coba tambah kiosk baru, backend cek jumlah kiosk aktif vs `plan.max_kiosks`. Jika penuh, return error

### 3.4 Lifecycle Invoice Subscription

1. Owner pilih plan dan periode billing (MONTHLY / YEARLY)
2. Backend buat record `subscriptions` dan `subscription_invoices` status PENDING
3. Owner bayar via PG — diarahkan ke `payment_url`
4. Owner tekan tombol **"Cek Status Pembayaran"** di halaman invoice
5. Backend query ke PG API, jika PAID: update invoice, set `current_period_start` dan `current_period_end`, aktifkan subscription
6. Renewal: owner membayar invoice renewal yang dibuat sistem, lalu konfirmasi manual via button yang sama

---

## 4. Database

Schema database lengkap tersedia di file **`memoir_schema_v2.dbml`**.

Tabel yang ada: `users`, `subscription_plans`, `subscriptions`, `subscription_invoices`, `platform_config`, `kiosks`, `templates`, `template_slots`, `transactions`, `sessions`, `wallet_mutations`, `withdrawals`.

### 4.1 Catatan Implementasi Kritis

- `wallet_balance` di `users` adalah cache — harus diupdate **atomically** bersamaan dengan insert ke `wallet_mutations` menggunakan database transaction (Supabase RPC atau `BEGIN/COMMIT` di query)
- `owner_id` di `transactions` adalah denormalisasi dari `kiosk.owner_id` — wajib diisi saat insert
- `updated_at` di `templates` **wajib diupdate** setiap ada perubahan template atau slot — ini sinyal sync untuk Electron
- Idempotency transaksi PG: sebelum update status ke PAID, cek apakah `order_id` sudah PAID. Jika ya, abaikan — jangan insert duplikat mutasi
- Index wajib ada pada: `transactions(owner_id)`, `transactions(kiosk_id)`, `transactions(created_at)`, `wallet_mutations(user_id)`

---

## 5. API Outline

Semua endpoint menggunakan prefix `/api/v1`.

### 5.1 Endpoint Kiosk (Electron)

Header wajib: `Authorization: Bearer {device_token}`

| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/kiosk/pair` | Tukarkan `pairing_code` dengan `device_token` |
| `GET` | `/kiosk/me` | Ambil config kiosk, harga terkini, dan status subscription |
| `GET` | `/kiosk/templates` | Ambil daftar template + slots untuk sync |
| `POST` | `/kiosk/transactions` | Buat transaksi baru (status PENDING) |
| `POST` | `/kiosk/transactions/:id/check-payment` | Trigger cek status ke PG — update ke PAID/FAILED jika sesuai |
| `POST` | `/kiosk/transactions/:id/confirm-cash` | Konfirmasi CASH / QRIS statis — langsung set PAID |
| `POST` | `/kiosk/sessions` | Upload hasil foto & buat record session (hanya jika digital copy) |

### 5.2 Endpoint Owner Dashboard

Header wajib: `Authorization: Bearer {jwt}` (role: `studio_owner`)

| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/auth/login` | Login owner, return JWT |
| `GET/POST/PATCH` | `/owner/kiosks` | CRUD kiosk milik owner |
| `POST` | `/owner/kiosks/:id/generate-pairing` | Generate `pairing_code` baru |
| `GET/POST/PATCH/DELETE` | `/owner/templates` | CRUD template |
| `GET/POST/PATCH/DELETE` | `/owner/templates/:id/slots` | CRUD slot per template |
| `GET` | `/owner/transactions` | List transaksi dengan filter |
| `GET` | `/owner/wallet` | Saldo dan histori mutasi |
| `POST` | `/owner/withdrawals` | Request withdrawal baru |
| `GET` | `/owner/withdrawals` | List withdrawal dan statusnya |
| `GET/POST` | `/owner/subscription` | Lihat subscription aktif, pilih plan baru |
| `POST` | `/owner/subscription/invoices/:id/check-payment` | Cek status pembayaran invoice subscription ke PG |
| `GET` | `/owner/subscription/invoices` | Histori invoice subscription |

### 5.3 Endpoint Platform Admin

Header wajib: `Authorization: Bearer {jwt}` (role: `platform_admin`)

| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/auth/login` | Login admin (endpoint sama, role dibedakan dari JWT payload) |
| `GET/POST/PATCH` | `/admin/owners` | CRUD studio owner |
| `GET/POST/PATCH` | `/admin/subscription-plans` | CRUD tier plan |
| `GET/PATCH` | `/admin/platform-config` | Baca dan update key-value config |
| `GET` | `/admin/withdrawals` | List semua withdrawal PENDING |
| `POST` | `/admin/withdrawals/:id/approve` | Approve — buat mutasi DEBIT, update status |
| `POST` | `/admin/withdrawals/:id/reject` | Reject dengan catatan |
| `GET` | `/admin/transactions` | Semua transaksi lintas owner |

---

## 6. Edge Cases & Business Rules

### 6.1 Transaksi Booth

- **Idempotency PG**: sebelum set PAID, cek apakah `order_id` sudah berstatus PAID. Jika ya, skip — jangan insert duplikat `wallet_mutation`
- **Transaksi abandoned**: transaksi PG yang tidak pernah dicek statusnya akan tetap PENDING selamanya di DB. Ini diterima untuk MVP — tidak berbahaya secara fungsional, hanya perlu filter di laporan
- **Harga berubah saat transaksi berlangsung**: tidak masalah — harga sudah di-snapshot ke `applied_*_price` saat transaksi dibuat
- **Template dinonaktifkan saat sesi berlangsung**: transaksi tetap dilanjutkan, tidak ada rollback

### 6.2 Subscription

- **Status expired** dihitung di backend saat request masuk — `now() > current_period_end + grace_period_days`. Tidak ada kolom status yang di-update otomatis
- **Kiosk startup saat expired**: `/kiosk/me` mengembalikan `subscription_status: "EXPIRED"`. Electron lock layar
- **Owner tambah kiosk saat penuh**: backend return HTTP 403 dengan pesan yang menyarankan upgrade plan
- **Reset pairing**: owner trigger dari dashboard, backend generate `pairing_code` baru dan invalidate `device_token` lama. Electron yang masih pakai token lama akan mendapat 401 dan menampilkan layar pairing ulang

### 6.3 Withdrawal

- **Saldo tidak cukup saat admin approve**: backend re-cek saldo sebelum buat mutasi DEBIT. Jika tidak cukup, return error — status withdrawal tidak berubah
- **Concurrent request**: owner tidak boleh punya lebih dari satu withdrawal berstatus PENDING. Enforce di backend saat POST `/owner/withdrawals`
- **Minimum withdrawal**: dikonfigurasi via `platform_config` (key: `minimum_withdrawal_amount`). Validasi di backend

### 6.4 Sync Template Electron

- **Template dihapus di server**: saat sync, template yang tidak ada di response server harus dihapus dari cache lokal Electron
- **Download background gagal**: log error, tandai template sebagai belum tersync, jangan tampilkan ke customer sampai berhasil di-sync
- **`updated_at` wajib disentuh** setiap kali ada perubahan pada template atau slot-nya — pastikan logic backend selalu update kolom ini

---

## 7. Non-Functional Requirements

| Aspek | Requirement |
|---|---|
| **Ketersediaan** | Target uptime API 99.5%. Electron bisa berjalan semi-offline untuk CASH/QRIS statis |
| **Performa** | Response API endpoint kiosk < 500ms. Composite foto < 3 detik. Upload digital copy < 10 detik |
| **Keamanan** | `device_token` disimpan via Electron `safeStorage`. Service role key Supabase hanya ada di backend, tidak pernah di client |
| **Skalabilitas** | Index wajib pada kolom yang sering di-query. Arsitektur support penambahan owner/kiosk tanpa schema change |
| **Offline Tolerance** | Sesi CASH/QRIS dapat berjalan tanpa internet. Sesi PG butuh koneksi aktif |
| **Audit Trail** | Semua mutasi keuangan tercatat di `wallet_mutations` dengan snapshot saldo. Perubahan `platform_config` mencatat `updated_by` |
| **No Cron Job** | Tidak ada scheduled job untuk MVP. Semua pengecekan status dilakukan secara lazy / on-demand |

---

## 8. Scope MVP vs Future

### Termasuk MVP

- Semua fitur di dokumen spesifikasi per aplikasi (`APP_*.md`)
- Subscription tiered dengan 2 periode billing
- 3 metode pembayaran booth: CASH, STATIC_QRIS, PG
- Konfirmasi pembayaran manual via button (tidak ada webhook otomatis)
- Digital copy dengan upload Supabase Storage + QR download
- Withdrawal manual (owner request → admin approve)
- Sync template Electron via polling startup + manual sync
- Pairing kiosk via 6-digit code

### Di Luar Scope MVP

- Notifikasi email / WhatsApp
- Prorata billing saat upgrade/downgrade plan
- Withdrawal otomatis tanpa approval admin
- Push notifikasi real-time (WebSocket)
- Analitik lanjutan (grafik, heatmap)
- Multi-operator per kiosk dengan PIN berbeda
- White-label / custom branding per owner
- Webhook payment gateway otomatis (digantikan manual check untuk MVP)

---

*Dokumen ini living document dan akan diperbarui seiring perkembangan produk.*
*Schema database: `memoir_schema_v2.dbml`*
