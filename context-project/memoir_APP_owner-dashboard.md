# memoir. — Owner Dashboard Web

> **Bagian dari:** memoir. PRD v1.1
> **Surface:** Dashboard Owner Web
> **Pengguna:** Studio owner dengan role `studio_owner`

---

## Gambaran Umum

Dashboard Owner adalah aplikasi web yang digunakan studio owner untuk mengelola semua aset dan operasional booth mereka — mulai dari setup template, memantau transaksi, mengelola keuangan, hingga melakukan pairing kiosk. Owner hanya bisa melihat dan mengelola data miliknya sendiri — enforced di backend.

Autentikasi menggunakan JWT dengan payload `{ id, role: "studio_owner" }`.

---

## State Awal: Onboarding

Setelah registrasi pertama kali, owner **belum memiliki subscription aktif**. Seluruh fitur utama diblokir sampai owner memilih plan dan menyelesaikan pembayaran pertama.

**Alur onboarding:**
1. Owner login → diarahkan ke halaman pilih plan
2. Owner pilih tier + periode billing (MONTHLY / YEARLY)
3. Backend buat `subscriptions` (ACTIVE) + `subscription_invoices` (PENDING)
4. Owner diarahkan ke `payment_url` dari PG
5. Setelah membayar, owner kembali ke dashboard dan tekan **"Cek Status Pembayaran"**
6. Backend query ke PG, jika PAID: invoice diupdate, `current_period_start` dan `current_period_end` diisi
7. Subscription aktif, fitur terbuka

---

## Fitur

### 1. Autentikasi

**Login**
- Form email + password
- Return JWT, disimpan di client

**Lupa Password** *(opsional MVP — bisa manual via admin dulu)*

---

### 2. Dashboard / Home

Ringkasan kondisi booth owner.

**Yang ditampilkan:**
- Status subscription aktif: nama plan, sisa hari (`current_period_end - now()`), periode billing
- Banner warning jika dalam grace period — tampilkan jumlah hari tersisa sebelum booth terkunci
- Total kiosk aktif vs max kiosk dari plan
- Total pendapatan bulan berjalan (sum `total_amount` dari transaksi PAID milik owner)
- Total transaksi hari ini
- Saldo wallet saat ini

---

### 3. Manajemen Subscription

**Halaman Subscription**
- Info plan aktif: nama tier, max kiosk, harga yang dibayar, periode, `current_period_end`
- Tombol **"Perpanjang"** — buat invoice renewal baru (PENDING) dan arahkan ke `payment_url`
- Tombol **"Upgrade Plan"** — pilih plan baru, buat invoice baru, cancel subscription lama setelah PAID

**Halaman Cek Pembayaran Invoice**
- Tampil saat ada invoice PENDING
- Tombol **"Cek Status Pembayaran"** — hit `POST /owner/subscription/invoices/:id/check-payment`
- Backend query ke PG API, update status jika sudah PAID
- Jika PAID: tampilkan konfirmasi sukses, redirect ke dashboard
- Jika belum PAID: tampilkan pesan "Pembayaran belum terdeteksi, silakan coba lagi"
- Jika FAILED / expired di PG: tampilkan pesan dan opsi buat invoice baru

**Histori Invoice**
- Tabel invoice: periode, amount, metode bayar, status, tanggal bayar

---

### 4. Manajemen Kiosk

**List Kiosk**
- Kartu per kiosk: nama, status (aktif/nonaktif), `paired_at`, harga default
- Tombol tambah kiosk — disabled dengan tooltip jika sudah mencapai `max_kiosks`

**Tambah Kiosk**
- Form: nama kiosk
- Backend buat record kiosk, generate `pairing_code` 6 digit
- Tampilkan `pairing_code` yang harus diinput di Electron runner
- `pairing_code` expired setelah dipakai (set null setelah pairing berhasil)

**Detail / Edit Kiosk**
- Edit nama kiosk
- Edit harga default: `price_base_session`, `price_per_extra_print`, `price_digital_copy`
- Tampilkan `paired_at` dan info device (dari `device_token` metadata jika ada)
- Tombol **"Reset Pairing"**: generate `pairing_code` baru, invalidate `device_token` lama. Electron yang masih aktif dengan token lama akan mendapat 401 dan masuk layar pairing ulang
- Toggle aktif / nonaktif kiosk

