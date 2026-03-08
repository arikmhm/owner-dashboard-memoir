# Owner Finance API — Endpoint Documentation

> **Base URL:** `/api/v1/owner`
> **Auth Required:** JWT Bearer — must have role `studio_owner`

All owner finance endpoints require a valid JWT access token in the `Authorization: Bearer <accessToken>` header. The token is verified by the `verifyJwt` plugin, and the `preHandler` hook enforces `studio_owner` role.

---

## Transactions

### GET `/owner/transactions`

Mengambil daftar transaksi milik owner dengan filtering dan pagination.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Query Parameters:**

| Parameter       | Type   | Required | Description                                      |
| --------------- | ------ | -------- | ------------------------------------------------ |
| `kioskId`       | string | No       | UUID kiosk untuk filter                          |
| `status`        | string | No       | Filter status: `PENDING`, `PAID`, `FAILED`       |
| `paymentMethod` | string | No       | Filter metode bayar: `PG`, `CASH`, `STATIC_QRIS` |
| `startDate`     | string | No       | ISO 8601 datetime — batas awal (inclusive, `>=`) |
| `endDate`       | string | No       | ISO 8601 datetime — batas akhir (exclusive, `<`) |
| `search`        | string | No       | Search by orderId (max 100 chars)                |
| `page`          | number | No       | Halaman (default: 1, min: 1)                     |
| `limit`         | number | No       | Item per halaman (default: 20, max: 100)         |

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

| Field                     | Type        | Description                            |
| ------------------------- | ----------- | -------------------------------------- |
| `id`                      | string      | UUID transaksi                         |
| `ownerId`                 | string      | UUID owner                             |
| `kioskId`                 | string      | UUID kiosk                             |
| `templateId`              | string      | UUID template yang digunakan           |
| `orderId`                 | string      | Order ID unik                          |
| `status`                  | string      | `PENDING` / `PAID` / `FAILED`          |
| `paymentMethod`           | string      | `PG` / `CASH` / `STATIC_QRIS`          |
| `paymentUrl`              | string/null | URL payment gateway (jika PG)          |
| `printQty`                | number      | Jumlah cetak                           |
| `hasDigitalCopy`          | boolean     | Apakah ada salinan digital             |
| `appliedBasePrice`        | number      | Harga dasar sesi saat transaksi (Rp)   |
| `appliedExtraPrintPrice`  | number      | Harga extra print saat transaksi (Rp)  |
| `appliedDigitalCopyPrice` | number      | Harga digital copy saat transaksi (Rp) |
| `totalAmount`             | number      | Total pembayaran (Rp)                  |
| `createdAt`               | string      | ISO 8601 waktu dibuat                  |
| `paidAt`                  | string/null | ISO 8601 waktu bayar (null jika belum) |

---

## Wallet

### GET `/owner/wallet`

