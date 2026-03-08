# Admin Platform API — Endpoint Documentation

> **Base URL:** `/api/v1/admin`
> **Auth Required:** JWT Bearer — must have role `platform_admin`

All admin endpoints require a valid JWT access token in the `Authorization: Bearer <accessToken>` header. The token is verified by the `verifyJwt` plugin, and the `preHandler` hook enforces `platform_admin` role.

---

## Owners

### GET `/admin/owners`

Mengambil daftar studio owner.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Query Parameters:**

| Parameter        | Type   | Required | Description                                       |
| ---------------- | ------ | -------- | ------------------------------------------------- |
| `includeDeleted` | string | No       | `"true"` untuk menampilkan owner yang di-soft-delete |

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "owner@studio.com",
      "role": "studio_owner",
      "walletBalance": 150000,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z",
      "deletedAt": null
    }
  ]
}
```

---

### POST `/admin/owners`

Membuat akun studio owner baru.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body:**

| Field      | Type   | Required | Validation                       |
| ---------- | ------ | -------- | -------------------------------- |
| `email`    | string | Yes      | Valid email, auto trim+lowercase |
| `password` | string | Yes      | Min 8 chars, max 128 chars       |

```json
{
  "email": "newowner@studio.com",
  "password": "securePass123"
}
```

#### Response — 201 Created

```json
{
  "data": {
    "id": "uuid",
    "email": "newowner@studio.com",
    "role": "studio_owner",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Errors

| Status | Condition            |
| ------ | -------------------- |
| 409    | Email already in use |

---

### PATCH `/admin/owners/:id`

Update email atau soft-delete/restore owner.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Path Parameters:**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `id`      | string | Yes      | Owner UUID  |

**Body:**

| Field      | Type    | Required | Description                                        |
| ---------- | ------- | -------- | -------------------------------------------------- |
| `email`    | string  | No       | Email baru, auto trim+lowercase                    |
| `isActive` | boolean | No       | `false` = soft-delete, `true` = restore            |

> **Behaviour Notes:**
> - `isActive: false` — soft-deletes the owner. If `email` is also provided, email is updated first.
> - `isActive: true` — restores a soft-deleted owner. Other fields are ignored.
> - Only `email` — updates the email address.

```json
{
  "isActive": false
}
```

#### Response — 200 OK

```json
{
  "data": {
    "id": "uuid",
    "email": "owner@studio.com",
    "role": "studio_owner",
    "walletBalance": 150000,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:40:00.000Z",
    "deletedAt": "2024-01-15T10:40:00.000Z"
  }
}
```

#### Errors

| Status | Condition            |
| ------ | -------------------- |
| 404    | Owner not found      |
| 409    | Email already in use |

---

## Subscription Plans

### GET `/admin/subscription-plans`

Mengambil semua subscription plan.

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Basic",
      "description": "Basic plan",
      "maxKiosks": 3,
      "priceMonthly": 99000,
      "priceYearly": 999000,
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### POST `/admin/subscription-plans`

Membuat subscription plan baru.

#### Request

**Body:**

| Field          | Type    | Required | Validation                |
| -------------- | ------- | -------- | ------------------------- |
| `name`         | string  | Yes      | Min 1 char, unique        |
| `description`  | string  | No       | Nullable                  |
| `maxKiosks`    | number  | Yes      | Positive integer          |
| `priceMonthly` | number  | Yes      | Non-negative integer (Rp) |
| `priceYearly`  | number  | Yes      | Non-negative integer (Rp) |
| `isActive`     | boolean | No       | Default: `true`           |

```json
{
  "name": "Pro",
  "description": "Professional plan",
  "maxKiosks": 10,
  "priceMonthly": 199000,
  "priceYearly": 1999000
}
```

#### Response — 201 Created

```json
{
  "data": {
    "id": "uuid",
    "name": "Pro",
    "description": "Professional plan",
    "maxKiosks": 10,
    "priceMonthly": 199000,
    "priceYearly": 1999000,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Errors

| Status | Condition                  |
| ------ | -------------------------- |
| 409    | Plan name already in use   |

---

### PATCH `/admin/subscription-plans/:id`

Update subscription plan.

#### Request

**Body:**

| Field          | Type    | Required | Validation                |
| -------------- | ------- | -------- | ------------------------- |
| `name`         | string  | No       | Min 1 char, unique        |
| `description`  | string  | No       | Nullable                  |
| `maxKiosks`    | number  | No       | Positive integer          |
| `priceMonthly` | number  | No       | Non-negative integer (Rp) |
| `priceYearly`  | number  | No       | Non-negative integer (Rp) |
| `isActive`     | boolean | No       | —                         |

> **Note:** Sending an empty body `{}` returns the current plan without any DB update.

#### Response — 200 OK

Same structure as create response.

#### Errors

| Status | Condition                    |
| ------ | ---------------------------- |
| 404    | Subscription plan not found  |
| 409    | Plan name already in use     |

---

## Platform Config

### GET `/admin/platform-config`

Mengambil semua konfigurasi platform.

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "key": "grace_period_days",
      "value": "7",
      "description": null,
      "updatedBy": "admin-uuid",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### PATCH `/admin/platform-config/:id`

Update nilai konfigurasi platform.

#### Request

**Body:**

| Field   | Type   | Required | Validation |
| ------- | ------ | -------- | ---------- |
| `value` | string | Yes      | Min 1 char |

```json
{
  "value": "14"
}
```

#### Response — 200 OK

```json
{
  "data": {
    "id": "uuid",
    "key": "grace_period_days",
    "value": "14",
    "description": null,
    "updatedBy": "admin-uuid",
    "updatedAt": "2024-01-15T10:40:00.000Z"
  }
}
```

#### Errors

| Status | Condition              |
| ------ | ---------------------- |
| 404    | Platform config not found |

---

## Withdrawals

### GET `/admin/withdrawals`

Mengambil daftar withdrawal dari semua owner dengan filtering dan pagination.

#### Request

**Query Parameters:**

| Parameter | Type   | Required | Description                                    |
| --------- | ------ | -------- | ---------------------------------------------- |
| `status`  | string | No       | `PENDING`, `PROCESSED`, `REJECTED`             |
| `page`    | number | No       | Default: 1, min: 1                             |
| `limit`   | number | No       | Default: 20, max: 100                          |

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "amount": 50000,
      "status": "PENDING",
      "bankName": "BCA",
      "bankAccountNumber": "1234567890",
      "bankAccountName": "Owner Name",
      "processedBy": null,
      "processedAt": null,
      "rejectionNote": null,
      "walletMutationId": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

---

### POST `/admin/withdrawals/:id/approve`

Menyetujui withdrawal. Proses atomic: debit wallet → update status → catat mutasi.

#### Request

**Path Parameters:**

| Parameter | Type   | Required | Description     |
| --------- | ------ | -------- | --------------- |
| `id`      | string | Yes      | Withdrawal UUID |

#### Response — 200 OK

```json
{
  "data": {
    "withdrawal": {
      "id": "uuid",
      "userId": "uuid",
      "amount": 50000,
      "status": "PROCESSED",
      "bankName": "BCA",
      "bankAccountNumber": "1234567890",
      "bankAccountName": "Owner Name",
      "processedBy": "admin-uuid",
      "processedAt": "2024-01-15T10:40:00.000Z",
      "rejectionNote": null,
      "walletMutationId": "mutation-uuid",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:40:00.000Z"
    }
  }
}
```

#### Errors

| Status | Condition                           |
| ------ | ----------------------------------- |
| 404    | Withdrawal not found                |
| 422    | Withdrawal is not pending           |
| 422    | Insufficient wallet balance         |

---

### POST `/admin/withdrawals/:id/reject`

Menolak withdrawal dengan catatan alasan.

#### Request

**Body:**

| Field           | Type   | Required | Validation |
| --------------- | ------ | -------- | ---------- |
| `rejectionNote` | string | Yes      | Min 1 char |

```json
{
  "rejectionNote": "Nomor rekening tidak valid"
}
```

#### Response — 200 OK

```json
{
  "data": {
    "withdrawal": {
      "id": "uuid",
      "userId": "uuid",
      "amount": 50000,
      "status": "REJECTED",
      "bankName": "BCA",
      "bankAccountNumber": "1234567890",
      "bankAccountName": "Owner Name",
      "processedBy": "admin-uuid",
      "processedAt": "2024-01-15T10:40:00.000Z",
      "rejectionNote": "Nomor rekening tidak valid",
      "walletMutationId": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:40:00.000Z"
    }
  }
}
```

#### Errors

| Status | Condition                 |
| ------ | ------------------------- |
| 404    | Withdrawal not found      |
| 422    | Withdrawal is not pending |

---

## Transactions

### GET `/admin/transactions`

Mengambil daftar transaksi dari semua owner dengan filtering dan pagination.

#### Request

**Query Parameters:**

| Parameter       | Type   | Required | Description                                      |
| --------------- | ------ | -------- | ------------------------------------------------ |
| `ownerId`       | string | No       | UUID owner untuk filter                          |
| `kioskId`       | string | No       | UUID kiosk untuk filter                          |
| `status`        | string | No       | `PENDING`, `PAID`, `FAILED`                      |
| `paymentMethod` | string | No       | `PG`, `CASH`, `STATIC_QRIS`                     |
| `startDate`     | string | No       | ISO 8601 datetime (inclusive, `>=`)              |
| `endDate`       | string | No       | ISO 8601 datetime (exclusive, `<`)               |
| `search`        | string | No       | Search by orderId (auto-trimmed)                 |
| `page`          | number | No       | Default: 1, min: 1                               |
| `limit`         | number | No       | Default: 20, max: 100 (clamped server-side)      |

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "ownerId": "uuid",
      "kioskId": "uuid",
      "templateId": "uuid",
      "orderId": "MEM-123-abc",
      "status": "PAID",
      "paymentMethod": "CASH",
      "paymentUrl": null,
      "printQty": 1,
      "hasDigitalCopy": false,
      "appliedBasePrice": 25000,
      "appliedExtraPrintPrice": 5000,
      "appliedDigitalCopyPrice": 10000,
      "totalAmount": 25000,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "paidAt": "2024-01-15T10:31:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```
