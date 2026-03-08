# Deployment Guide

## Production

|                  |                                      |
| ---------------- | ------------------------------------ |
| **URL**          | https://backend-memoir.vercel.app    |
| **Platform**     | Vercel Serverless (Hobby plan)       |
| **Database**     | Supabase PostgreSQL (ap-southeast-1) |
| **Storage**      | Supabase Storage                     |
| **CI/CD**        | GitHub Actions → Vercel CLI          |
| **Health check** | `GET /health` → `{"status":"ok"}`    |

---

## Environment Variables

All variables validated at runtime via `@t3-oss/env-core` in `src/infrastructure/config/env.ts`. App will **crash on startup** if required vars are missing or invalid.

| Variable                    | Required | Default       | Description                             | Example                                                   |
| --------------------------- | -------- | ------------- | --------------------------------------- | --------------------------------------------------------- |
| `NODE_ENV`                  | No       | `development` | Environment mode                        | `production`                                              |
| `PORT`                      | No       | `3000`        | Server port (ignored on Vercel)         | `3000`                                                    |
| `DATABASE_URL`              | **Yes**  | —             | PostgreSQL connection string (Supabase) | `postgresql://user:pass@db.xxx.supabase.co:5432/postgres` |
| `JWT_SECRET`                | **Yes**  | —             | JWT signing secret (min 32 chars)       | `<random 64-char string>`                                 |
| `JWT_EXPIRES_IN`            | No       | `900`         | Access token TTL in seconds (15 min)    | `900`                                                     |
| `COOKIE_SECRET`             | **Yes**  | —             | Cookie signing secret (min 32 chars)    | `<random 64-char string>`                                 |
| `REFRESH_TOKEN_EXPIRES_IN`  | No       | `604800`      | Refresh token TTL in seconds (7 days)   | `604800`                                                  |
| `DEVICE_TOKEN_EXPIRES_IN`   | No       | `315360000`   | Device token TTL in seconds (10 years)  | `315360000`                                               |
| `CORS_ORIGINS`              | No       | `""`          | Comma-separated allowed origins         | `https://dashboard.memoir.id,https://admin.memoir.id`     |
| `SUPABASE_URL`              | **Yes**  | —             | Supabase project URL                    | `https://xxx.supabase.co`                                 |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes**  | —             | Supabase service role key (for storage) | `eyJhbGciOiJI...`                                         |
| `XENDIT_SECRET_KEY`         | **Yes**  | —             | Xendit API secret key                   | `xnd_production_...`                                      |
| `XENDIT_IS_PRODUCTION`      | No       | `false`       | Use Xendit production environment       | `true`                                                    |
| `FRONTEND_URL`              | No       | —             | Frontend URL for payment redirect       | `https://app.memoir.id`                                   |

---

## CI/CD Pipelines

### `ci.yml` — Runs on every push/PR to `main`

```
lint-typecheck (fast, ~2min)
     │
     ▼
   test (PostgreSQL 16 service container)
     │ migrate → seed → pnpm test
```

### `deploy.yml` — Runs on push to `main` only

```
ci (lint → typecheck → test)
     │
     ▼
  deploy
     │ pnpm db:migrate (production DB)
     │ vercel pull → vercel build → vercel deploy --prod
```

Migrations run against **production database** before deploy. If migration fails, deploy is aborted.

---

## Setup from Scratch

### 1. Prerequisites

- Node.js 22 LTS
- pnpm 9.x
- Vercel account (free Hobby plan)
- Supabase project
- Xendit account

### 2. Link to Vercel

```bash
npx vercel link
```

This creates `.vercel/project.json` with `orgId` and `projectId`.

### 3. Set Vercel Environment Variables

Set via dashboard (**Vercel → Project → Settings → Environment Variables**) or CLI.

> **Important**: If using CLI, use `printf` to avoid trailing newlines. The `<<<` heredoc adds `\n` which breaks enum validation:
>
> ```bash
> # ✗ BAD  — adds trailing newline
> npx vercel env add NODE_ENV production <<< 'production'
>
> # ✓ GOOD — no trailing newline
> printf 'production' | npx vercel env add NODE_ENV production --token=...
> ```

Use the Supabase **connection pooler** URL (port `6543`, mode `transaction`) for `DATABASE_URL`. This avoids hitting PostgreSQL connection limits on serverless.

