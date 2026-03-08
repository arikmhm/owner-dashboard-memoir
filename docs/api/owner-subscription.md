# Owner Subscription API — Endpoint Documentation

> **Base URL:** `/api/v1/owner`
> **Auth Required:** JWT Bearer — must have role `studio_owner`

All owner subscription endpoints require a valid JWT access token in the `Authorization: Bearer <accessToken>` header. The token is verified by the `verifyJwt` plugin, and the `preHandler` hook enforces `studio_owner` role.

---

## Plans

### GET `/owner/subscription/plans`

Mengambil daftar subscription plans yang tersedia (aktif) untuk dipilih owner.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
```

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Basic",
      "description": "Up to 3 kiosks",
      "maxKiosks": 3,
      "priceMonthly": 99000,
      "priceYearly": 999000
    },
    {
      "id": "uuid",
      "name": "Pro",
      "description": "Up to 10 kiosks",
      "maxKiosks": 10,
      "priceMonthly": 199000,
      "priceYearly": 1999000
    }
  ]
}
```

**Notes:**

- Hanya menampilkan plans dengan `isActive = true`.
- Field internal (`isActive`, `createdAt`, `updatedAt`) tidak diekspos ke owner.
- Endpoint ini tidak memerlukan subscription aktif — owner yang belum subscribe dapat melihat daftar plans.

---

## Subscription

### GET `/owner/subscription`