**Business rule:** Jumlah kiosk aktif (`is_active = true` dan `deleted_at IS NULL`) tidak boleh melebihi `max_kiosks` dari plan aktif.

---

### 5. Manajemen Template

**List Template**
- Grid atau tabel: thumbnail background, nama, jumlah slot, status aktif/nonaktif
- Tampilkan indikator jika ada override harga

**Buat Template Baru**
- Upload file background (jpg/png) → disimpan ke Supabase Storage, URL disimpan ke `background_url`
- Upload overlay (opsional) → `overlay_url`
- Input dimensi canvas: width (default 576), height
- Setelah save, backend insert template dan update `updated_at`

**Edit Template**

*Tab Info Dasar:*
- Edit nama, upload ulang background/overlay, edit dimensi
- Override harga (opsional): `override_price_base`, `override_price_extra_print`, `override_price_digital_copy` — jika dikosongkan, pakai harga kiosk

*Tab Editor Slot:*
- Visual editor: tampilkan preview background
- Tambah slot: drag atau input manual `x, y, width, height, rotation, sequence`
- Edit / hapus slot yang sudah ada
- Setiap perubahan slot → backend update `updated_at` template

**Nonaktifkan / Aktifkan Template**
- Toggle `is_active`

**Hapus Template**
- Cek di backend: jika ada `transactions` yang mereferensikan template ini, **tolak** penghapusan dan tampilkan pesan
- Jika tidak ada transaksi, hapus template (cascade ke `template_slots`)
- Jika tidak bisa dihapus, sarankan owner untuk nonaktifkan saja

---

### 6. Transaksi & Laporan

**List Transaksi**
- Tabel: tanggal, order_id, kiosk, template, qty print, digital copy, metode bayar, total, status
- Filter: kiosk, tanggal range, status (PENDING/PAID/FAILED), payment method
- Search by order_id

**Detail Transaksi**
- Semua field transaksi
- Harga yang diterapkan saat transaksi (snapshot): base, extra print, digital copy
- Link ke session (jika ada digital copy)

**Ringkasan**
- Total pendapatan per kiosk dalam periode tertentu
- Breakdown metode pembayaran

> Tidak ada export CSV / PDF di MVP.

---

### 7. Wallet & Keuangan

**Halaman Wallet**
- Saldo saat ini (`wallet_balance`)
- Histori mutasi: tabel dengan kolom tanggal, kategori, deskripsi, amount (+ / -), saldo setelah mutasi
- Filter histori: kategori (TRANSACTION_INCOME / WITHDRAWAL / ADJUSTMENT)

**Request Withdrawal**
- Form:
  - Jumlah yang ingin ditarik (validasi: tidak boleh melebihi saldo, tidak boleh di bawah minimum dari `platform_config`)
  - Nama bank
  - Nomor rekening
  - Nama pemilik rekening
- Backend cek: tidak boleh ada withdrawal lain yang masih PENDING
- Setelah submit, status PENDING. Owner tidak bisa request lagi sampai yang ini selesai

**Status Withdrawal**
- List withdrawal: tanggal request, jumlah, bank tujuan, status, tanggal diproses
- Jika REJECTED: tampilkan `rejection_note`

---

## Business Rules & Edge Cases

- Semua query data di backend difilter by `owner_id` dari JWT — owner tidak bisa akses data milik owner lain
- Jika subscription expired (melewati grace period), halaman-halaman operasional (kiosk, template) menampilkan banner lock dan tombol aksi di-disable. Owner hanya bisa akses halaman subscription dan wallet
- Perubahan template yang sedang di-cache Electron tidak akan terasa sampai Electron sync ulang (startup berikutnya atau manual sync). Ini by design — tampilkan note di UI template editor
- Upload background/overlay: validasi ukuran file (max 5MB) dan tipe file (jpg, png) dilakukan di frontend sebelum upload