Mengambil saldo wallet dan riwayat mutasi milik owner.

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
  "data": {
    "balance": 250000,
    "mutations": [
      {
        "id": "uuid",
        "userId": "uuid",
        "transactionRefId": "uuid",
        "withdrawalRefId": null,
        "type": "CREDIT",
        "category": "TRANSACTION_INCOME",
        "amount": 25000,
        "currentBalanceSnapshot": 250000,
        "description": null,
        "createdAt": "2024-01-15T10:31:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 15
  }
}
```

| Field                                | Type        | Description                                        |
| ------------------------------------ | ----------- | -------------------------------------------------- |
| `balance`                            | number      | Saldo wallet saat ini (Rp)                         |
| `mutations[].id`                     | string      | UUID mutasi                                        |
| `mutations[].userId`                 | string      | UUID pemilik wallet                                |
| `mutations[].transactionRefId`       | string/null | Referensi ke transaksi (jika income)               |
| `mutations[].withdrawalRefId`        | string/null | Referensi ke withdrawal (jika debit)               |
| `mutations[].type`                   | string      | `CREDIT` / `DEBIT`                                 |
| `mutations[].category`               | string      | `TRANSACTION_INCOME` / `WITHDRAWAL` / `ADJUSTMENT` |
| `mutations[].amount`                 | number      | Jumlah mutasi (Rp)                                 |
| `mutations[].currentBalanceSnapshot` | number      | Snapshot saldo setelah mutasi (Rp)                 |
| `mutations[].description`            | string/null | Keterangan opsional                                |
| `mutations[].createdAt`              | string      | ISO 8601 waktu mutasi                              |

---

## Withdrawals

### POST `/owner/withdrawals`

Mengajukan permintaan penarikan saldo (withdrawal). Hanya boleh ada **1 withdrawal PENDING** per owner pada satu waktu.

#### Business Rules

- **Minimum amount**: Diambil dari `platform_config` key `minimum_withdrawal_amount`. Jika config belum diisi, API mengembalikan error 500.
- **Single pending**: Max 1 withdrawal PENDING per owner. Pengajuan kedua ditolak 409.
- **Balance check**: Saldo wallet harus >= jumlah penarikan.
- **Atomic**: Pengecekan pending & balance dilakukan dalam database transaction dengan row-level lock (`SELECT FOR UPDATE`) pada user.
- **No immediate debit**: Wallet tidak dipotong saat request — hanya saat admin approve.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Body (JSON):**

```json
{
  "amount": 50000,
  "bankName": "BCA",
  "bankAccountNumber": "1234567890",
  "bankAccountName": "Studio Owner"
}
```

| Field               | Type   | Required | Validation                         |
| ------------------- | ------ | -------- | ---------------------------------- |
| `amount`            | number | Yes      | Integer, positif (>0)              |
| `bankName`          | string | Yes      | Min 1, max 100 chars, auto-trimmed |
| `bankAccountNumber` | string | Yes      | Min 1, max 50 chars, auto-trimmed  |
| `bankAccountName`   | string | Yes      | Min 1, max 200 chars, auto-trimmed |

#### Response — 201 Created

```json
{
  "data": {
    "withdrawal": {
      "id": "uuid",
      "userId": "uuid",
      "amount": 50000,
      "status": "PENDING",
      "bankName": "BCA",
      "bankAccountNumber": "1234567890",
      "bankAccountName": "Studio Owner",
      "processedBy": null,
      "processedAt": null,
      "rejectionNote": null,
      "walletMutationId": null,
      "createdAt": "2024-01-20T08:00:00.000Z",
      "updatedAt": "2024-01-20T08:00:00.000Z"
    }
  }
}
```

#### Error Responses

| Status | Code                        | Description                                    |
| ------ | --------------------------- | ---------------------------------------------- |
| 400    | `BELOW_MINIMUM`             | Amount di bawah minimum withdrawal             |
| 400    | `INSUFFICIENT_BALANCE`      | Saldo wallet tidak mencukupi                   |
| 409    | `PENDING_WITHDRAWAL_EXISTS` | Sudah ada withdrawal PENDING                   |
| 404    | `NOT_FOUND`                 | User tidak ditemukan                           |
| 500    | `INTERNAL_SERVER_ERROR`     | Config `minimum_withdrawal_amount` belum diisi |

---

### GET `/owner/withdrawals`

Mengambil daftar riwayat withdrawal milik owner.

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
      "userId": "uuid",
      "amount": 50000,
      "status": "PENDING",
      "bankName": "BCA",
      "bankAccountNumber": "1234567890",
      "bankAccountName": "Studio Owner",
      "processedBy": null,
      "processedAt": null,
      "rejectionNote": null,
      "walletMutationId": null,
      "createdAt": "2024-01-20T08:00:00.000Z",
      "updatedAt": "2024-01-20T08:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3
  }
}
```

| Field               | Type        | Description                          |
| ------------------- | ----------- | ------------------------------------ |
| `id`                | string      | UUID withdrawal                      |
| `userId`            | string      | UUID pemilik                         |
| `amount`            | number      | Jumlah penarikan (Rp)                |
| `status`            | string      | `PENDING` / `PROCESSED` / `REJECTED` |
| `bankName`          | string      | Nama bank tujuan                     |
| `bankAccountNumber` | string      | Nomor rekening                       |
| `bankAccountName`   | string      | Nama pemilik rekening                |
| `processedBy`       | string/null | UUID admin yang memproses            |
| `processedAt`       | string/null | ISO 8601 waktu diproses              |
| `rejectionNote`     | string/null | Catatan penolakan (jika rejected)    |
| `walletMutationId`  | string/null | UUID wallet mutation (jika approved) |
| `createdAt`         | string      | ISO 8601 waktu dibuat                |
| `updatedAt`         | string      | ISO 8601 waktu terakhir diubah       |
