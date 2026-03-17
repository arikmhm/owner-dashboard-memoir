# Owner API — Endpoint Documentation

> **Base URL:** `/api/v1/owner`
> **Auth Required:** JWT Bearer — must have role `studio_owner`

All owner endpoints require a valid JWT access token in the `Authorization: Bearer <accessToken>` header. The token is verified by the `verifyJwt` plugin, and the `preHandler` hook enforces `studio_owner` role.

---

## Kiosks

### GET `/owner/kiosks`

Mengambil daftar semua kiosk milik owner.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
```

No body required.

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Booth A",
      "isActive": true,
      "priceBaseSession": 25000,
      "pricePerExtraPrint": 5000,
      "priceDigitalCopy": 10000
    }
  ]
}
```

| Field                | Type    | Description                |
| -------------------- | ------- | -------------------------- |
| `id`                 | string  | UUID kiosk                 |
| `name`               | string  | Nama kiosk                 |
| `isActive`           | boolean | Status aktif kiosk         |
| `priceBaseSession`   | number  | Harga dasar per sesi (Rp)  |
| `pricePerExtraPrint` | number  | Harga per extra print (Rp) |
| `priceDigitalCopy`   | number  | Harga digital copy (Rp)    |

> **Note:** `pairingCode` is excluded from the list response for security.

#### Error Responses

| Status | Code         | Condition             |
| ------ | ------------ | --------------------- |
| 401    | UNAUTHORIZED | Token missing/invalid |
| 403    | FORBIDDEN    | Not a studio_owner    |

---

### POST `/owner/kiosks`

Membuat kiosk baru. Memerlukan subscription aktif dan kuota kiosk belum penuh.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body:**

```json
{
  "name": "Booth A",
  "priceBaseSession": 30000,
  "pricePerExtraPrint": 7000,
  "priceDigitalCopy": 15000,
  "isActive": true
}
```

| Field                | Type    | Required | Default | Validation            |
| -------------------- | ------- | -------- | ------- | --------------------- |
| `name`               | string  | Yes      | —       | min 1 char            |
| `priceBaseSession`   | number  | No       | 25000   | integer, non-negative |
| `pricePerExtraPrint` | number  | No       | 5000    | integer, non-negative |
| `priceDigitalCopy`   | number  | No       | 10000   | integer, non-negative |
| `isActive`           | boolean | No       | true    | —                     |

#### Response — 201 Created

```json
{
  "data": {
    "kiosk": {
      "id": "uuid",
      "name": "Booth A",
      "pairingCode": "123456"
    }
  }
}
```

#### Error Responses

| Status | Code               | Condition                        |
| ------ | ------------------ | -------------------------------- |
| 401    | UNAUTHORIZED       | Token missing/invalid            |
| 403    | FORBIDDEN          | Active subscription required     |
| 403    | MAX_KIOSKS_REACHED | Active kiosk count >= plan limit |
| 404    | NOT_FOUND          | Subscription plan not found      |

---

### PATCH `/owner/kiosks/:id`

Mengupdate kiosk. Hanya field yang dikirim yang diupdate.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Params:**

| Param | Type   | Description |
| ----- | ------ | ----------- |
| `id`  | string | UUID kiosk  |

**Body:**

```json
{
  "name": "Updated Booth",
  "priceBaseSession": 35000,
  "isActive": false
}
```

| Field                | Type    | Required | Validation            |
| -------------------- | ------- | -------- | --------------------- |
| `name`               | string  | No       | min 1 char            |
| `priceBaseSession`   | number  | No       | integer, non-negative |
| `pricePerExtraPrint` | number  | No       | integer, non-negative |
| `priceDigitalCopy`   | number  | No       | integer, non-negative |
| `isActive`           | boolean | No       | —                     |

#### Response — 200 OK

```json
{
  "data": {
    "kiosk": {
      "id": "uuid",
      "name": "Updated Booth",
      "isActive": false,
      "priceBaseSession": 35000,
      "pricePerExtraPrint": 5000,
      "priceDigitalCopy": 10000
    }
  }
}
```

#### Error Responses

| Status | Code         | Condition                    |
| ------ | ------------ | ---------------------------- |
| 401    | UNAUTHORIZED | Token missing/invalid        |
| 404    | NOT_FOUND    | Kiosk not found or not owned |

---

### POST `/owner/kiosks/:id/generate-pairing`

Generate pairing code baru untuk kiosk. Reset device token dan pairedAt.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Params:**