### 4. Set GitHub Secrets

Go to **GitHub → Repo → Settings → Secrets and variables → Actions**:

| Secret              | Description                                                                     |
| ------------------- | ------------------------------------------------------------------------------- |
| `VERCEL_TOKEN`      | Vercel personal access token ([create here](https://vercel.com/account/tokens)) |
| `VERCEL_ORG_ID`     | From `.vercel/project.json` after `vercel link`                                 |
| `VERCEL_PROJECT_ID` | From `.vercel/project.json` after `vercel link`                                 |
| `DATABASE_URL`      | Production Supabase PostgreSQL connection string (for CI migration step)        |

### 5. Run Initial Migration & Seed

```bash
# Migration (already runs in CI, but needed for first setup)
pnpm db:migrate

# Seed initial data (admin user, plans, subscription, kiosk, template)
pnpm db:seed
```

This creates:

- Admin user: `admin@memoir.id` / `password123`
- Owner user: `owner@memoir.id` / `password123`
- Plans: Starter, Pro
- Sample subscription, kiosk, and template

### 6. Deploy

```bash
npx vercel --prod
```

Or just push to `main` — CI/CD will handle the rest.

---

## Database Migrations

### How it works

- Drizzle Kit generates SQL migration files in `drizzle/`
- Migrations run **automatically** in both CI workflows:
  - `ci.yml` → against test PostgreSQL container
  - `deploy.yml` → against production Supabase before deploy

### Daily workflow

```bash
# 1. Edit schema in src/infrastructure/persistence/drizzle/schema.ts
# 2. Generate migration
pnpm db:generate

# 3. Review generated SQL in drizzle/
# 4. Commit and push — CI applies it automatically
```

### Manual migration

```bash
DATABASE_URL="postgresql://..." pnpm db:migrate
```

---

## Architecture

```
Client Request
     │
     ▼
Vercel Edge Network
     │ rewrite /(.*) → /api/serverless
     ▼
api/serverless.ts
     │ await app.ready()
     │ app.server.emit("request", req, res)
     ▼
Fastify (src/app.ts)
     │ helmet, cors, cookie, multipart, rate-limit
     │ zod validation, JWT auth
     ▼
Routes → Controllers → Use Cases → Repositories → Supabase PostgreSQL
```

### Key decisions

| Decision                           | Rationale                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `"framework": null` in vercel.json | Prevents Vercel from auto-detecting Fastify and taking over routing            |
| `"buildCommand": ""`               | `@vercel/node` compiles TypeScript directly — no `tsc` build needed            |
| `app.server.emit("request")`       | Bridges Vercel's `IncomingMessage/ServerResponse` to Fastify's internal server |
| `max: 1` connection on serverless  | Supabase uses PgBouncer; serverless functions need minimal pooling             |
| `prepare: false` on serverless     | Required for PgBouncer transaction mode compatibility                          |

### Vercel Hobby Plan Limits

| Resource              | Limit                                         |
| --------------------- | --------------------------------------------- |
| Memory per invocation | 1024 MB                                       |
| Timeout per request   | 30s (configured), max 300s with Fluid Compute |
| Bandwidth             | 100 GB/month                                  |
| Serverless execution  | 100 GB-hours/month                            |
| Cold start            | ~1-3 seconds after idle                       |

---

## Troubleshooting

### FUNCTION_INVOCATION_FAILED (500)

Usually means the app crashed during initialization. Common causes:

1. **Missing or invalid env vars** — check all required vars are set in Vercel dashboard
2. **Trailing newline in env vars** — re-set using `printf` instead of `<<<`
3. **Database unreachable** — verify `DATABASE_URL` uses the pooler URL and is accessible

To debug, temporarily wrap `buildApp()` in `api/serverless.ts` with try/catch and return the error in the response body. Remove after debugging.

### Cold starts are slow

Expected on Hobby plan. First request after idle takes 1-3 seconds. Subsequent requests are fast (~100-300ms). For always-warm, consider upgrading to Pro plan.

### Database connection errors

Ensure `DATABASE_URL` uses the **Supabase connection pooler** (port `6543`), not the direct connection (port `5432`). Serverless functions open/close connections rapidly, which overwhelms direct PostgreSQL connections.
