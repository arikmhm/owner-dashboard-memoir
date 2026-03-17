# Webhook API — Endpoint Documentation

> **Base URL:** `/api/v1/webhooks`
> **Auth Required:** Tidak — verifikasi via `x-callback-token` header dari Xendit

Endpoint ini menerima callback notifikasi dari Xendit payment gateway. Tidak menggunakan JWT atau device token — autentikasi dilakukan via `x-callback-token` header yang dibandingkan dengan token yang dikonfigurasi di environment variable.

---

## POST `/webhooks/xendit`

Menerima webhook callback dari Xendit Payment Request v3 API untuk update status pembayaran secara otomatis. Semua pembayaran (kiosk + subscription) menggunakan QRIS via v3 API. Routing berdasarkan `data.reference_id` prefix:
- `MEM-` → kiosk transaction
- `SUB-` → subscription invoice

### Request

**Headers:**

```
x-callback-token: <xendit_webhook_token>
Content-Type: application/json
```

**Body:**

```json
{
  "event": "payment.capture",
  "business_id": "5f27a14a9bf05c73dd040bc8",
  "created": "2026-03-15T12:00:00.000Z",
  "data": {
    "type": "PAY",
    "status": "SUCCEEDED",
    "country": "ID",
    "currency": "IDR",
    "payment_id": "py-abc123",
    "channel_code": "QRIS",
    "reference_id": "MEM-1710499200000-a1b2c3",
    "request_amount": 50000,
    "capture_method": "AUTOMATIC",
    "captures": [
      {
        "capture_id": "cptr-xyz789",
        "capture_amount": 50000,
        "capture_timestamp": "2026-03-15T12:00:30.000Z"
      }
    ],
    "payment_request_id": "pr-def456"
  }
}
```

| Field                    | Type     | Validation | Required |
| ------------------------ | -------- | ---------- | -------- |
| `event`                  | string   |            | Yes      |
| `business_id`            | string   |            | Yes      |
| `created`                | string   | ISO 8601   | Yes      |
| `data.type`              | string   |            | Yes      |
| `data.status`            | string   | `SUCCEEDED` / `FAILED` / `EXPIRED` | Yes |
| `data.country`           | string   |            | Yes      |
| `data.currency`          | string   |            | Yes      |
| `data.payment_id`        | string   |            | Yes      |
| `data.channel_code`      | string   |            | Yes      |
| `data.reference_id`      | string   | Matches `orderId` di DB | Yes |
| `data.request_amount`    | number   |            | Yes      |
| `data.capture_method`    | string   |            | No       |
| `data.captures`          | array    |            | No       |
| `data.payment_request_id`| string   |            | No       |

### Response — 200 OK

```json
{
  "status": "ok"
}
```

### Settlement Logic

Berdasarkan `data.reference_id` prefix dan `data.status`:

| Prefix | Status      | Action                                                              |
| ------ | ----------- | ------------------------------------------------------------------- |
| `MEM-` | `SUCCEEDED` | Transaction → `PAID`, credit wallet owner, buat wallet mutation     |
| `MEM-` | `FAILED` / `EXPIRED` | Transaction → `FAILED`                                  |
| `SUB-` | `SUCCEEDED` / `PAID` / `SETTLED` | Invoice → `PAID`, subscription → `ACTIVE`, cancel subscription lama |
| `SUB-` | `FAILED` / `EXPIRED` | Invoice → `FAILED`, subscription → `EXPIRED`            |

### Idempotency

- Jika transaksi/invoice sudah berstatus `PAID` atau `FAILED`, webhook diproses tanpa error (200 OK) tetapi tidak ada state change.
- Prefix `reference_id` yang tidak dikenal diabaikan (200 OK).

### Error Responses

| Status | Code           | Condition                           |
| ------ | -------------- | ----------------------------------- |
| 401    | `UNAUTHORIZED` | `x-callback-token` tidak valid      |

---

> **Konfigurasi Xendit Dashboard:**
> - Aktifkan **"Status pembayaran"** → URL: `https://<domain>/api/v1/webhooks/xendit`
> - Token verifikasi (`x-callback-token`) dikonfigurasi via environment variable `XENDIT_WEBHOOK_TOKEN`.
