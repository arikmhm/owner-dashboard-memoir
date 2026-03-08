# Kiosk API — Endpoint Documentation

> **Base URL:** `/api/v1/kiosk`
> **Auth Required:** Device Token (JWT Bearer) — issued via `POST /kiosk/pair`

All kiosk endpoints require a valid device token in the `Authorization: Bearer <deviceToken>` header, verified by the `verifyDeviceToken` plugin. The token carries `kioskId` and `ownerId` claims.

---

## GET `/kiosk/me`

Mengambil konfigurasi kiosk (harga, status subscription, sisa grace period). Dipanggil saat kiosk startup atau periodic refresh.

### Request

**Headers:**

```
Authorization: Bearer <deviceToken>
```

No body required.

### Response — 200 OK

```json
{
  "data": {
    "kiosk": {
      "id": "uuid",
      "name": "Booth A",
      "isActive": true,
      "priceBaseSession": 25000,
      "pricePerExtraPrint": 5000,
      "priceDigitalCopy": 10000
    },
    "subscriptionStatus": "ACTIVE",
    "gracePeriodDaysRemaining": 22
  }
}
```

| Field                      | Type    | Description                                         |
| -------------------------- | ------- | --------------------------------------------------- |
| `kiosk.id`                 | string  | UUID kiosk                                          |
| `kiosk.name`               | string  | Nama kiosk                                          |
| `kiosk.isActive`           | boolean | Status aktif kiosk                                  |
| `kiosk.priceBaseSession`   | number  | Harga dasar per sesi (Rp)                           |
| `kiosk.pricePerExtraPrint` | number  | Harga per extra print (Rp)                          |
| `kiosk.priceDigitalCopy`   | number  | Harga digital copy (Rp)                             |
| `subscriptionStatus`       | string  | `ACTIVE` / `EXPIRED` / `CANCELLED` / `GRACE_PERIOD` |
| `gracePeriodDaysRemaining` | number  | Sisa hari grace period (0 jika ACTIVE/EXPIRED)      |

### Error Responses

| Status | Code         | Condition                    |
| ------ | ------------ | ---------------------------- |
| 401    | UNAUTHORIZED | Device token missing/invalid |
| 404    | NOT_FOUND    | Kiosk not found              |

---

## GET `/kiosk/templates`

Mengambil semua template aktif milik owner kiosk, beserta elements-nya. Digunakan untuk sync template ke kiosk device.

### Request

**Headers:**

```
Authorization: Bearer <deviceToken>
```

No body required.

### Response — 200 OK

```json
{
  "data": [
    {
      "template": {
        "id": "uuid",
        "ownerId": "uuid",
        "name": "Classic",
        "width": 576,
        "height": 864,
        "backgroundUrl": "https://storage/bg.png",
        "overlayUrl": null,
        "overridePriceBase": null,
        "overridePriceExtraPrint": null,
        "overridePriceDigitalCopy": null,
        "isActive": true,
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-15T00:00:00.000Z"
      },
      "elements": [
        {
          "id": "uuid",
          "templateId": "uuid",
          "elementType": "photo_slot",
          "sequence": 1,
          "x": 0,
          "y": 0,
          "width": 200,
          "height": 200,
          "rotation": 0,
          "opacity": 100,
          "properties": { "captureOrder": 1 },
          "createdAt": "2025-01-01T00:00:00.000Z"
        }
      ],
      "updatedAt": "2025-01-15T00:00:00.000Z"
    }
  ]
}
```

| Field                        | Type    | Description                                 |
| ---------------------------- | ------- | ------------------------------------------- |
| `template.id`                | string  | UUID template                               |
| `template.ownerId`           | string  | UUID owner                                  |
| `template.name`              | string  | Nama template                               |
| `template.width`             | number  | Lebar canvas (px)                           |
| `template.height`            | number  | Tinggi canvas (px)                          |
| `template.backgroundUrl`     | string  | URL background image                        |
| `template.overlayUrl`        | string? | URL overlay image (nullable)                |
| `template.overridePriceBase` | number? | Override harga base (nullable)              |
| `elements[].elementType`     | string  | `photo_slot` / `image` / `text` / `shape`   |
| `elements[].properties`      | object  | Type-specific props (e.g. captureOrder)     |
| `updatedAt`                  | string  | ISO timestamp — latest of template/elements |