Mengambil data subscription aktif milik owner beserta computed status (lazy computation).

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
```

#### Response — 200 OK

```json
{
  "data": {
    "subscription": {
      "id": "uuid",
      "userId": "uuid",
      "planId": "uuid",
      "billingPeriod": "MONTHLY",
      "status": "ACTIVE",
      "pricePaid": 99000,
      "currentPeriodStart": "2024-01-15T10:00:00.000Z",
      "currentPeriodEnd": "2024-02-15T10:00:00.000Z",
      "previousPlanId": null,
      "cancelledAt": null,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    "subscriptionStatus": "ACTIVE",
    "gracePeriodDaysRemaining": 0,
    "pendingUpgrade": null
  }
}
```

**Notes:**

- `subscription` is `null` when owner has never subscribed. Prioritizes ACTIVE subscription via `findActiveByUserId`.
- `subscriptionStatus` is computed lazily by `SubscriptionChecker`:
  - `ACTIVE` — now ≤ period_end
  - `PENDING_PAYMENT` — subscription created but payment not yet settled
  - `GRACE_PERIOD` — now > period_end but within grace_period_days (from platform_config)
  - `EXPIRED` — after grace period or no subscription
  - `CANCELLED` — explicitly cancelled
- `gracePeriodDaysRemaining` only shows a value > 0 when `subscriptionStatus === "GRACE_PERIOD"`, otherwise always 0.
- Grace period defaults to 7 days if `grace_period_days` config is missing or invalid.
- `pendingUpgrade` — contains the subscription object with `PENDING_PAYMENT` status if the owner has an in-flight upgrade. `null` if no pending upgrade. This allows the frontend to show "upgrade pending" UI while the current plan remains active.

---

### POST `/owner/subscription`

Membuat subscription baru atau upgrade plan. Selalu membuat **subscription row baru** dengan status `PENDING_PAYMENT`. Subscription ACTIVE yang sudah ada **tidak disentuh** sampai pembayaran dikonfirmasi via check-payment.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body:**

| Field           | Type   | Required | Description             |
| --------------- | ------ | -------- | ----------------------- |
| `planId`        | string | Yes      | UUID plan yang dipilih  |
| `billingPeriod` | string | Yes      | `MONTHLY` atau `YEARLY` |

```json
{
  "planId": "uuid",
  "billingPeriod": "MONTHLY"
}
```

#### Response — 201 Created

```json
{
  "data": {
    "subscription": {
      "id": "uuid",
      "userId": "uuid",
      "planId": "uuid",
      "billingPeriod": "MONTHLY",
      "status": "PENDING_PAYMENT",
      "pricePaid": 99000,
      "currentPeriodStart": "2024-01-15T10:00:00.000Z",
      "currentPeriodEnd": "2024-02-15T10:00:00.000Z",
      "previousPlanId": null,
      "cancelledAt": null,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    "invoice": {
      "id": "uuid",
      "subscriptionId": "uuid",
      "userId": "uuid",
      "amount": 99000,
      "billingPeriod": "MONTHLY",
      "status": "PENDING",
      "paymentMethod": "PG",
      "paymentUrl": "https://pay.xendit.co/...",
      "orderId": "SUB-1705312200000-a1b2c3",
      "periodStart": "2024-01-15T10:00:00.000Z",
      "periodEnd": "2024-02-15T10:00:00.000Z",
      "paidAt": null,
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

#### Error Responses

| Status | Code        | Description                                                                             |
| ------ | ----------- | --------------------------------------------------------------------------------------- |
| 404    | `NOT_FOUND` | Plan tidak ditemukan atau sudah inactive                                                |
| 409    | `CONFLICT`  | Sudah subscribe ke plan + billing period yang sama, atau sudah ada pending subscription |

**Business Rules:**

- Subscription selalu dibuat sebagai **row baru** dengan status `PENDING_PAYMENT` — TIDAK langsung ACTIVE dan TIDAK mengubah subscription ACTIVE yang sudah ada.
- **Safe upgrade:** Saat owner upgrade plan, subscription ACTIVE lama tetap berjalan. Kiosk tetap beroperasi selama pembayaran plan baru belum selesai.
- Hanya boleh ada **1 pending subscription** per owner. Jika sudah ada PENDING_PAYMENT, ditolak dengan 409 Conflict.
- Re-subscribe ke plan+period yang sama (saat sudah ACTIVE) ditolak dengan 409 Conflict.
- **Saat pembayaran berhasil** (via check-payment): subscription baru diaktifkan (`ACTIVE`), subscription lama di-cancel (`CANCELLED`).
- **Saat pembayaran gagal/expire** (via check-payment): subscription baru di-expire (`EXPIRED`), subscription lama tetap `ACTIVE`.
- Price snapshot diambil dari plan saat ini (immutable setelah subscribe).
- PG call dilakukan setelah transaction commit. Jika PG gagal, subscription tetap `PENDING_PAYMENT` dan client bisa retry via check-payment.
- Operasi DB di-wrap dalam UnitOfWork transaction untuk atomicity.
- **Payment Redirect:** Jika env `FRONTEND_URL` di-set, Xendit invoice akan include `success_redirect_url` yang mengarahkan user kembali ke `${FRONTEND_URL}/onboarding?invoice_id=${invoiceId}` setelah pembayaran berhasil. `invoice_id` menggunakan internal invoice UUID (bukan orderId) sehingga frontend dapat langsung memanggil `POST /subscription/invoices/:id/check-payment` tanpa lookup tambahan. Tanpa `FRONTEND_URL`, user tetap di halaman sukses Xendit.

---

## Invoices

### GET `/owner/subscription/invoices`

Mengambil daftar invoice subscription milik owner.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Query Parameters:**

| Parameter | Type   | Required | Description                              |
| --------- | ------ | -------- | ---------------------------------------- |
| `page`    | number | No       | Halaman (default: 1, min: 1)             |
| `limit`   | number | No       | Item per halaman (default: 20, max: 100) |

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "subscriptionId": "uuid",
      "userId": "uuid",
      "amount": 99000,
      "billingPeriod": "MONTHLY",
      "status": "PAID",
      "paymentMethod": "PG",
      "paymentUrl": "https://pay.xendit.co/...",
      "orderId": "SUB-1705312200000-a1b2c3",
      "periodStart": "2024-01-15T10:00:00.000Z",
      "periodEnd": "2024-02-15T10:00:00.000Z",
      "paidAt": "2024-01-15T10:05:00.000Z",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

---

### POST `/owner/subscription/invoices/:id/check-payment`

Cek status pembayaran invoice ke payment gateway dan update status secara atomik.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Path Parameters:**

| Parameter | Type   | Required | Description  |
| --------- | ------ | -------- | ------------ |
| `id`      | string | Yes      | UUID invoice |

#### Response — 200 OK

```json
{
  "data": {
    "status": "PAID",
    "subscription": {
      "id": "uuid",
      "userId": "uuid",
      "planId": "uuid",
      "billingPeriod": "MONTHLY",
      "status": "ACTIVE",
      "pricePaid": 99000,
      "currentPeriodStart": "2024-01-15T10:00:00.000Z",
      "currentPeriodEnd": "2024-02-15T10:00:00.000Z",
      "previousPlanId": null,
      "cancelledAt": null,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:05:00.000Z"
    }
  }
}
```

**Possible `status` values:**

| Status    | Description                                                    |
| --------- | -------------------------------------------------------------- |
| `PAID`    | Pembayaran berhasil — subscription diaktifkan ke `ACTIVE`      |
| `PENDING` | Pembayaran masih pending atau PG tidak tersedia                |
| `FAILED`  | Pembayaran gagal/expired — subscription di-revert ke `EXPIRED` |

**Notes:**

- `subscription` field hanya terisi jika status `PAID`.
- Idempotent: invoice yang sudah `PAID` langsung return `PAID` tanpa call PG.
- Invoice yang sudah `FAILED` langsung return `FAILED` tanpa call PG.
- Jika PG throw error → return `PENDING`, no state change (safe retry).
- Settlement di-wrap dalam UnitOfWork transaction: invoice `PAID` + subscription `ACTIVE` atomik.
- Expire/cancel di-wrap dalam UnitOfWork transaction: invoice `FAILED` + subscription `EXPIRED` atomik.

#### Error Responses

| Status | Code        | Description                                   |
| ------ | ----------- | --------------------------------------------- |
| 404    | `NOT_FOUND` | Invoice tidak ditemukan atau bukan milik user |