| Param | Type   | Description |
| ----- | ------ | ----------- |
| `id`  | string | UUID kiosk  |

No body required.

#### Response — 200 OK

```json
{
  "data": {
    "pairingCode": "654321"
  }
}
```

| Field         | Type   | Description                        |
| ------------- | ------ | ---------------------------------- |
| `pairingCode` | string | 6-digit pairing code, valid 7 days |

#### Error Responses

| Status | Code         | Condition                    |
| ------ | ------------ | ---------------------------- |
| 401    | UNAUTHORIZED | Token missing/invalid        |
| 404    | NOT_FOUND    | Kiosk not found or not owned |

---

## Templates

### GET `/owner/templates`

Mengambil semua template milik owner beserta elements-nya.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
```

No body required.

#### Response — 200 OK

```json
{
  "data": [
    {
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
      "updatedAt": "2025-01-01T00:00:00.000Z",
      "elements": [
        {
          "id": "uuid",
          "templateId": "uuid",
          "elementType": "photo_slot",
          "sequence": 1,
          "x": 0,
          "y": 0,
          "width": 200,
          "height": 300,
          "rotation": 0,
          "opacity": 100,
          "properties": { "captureOrder": 1 },
          "createdAt": "2025-01-01T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

#### Error Responses

| Status | Code         | Condition             |
| ------ | ------------ | --------------------- |
| 401    | UNAUTHORIZED | Token missing/invalid |
| 403    | FORBIDDEN    | Not a studio_owner    |

---

### GET `/owner/templates/:id`

Mengambil detail satu template beserta elements-nya.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Params:**

| Param | Type   | Description   |
| ----- | ------ | ------------- |
| `id`  | string | UUID template |

#### Response — 200 OK

```json
{
  "data": {
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
      "updatedAt": "2025-01-01T00:00:00.000Z",
      "elements": []
    }
  }
}
```

#### Error Responses

| Status | Code         | Condition                       |
| ------ | ------------ | ------------------------------- |
| 401    | UNAUTHORIZED | Token missing/invalid           |
| 404    | NOT_FOUND    | Template not found or not owned |

---

### POST `/owner/templates`

Membuat template baru. Asset URL (backgroundUrl, overlayUrl) harus milik owner.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body:**

```json
{
  "name": "Classic",
  "width": 576,
  "height": 864,
  "backgroundUrl": "https://storage/templates/owner-1/backgrounds/uuid.png",
  "overlayUrl": null,
  "overridePriceBase": null,
  "overridePriceExtraPrint": null,
  "overridePriceDigitalCopy": null,
  "isActive": true
}
```

| Field                      | Type           | Required | Default | Validation                                  |
| -------------------------- | -------------- | -------- | ------- | ------------------------------------------- |
| `name`                     | string         | Yes      | —       | min 1 char                                  |
| `width`                    | number         | No       | 576     | integer, positive                           |
| `height`                   | number         | Yes      | —       | integer, positive                           |
| `backgroundUrl`            | string         | Yes      | —       | min 1 char, must be owned by user           |
| `overlayUrl`               | string \| null | No       | null    | min 1 char if string, must be owned by user |
| `overridePriceBase`        | number \| null | No       | null    | integer, non-negative                       |
| `overridePriceExtraPrint`  | number \| null | No       | null    | integer, non-negative                       |
| `overridePriceDigitalCopy` | number \| null | No       | null    | integer, non-negative                       |
| `isActive`                 | boolean        | No       | true    | —                                           |

#### Response — 201 Created

```json
{
  "data": {
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
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

#### Error Responses

| Status | Code             | Condition                          |
| ------ | ---------------- | ---------------------------------- |
| 401    | UNAUTHORIZED     | Token missing/invalid              |
| 400    | VALIDATION_ERROR | backgroundUrl/overlayUrl not owned |

---

### PATCH `/owner/templates/:id`

Mengupdate template. Hanya field yang dikirim yang diupdate. Asset URL divalidasi ownership jika diubah.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Params:**

| Param | Type   | Description   |
| ----- | ------ | ------------- |
| `id`  | string | UUID template |

**Body:**

```json
{
  "name": "Updated Classic",
  "overlayUrl": null
}
```

| Field                      | Type           | Required | Validation                                         |
| -------------------------- | -------------- | -------- | -------------------------------------------------- |
| `name`                     | string         | No       | min 1 char                                         |
| `width`                    | number         | No       | integer, positive                                  |
| `height`                   | number         | No       | integer, positive                                  |
| `backgroundUrl`            | string         | No       | min 1 char, must be owned by user                  |
| `overlayUrl`               | string \| null | No       | min 1 char if string, owned by user; null to clear |
| `overridePriceBase`        | number \| null | No       | integer, non-negative                              |
| `overridePriceExtraPrint`  | number \| null | No       | integer, non-negative                              |
| `overridePriceDigitalCopy` | number \| null | No       | integer, non-negative                              |
| `isActive`                 | boolean        | No       | —                                                  |

#### Response — 200 OK

Returns the updated template wrapped in `data.template` (same shape as create response).

#### Error Responses

| Status | Code             | Condition                       |
| ------ | ---------------- | ------------------------------- |
| 401    | UNAUTHORIZED     | Token missing/invalid           |
| 404    | NOT_FOUND        | Template not found or not owned |
| 400    | VALIDATION_ERROR | Asset URL not owned by user     |

---

### DELETE `/owner/templates/:id`

Menghapus template. Gagal jika template sudah memiliki transaksi.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Params:**

| Param | Type   | Description   |
| ----- | ------ | ------------- |
| `id`  | string | UUID template |

No body required.

#### Response — 200 OK

Returns the deleted template wrapped in `data.template` (same shape as create response, without elements).

#### Error Responses

| Status | Code         | Condition                                 |
| ------ | ------------ | ----------------------------------------- |
| 401    | UNAUTHORIZED | Token missing/invalid                     |
| 404    | NOT_FOUND    | Template not found or not owned           |
| 409    | CONFLICT     | Cannot delete — template has transactions |

---

## Template Elements

### GET `/owner/templates/:id/elements`

Mengambil semua elements dari template.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Params:**

| Param | Type   | Description   |
| ----- | ------ | ------------- |
| `id`  | string | UUID template |

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "templateId": "uuid",
      "elementType": "photo_slot",
      "sequence": 1,
      "x": 0,
      "y": 0,
      "width": 200,
      "height": 300,
      "rotation": 0,
      "opacity": 100,
      "properties": { "captureOrder": 1 },
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Error Responses

| Status | Code         | Condition                       |
| ------ | ------------ | ------------------------------- |
| 401    | UNAUTHORIZED | Token missing/invalid           |
| 404    | NOT_FOUND    | Template not found or not owned |

---

### POST `/owner/templates/:id/elements`

Menambah element ke template. Sequence harus unik per template. `photo_slot` wajib punya `captureOrder` di properties.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Params:**

| Param | Type   | Description   |
| ----- | ------ | ------------- |
| `id`  | string | UUID template |

**Body:**

```json
{
  "elementType": "photo_slot",
  "sequence": 1,
  "x": 0,
  "y": 0,
  "width": 200,
  "height": 300,
  "rotation": 0,
  "opacity": 100,
  "properties": { "captureOrder": 1 }
}
```

| Field         | Type   | Required | Validation                                          |
| ------------- | ------ | -------- | --------------------------------------------------- |
| `elementType` | string | Yes      | `photo_slot`, `image`, `text`, `shape`              |
| `sequence`    | number | Yes      | integer, non-negative, unique per template          |
| `x`           | number | Yes      | integer                                             |
| `y`           | number | Yes      | integer                                             |
| `width`       | number | Yes      | integer, positive                                   |
| `height`      | number | Yes      | integer, positive                                   |
| `rotation`    | number | Yes      | integer, 0–360                                      |
| `opacity`     | number | Yes      | integer, 0–100                                      |
| `properties`  | object | Yes      | `photo_slot` requires `captureOrder` (positive int) |

#### Response — 201 Created

```json
{
  "data": {
    "element": {
      "id": "uuid",
      "templateId": "uuid",
      "elementType": "photo_slot",
      "sequence": 1,
      "x": 0,
      "y": 0,
      "width": 200,
      "height": 300,
      "rotation": 0,
      "opacity": 100,
      "properties": { "captureOrder": 1 },
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

#### Error Responses

| Status | Code             | Condition                                |
| ------ | ---------------- | ---------------------------------------- |
| 401    | UNAUTHORIZED     | Token missing/invalid                    |
| 404    | NOT_FOUND        | Template not found or not owned          |
| 409    | CONFLICT         | Sequence already exists in this template |
| 400    | VALIDATION_ERROR | photo_slot missing/invalid captureOrder  |

---

### PATCH `/owner/templates/:id/elements/:elementId`

Mengupdate element. Sequence divalidasi jika berubah. Properties divalidasi ulang jika elementType berubah.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Params:**

| Param       | Type   | Description   |
| ----------- | ------ | ------------- |
| `id`        | string | UUID template |
| `elementId` | string | UUID element  |

**Body:**

```json
{
  "x": 50,
  "y": 100,
  "width": 250
}
```

| Field         | Type   | Required | Validation                             |
| ------------- | ------ | -------- | -------------------------------------- |
| `elementType` | string | No       | `photo_slot`, `image`, `text`, `shape` |
| `sequence`    | number | No       | integer, non-negative, unique          |
| `x`           | number | No       | integer                                |
| `y`           | number | No       | integer                                |
| `width`       | number | No       | integer, positive                      |
| `height`      | number | No       | integer, positive                      |
| `rotation`    | number | No       | integer, 0–360                         |
| `opacity`     | number | No       | integer, 0–100                         |
| `properties`  | object | No       | validated per elementType              |

#### Response — 200 OK

Returns the updated element wrapped in `data.element` (same shape as create response).

#### Error Responses

| Status | Code             | Condition                                |
| ------ | ---------------- | ---------------------------------------- |
| 401    | UNAUTHORIZED     | Token missing/invalid                    |
| 404    | NOT_FOUND        | Template or element not found/not owned  |
| 409    | CONFLICT         | Sequence already exists in this template |
| 400    | VALIDATION_ERROR | Invalid properties for element type      |

---

### DELETE `/owner/templates/:id/elements/:elementId`

Menghapus element. Tidak bisa menghapus photo_slot terakhir.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Params:**

| Param       | Type   | Description   |
| ----------- | ------ | ------------- |
| `id`        | string | UUID template |
| `elementId` | string | UUID element  |

No body required.

#### Response — 200 OK

Returns the deleted element wrapped in `data.element` (same shape as create response).

#### Error Responses

| Status | Code             | Condition                                 |
| ------ | ---------------- | ----------------------------------------- |
| 401    | UNAUTHORIZED     | Token missing/invalid                     |
| 404    | NOT_FOUND        | Template or element not found/not owned   |
| 400    | VALIDATION_ERROR | Cannot delete last photo_slot in template |

---

## Asset Upload

### POST `/owner/assets/upload`

Upload asset file (background, overlay, element image). File harus berupa gambar (JPEG, PNG, WebP, SVG), max 5 MB.

#### Request

**Headers:**

```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Query:**

| Param    | Type   | Required | Description                                               |
| -------- | ------ | -------- | --------------------------------------------------------- |
| `folder` | string | No       | `backgrounds`, `overlays`, `elements` (default: `assets`) |

**Body:** Multipart form with a single `file` field.

#### Response — 201 Created

```json
{
  "data": {
    "url": "https://storage.example.com/templates/owner-1/backgrounds/uuid.jpg"
  }
}
```

| Field | Type   | Description                     |
| ----- | ------ | ------------------------------- |
| `url` | string | Public URL of the uploaded file |

#### Error Responses

| Status | Code             | Condition                                 |
| ------ | ---------------- | ----------------------------------------- |
| 401    | UNAUTHORIZED     | Token missing/invalid                     |
| 400    | VALIDATION_ERROR | Unsupported file type / empty / too large |

---

## Implementation Notes

### Bug Fixes Applied (EPIC-03 Review)

| ID     | Fix                                                                                   |
| ------ | ------------------------------------------------------------------------------------- |
| E03-01 | `pairingCode` removed from kiosk list response for security                           |
| E03-02 | `MaxKiosksReachedError` added as distinct domain error (403)                          |
| E03-03 | No-subscription now throws `ForbiddenError('Active subscription required...')`        |
| E03-04 | Sequence conflict returns 409 `ConflictError` instead of 400                          |
| E03-05 | `photo_slot` elements validated for `captureOrder` in properties                      |
| E03-09 | `overlayUrl` uses explicit `!== undefined && !== null` check                          |
| E03-10 | Kiosk price schemas use `.int().nonnegative()`                                        |
| E03-11 | Template override price schemas use `.int().nonnegative()`                            |
| E03-12 | Element dimension schemas use `.int()`, `.int().positive()`, `.int().min(0).max(...)` |
| E03-21 | `overlayUrl` schema uses `.min(1)` to prevent empty strings                           |