### Error Responses

| Status | Code         | Condition                    |
| ------ | ------------ | ---------------------------- |
| 401    | UNAUTHORIZED | Device token missing/invalid |

---

## POST `/kiosk/transactions`

Membuat transaksi baru. Server menghitung harga berdasarkan kiosk + template config, lalu memvalidasi `totalAmount` client. Untuk metode pembayaran `PG`, payment gateway dipanggil **sebelum** transaksi disimpan ke database.

### Request

**Headers:**

```
Authorization: Bearer <deviceToken>
Content-Type: application/json
```

**Body:**

```json
{
  "templateId": "uuid",
  "paymentMethod": "CASH",
  "printQty": 1,
  "hasDigitalCopy": false,
  "totalAmount": 25000
}
```

| Field            | Type    | Validation                    | Required |
| ---------------- | ------- | ----------------------------- | -------- |
| `templateId`     | string  | UUID format                   | Yes      |
| `paymentMethod`  | string  | `PG` / `CASH` / `STATIC_QRIS` | Yes      |
| `printQty`       | number  | Integer, min 1                | Yes      |
| `hasDigitalCopy` | boolean |                               | Yes      |
| `totalAmount`    | number  | Integer, min 0                | Yes      |

### Price Calculation

```
basePrice = template.overridePriceBase ?? kiosk.priceBaseSession
extraPrintPrice = template.overridePriceExtraPrint ?? kiosk.pricePerExtraPrint
digitalCopyPrice = template.overridePriceDigitalCopy ?? kiosk.priceDigitalCopy

total = basePrice + max(0, printQty - 1) * extraPrintPrice + (hasDigitalCopy ? digitalCopyPrice : 0)
```

Jika `totalAmount` dari client tidak sama dengan `total` server, akan dikembalikan `PRICE_MISMATCH` error.

### Response — 201 Created

```json
{
  "data": {
    "transaction": {
      "id": "uuid",
      "ownerId": "uuid",
      "kioskId": "uuid",
      "templateId": "uuid",
      "orderId": "MEM-1234567890-a1b2c3",
      "status": "PENDING",
      "paymentMethod": "CASH",
      "paymentUrl": null,
      "printQty": 1,
      "hasDigitalCopy": false,
      "appliedBasePrice": 25000,
      "appliedExtraPrintPrice": 5000,
      "appliedDigitalCopyPrice": 10000,
      "totalAmount": 25000,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "paidAt": null
    },
    "paymentUrl": null
  }
}
```

> Untuk `paymentMethod: "PG"`, `paymentUrl` berisi URL redirect ke halaman pembayaran Xendit.

### Error Responses

| Status | Code             | Condition                                          |
| ------ | ---------------- | -------------------------------------------------- |
| 400    | PRICE_MISMATCH   | `totalAmount` tidak sesuai kalkulasi server        |
| 400    | VALIDATION_ERROR | Body tidak valid (printQty < 1, format salah, dll) |
| 401    | UNAUTHORIZED     | Device token missing/invalid                       |
| 404    | NOT_FOUND        | Kiosk, template not found, or template inactive    |

---

## POST `/kiosk/transactions/:id/confirm-cash`

Konfirmasi pembayaran tunai (CASH). Mengubah status transaksi ke PAID dan mengkreditkan wallet owner secara atomik dalam satu database transaction.

### Request

**Headers:**

```
Authorization: Bearer <deviceToken>
```

**URL Params:**

| Param | Type   | Validation | Description  |
| ----- | ------ | ---------- | ------------ |
| `id`  | string | UUID       | ID transaksi |

No body required.

### Response — 200 OK

```json
{
  "data": {
    "transaction": {
      "id": "uuid",
      "status": "PAID",
      "paidAt": "2025-01-01T12:00:00.000Z",
      "...": "full transaction object"
    }
  }
}
```

### Idempotency

Jika transaksi sudah berstatus `PAID`, endpoint mengembalikan transaksi yang ada tanpa perubahan (200 OK).

### Error Responses

