# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**memoir. Owner Dashboard** — a Next.js 16 (App Router) dashboard for photo studio owners to manage kiosks, templates, subscriptions, wallet/finances, and transactions. This is a frontend-only app; all data comes from a separate backend API via proxy.

- **Language:** TypeScript (strict mode)
- **UI:** React 19, Tailwind CSS v4, shadcn/ui (New York style, zinc theme), lucide-react icons
- **State:** TanStack React Query v5 for server state; React Context for auth only
- **Canvas:** Konva.js + react-konva for the template editor
- **Forms:** react-hook-form + Zod validation
- **Toasts:** sonner
- **Locale:** Indonesian (Rupiah currency formatting, Indonesian UI strings in error messages)

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint — zero-warning policy (--max-warnings 0)
npm run typecheck    # tsc --noEmit
```

No test framework is configured. CI runs: lint → typecheck → build.

## Architecture

### API Proxy Pattern

The app has **no backend logic**. All API calls go through a Next.js rewrite proxy:

- Frontend calls `/api/v1/*` (relative path in `src/lib/api.ts`)
- `next.config.ts` rewrites these to `NEXT_PUBLIC_API_URL` (the real backend)
- This avoids CORS issues entirely

The sole env variable: `NEXT_PUBLIC_API_URL` (see `.env.example`).

### Authentication Flow

`src/components/auth-provider.tsx` provides auth context:

- JWT stored in localStorage (`memoir_token`) + synced to cookie
- Refresh token is an HttpOnly cookie (server-set)
- On 401: shared-promise token refresh → retry once → redirect to `/login`
- Route protection: unauthenticated → `/login`; no active subscription → `/onboarding`; otherwise → dashboard

### Route Groups

- `(auth)/` — `/login` (public)
- `(dashboard)/` — all protected routes: kiosks, templates, transactions, wallet, subscription
- `onboarding/` — subscription selection (auth required, no active subscription)

### Data Fetching Hooks

Each domain has a hook in `src/hooks/` wrapping TanStack Query:

| Hook | Domain |
|------|--------|
| `use-dashboard.ts` | Dashboard stats (parallel queries) |
| `use-kiosks.ts` | Kiosk CRUD + pairing |
| `use-templates.ts` | Template & element CRUD |
| `use-subscription.ts` | Plans, invoices, payment status |
| `use-wallet.ts` | Balance, mutations, withdrawals |
| `use-transactions.ts` | Transaction history (paginated) |

All hooks use `src/lib/api.ts` which auto-unwraps `{ data: T }` responses and handles auth.

### Template Editor

The template editor (`src/components/templates/`) uses a Konva canvas for WYSIWYG editing of photo booth templates. Elements (photo slots, images, text, shapes) are managed via `src/hooks/use-templates.ts`. Element creation is **sequential** (not parallel) to avoid 409 conflicts on server-side sequence constraints.

### Key Conventions

- Path alias: `@/*` → `./src/*`
- API types in `src/lib/types.ts` mirror backend contract (camelCase)
- Status enums and display labels live in `src/lib/constants.ts`
- Currency/date formatting in `src/lib/format.ts` (Indonesian Rupiah)
- shadcn/ui components in `src/components/ui/` — add new ones via `npx shadcn@latest add <component>`
- ESLint: unused vars must be prefixed with `_`
