# Auth API — Endpoint Documentation

> **Base URL:** `/api/v1/auth`
> **Auth Required:** None (these endpoints issue/manage tokens)

---

## POST `/auth/login`

Login untuk admin dan studio owner. Mengembalikan JWT access token dan set refresh token sebagai HttpOnly cookie.

### Rate Limit

5 requests/menit per IP.

### Request

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "email": "owner@example.com",
  "password": "password123"
}
```

| Field      | Type   | Validation         | Required |
| ---------- | ------ | ------------------ | -------- |
| `email`    | string | Valid email format | Yes      |
| `password` | string | Min 1 character    | Yes      |

### Response — 200 OK

**Body:**

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "owner@example.com",
      "role": "studio_owner"
    }
  }
}
```

**Set-Cookie Header:**

```
Set-Cookie: refresh_token=<64-char-hex>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800
```

> `Secure` flag hanya di-set ketika `NODE_ENV=production`.

### Error Responses

| Status | Error Code         | Kondisi                                                       |
| ------ | ------------------ | ------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR` | Email format invalid / password kosong                        |
| 401    | `UNAUTHORIZED`     | Email tidak ditemukan / password salah / account soft-deleted |
| 429    | `RATE_LIMITED`     | Melebihi 5 requests/menit                                     |

**Error Body:**

```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid credentials"
}
```

---

## POST `/auth/refresh`

Mendapatkan access token baru. Refresh token dibaca dari HttpOnly cookie — tidak perlu body.

### Rate Limit

10 requests/menit per IP.

### Request

**Headers:** Tidak ada header khusus. Cookie `refresh_token` dikirim otomatis oleh browser.

**Body:** Tidak ada.

### Response — 200 OK

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Error Responses

| Status | Error Code     | Kondisi                             |
| ------ | -------------- | ----------------------------------- |
| 401    | `UNAUTHORIZED` | Refresh token tidak ada di cookie   |
| 401    | `UNAUTHORIZED` | Refresh token tidak ditemukan di DB |
| 401    | `UNAUTHORIZED` | Refresh token sudah di-revoke       |
| 401    | `UNAUTHORIZED` | Refresh token sudah expired         |
| 401    | `UNAUTHORIZED` | User tidak ditemukan / soft-deleted |
| 429    | `RATE_LIMITED` | Melebihi 10 requests/menit          |

---

## POST `/auth/logout`

Revoke refresh token dan clear cookie. Idempotent — tidak error jika token sudah tidak valid.

### Rate Limit

10 requests/menit per IP.

### Request

**Headers:** Tidak ada header khusus. Cookie `refresh_token` dikirim otomatis.

**Body:** Tidak ada.

### Response — 204 No Content

Tidak ada body. Cookie di-clear via header:

```
Set-Cookie: refresh_token=; HttpOnly; Path=/api/v1/auth; Max-Age=0
```

### Error Responses

| Status | Error Code     | Kondisi                    |
| ------ | -------------- | -------------------------- |
| 429    | `RATE_LIMITED` | Melebihi 10 requests/menit |

> Logout tidak pernah return 401 — jika cookie kosong, tetap return 204.

---

## POST `/kiosk/pair`

> **Base URL:** `/api/v1/kiosk/pair` (bukan di `/auth`)

Tukarkan pairing code 6-digit dengan device token permanen untuk kiosk.

### Rate Limit

5 requests/menit per IP.

### Request

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "pairingCode": "123456"
}
```

| Field         | Type   | Validation           | Required |
| ------------- | ------ | -------------------- | -------- |
| `pairingCode` | string | Exactly 6 characters | Yes      |

### Response — 200 OK

```json
{
  "data": {
    "deviceToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "kioskConfig": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Booth Mall A",
      "ownerId": "660e8400-e29b-41d4-a716-446655440000",
      "priceBaseSession": 25000,
      "pricePerExtraPrint": 5000,
      "priceDigitalCopy": 10000
    }
  }
}
```

### Error Responses

| Status | Error Code             | Kondisi                                        |
| ------ | ---------------------- | ---------------------------------------------- |
| 400    | `VALIDATION_ERROR`     | Format pairing code invalid (bukan 6 karakter) |
| 404    | `NOT_FOUND`            | Pairing code tidak ditemukan / sudah dipakai   |
| 404    | `NOT_FOUND`            | Pairing code sudah expired                     |
| 422    | `UNPROCESSABLE_ENTITY` | Kiosk tidak aktif                              |
| 429    | `RATE_LIMITED`         | Melebihi 5 requests/menit                      |

---

## Authentication Flow Summary

### Web Client (Admin/Owner Dashboard)

```
1. POST /auth/login   → accessToken (body) + refresh_token (cookie)
2. Use accessToken in header: Authorization: Bearer {accessToken}
3. When accessToken expires (15 min), POST /auth/refresh → new accessToken
4. POST /auth/logout → revoke + clear cookie
```

> Client harus menggunakan `credentials: 'include'` di fetch untuk mengirim cookie.

### Kiosk Client (Electron/Flutter)

```
1. POST /kiosk/pair { pairingCode } → deviceToken
2. Use deviceToken in header: Authorization: Bearer {deviceToken}
3. deviceToken berlaku ~10 tahun (atau sampai owner re-pair)
```

---

## Token Details

| Aspek            | Access Token          | Refresh Token   | Device Token                 |
| ---------------- | --------------------- | --------------- | ---------------------------- |
| Format           | JWT (HS256)           | 64-char hex     | JWT (HS256)                  |
| Storage (client) | Memory / localStorage | HttpOnly cookie | Secure storage               |
| Expiry           | 15 menit              | 7 hari          | ~10 tahun                    |
| Payload          | `{ id, role }`        | — (opaque)      | `{ kioskId, ownerId }`       |
| Revocation       | Tidak (short-lived)   | DB-based (hash) | Overwrite di DB saat re-pair |