| Status | Code                 | Condition                                         |
| ------ | -------------------- | ------------------------------------------------- |
| 401    | UNAUTHORIZED         | Device token missing/invalid                      |
| 404    | NOT_FOUND            | Transaction not found or kioskId/ownerId mismatch |
| 422    | UNPROCESSABLE_ENTITY | PG transaction (use check-payment instead)        |
| 422    | UNPROCESSABLE_ENTITY | Transaction status bukan PENDING atau PAID        |

---

## POST `/kiosk/transactions/:id/check-payment`

Cek status pembayaran PG (payment gateway). Polling endpoint yang dipanggil kiosk untuk mengecek apakah pembayaran sudah settle, expire, atau masih pending.

### Request

**Headers:**

```
Authorization: Bearer <deviceToken>
```

**URL Params:**

| Param | Type   | Validation | Description  |
| ----- | ------ | ---------- | ------------ |
| `id`  | string | UUID       | ID transaksi |

No body required.

### Response — 200 OK

```json
{
  "data": {
    "status": "PAID"
  }
}
```

| Status Value | PG Status            | Action                                         |
| ------------ | -------------------- | ---------------------------------------------- |
| `PAID`       | `settlement`         | Update status→PAID, credit wallet (atomic UoW) |
| `FAILED`     | `expire` / `cancel`  | Update status→FAILED                           |
| `PENDING`    | `pending` / PG error | No state change                                |

### Idempotency

- Jika transaksi sudah `PAID`, langsung return `{ status: "PAID" }` tanpa memanggil PG.
- Jika transaksi sudah `FAILED`, langsung return `{ status: "FAILED" }` tanpa memanggil PG.

### Timeout Handling

Jika PG call gagal/timeout (5 detik), endpoint return `{ status: "PENDING" }` tanpa mengubah state transaksi.

### Error Responses

| Status | Code                 | Condition                                     |
| ------ | -------------------- | --------------------------------------------- |
| 401    | UNAUTHORIZED         | Device token missing/invalid                  |
| 404    | NOT_FOUND            | Transaction not found or kioskId mismatch     |
| 422    | UNPROCESSABLE_ENTITY | Non-PG transaction (use confirm-cash instead) |

---

## POST `/kiosk/sessions`

Upload foto hasil sesi ke storage dan membuat record session. Endpoint menggunakan `multipart/form-data`.

### Request

**Headers:**

```
Authorization: Bearer <deviceToken>
Content-Type: multipart/form-data
```

**Multipart Fields:**

| Field           | Type   | Validation                        | Required |
| --------------- | ------ | --------------------------------- | -------- |
| `transactionId` | string | UUID, harus terisi                | Yes      |
| `file`          | file   | image/jpeg, image/png, image/webp | Yes      |

**File Constraints:**

- Max size: **10 MB**
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

### Response — 201 Created

```json
{
  "data": {
    "session": {
      "id": "uuid",
      "transactionId": "uuid",
      "resultImageUrl": "https://storage.supabase.co/sessions/tx-1/result.jpeg",
      "deletionScheduledAt": "2025-02-01T00:00:00.000Z",
      "createdAt": "2025-01-01T12:00:00.000Z"
    },
    "downloadUrl": "https://storage.supabase.co/sessions/tx-1/result.jpeg"
  }
}
```

| Field                         | Type    | Description                               |
| ----------------------------- | ------- | ----------------------------------------- |
| `session.id`                  | string  | UUID session                              |
| `session.transactionId`       | string  | UUID transaksi terkait                    |
| `session.resultImageUrl`      | string  | URL file di storage                       |
| `session.deletionScheduledAt` | string? | Tanggal auto-delete (30 hari dari upload) |
| `downloadUrl`                 | string  | URL download langsung                     |

### Error Responses

| Status | Code                 | Condition                                       |
| ------ | -------------------- | ----------------------------------------------- |
| 400    | VALIDATION_ERROR     | File missing, unsupported type, or exceeds 10MB |
| 401    | UNAUTHORIZED         | Device token missing/invalid                    |
| 404    | NOT_FOUND            | Transaction not found or kioskId mismatch       |
| 409    | CONFLICT             | Session already exists for this transaction     |
| 422    | UNPROCESSABLE_ENTITY | Transaction not PAID or hasDigitalCopy is false |
