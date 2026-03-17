# Health API — Endpoint Documentation

> **Base URL:** `/` (root, tanpa prefix)
> **Auth Required:** None — endpoint publik untuk monitoring dan readiness check

---

## GET `/health`

Liveness probe sederhana. Mengembalikan status `ok` jika server berjalan.

### Rate Limit

100 requests/menit per IP (global default).

### Request

Tidak ada body atau parameter.

### Response — 200 OK

```json
{
  "status": "ok"
}
```

| Field    | Type   | Description            |
| -------- | ------ | ---------------------- |
| `status` | string | Selalu bernilai `"ok"` |

---

## GET `/health/ready`

Readiness probe yang memverifikasi koneksi database. Mengembalikan 200 jika semua dependency siap, 503 jika ada yang gagal.

### Rate Limit

100 requests/menit per IP (global default).

### Request

Tidak ada body atau parameter.

### Response — 200 OK

Semua dependency berjalan normal.

```json
{
  "status": "ok",
  "checks": {
    "database": "ok"
  }
}
```

### Response — 503 Service Unavailable

Satu atau lebih dependency tidak tersedia.

```json
{
  "status": "degraded",
  "checks": {
    "database": "error"
  }
}
```

| Field             | Type   | Description                                  |
| ----------------- | ------ | -------------------------------------------- |
| `status`          | string | `"ok"` jika semua check pass, `"degraded"` jika ada yang gagal |
| `checks.database` | string | `"ok"` jika koneksi DB berhasil, `"error"` jika gagal |
