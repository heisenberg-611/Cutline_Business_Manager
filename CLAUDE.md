# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (webpack, not turbopack) at localhost:3000
npm run build       # prisma generate && next build
npm run lint         # eslint --max-warnings=377 (warning budget is intentional, do not "fix" by raising it)
npm test             # vitest run
npm run reset-db     # tsx scripts/reset-db.ts
npm run backfill-owners  # tsx scripts/backfill-business-owner.ts (fills Business.ownerUserId from Clerk)
npm run db:up            # local Docker Postgres on :55432, never touches the hosted DB
npm run verify-deletion  # proves account deletion against that local DB (needs db:up first)
npx prisma migrate dev   # apply schema changes locally
npx prisma generate  # regenerate client after schema.prisma edits
```

Vitest is configured (`npm test`). Note `recordPayment.test.ts` is an integration test that writes real rows to whatever `DATABASE_URL` points at.

Local Clerk webhook sync requires Svix CLI: `svix listen http://localhost:3000/api/webhooks/clerk`.

## Architecture

Cutline OS is a multi-tenant B2B SaaS (Next.js App Router, RSC + Server Actions) for creative agencies. Domain-Driven layout under `src/`:

- `src/app/` — routes only. `(auth)` = login/sign-up, `dashboard/` = tenant app, `hq/` = internal super-admin console (separate auth, see below), plus public token-based routes: `chat/[token]`, `feedback/[token]`, `review/[token]`, `intake/[businessId]`, `invoices/[id]` (public pay portal).
- `src/modules/<domain>/` — business logic per domain (`clients`, `projects`, `financials`, `assets`, `analytics`, `messaging`, `notifications`, `feedback`, `settings`, `workflow`, `prodp`, `core`). Each has `actions/` (Server Actions, `'use server'`) and `components/`. `core/db/prisma.ts` exports the singleton Prisma client; `core/actions.ts` has cross-domain helpers (e.g. global search).
- `src/lib/` — cross-cutting utilities: PDF generation (`lib/pdf`, `@react-pdf/renderer`), email (`lib/email`, `lib/emails`, Resend + `@react-email`), `lib/qstash` (Upstash QStash for scheduled/deferred jobs), invoices helpers.
- `src/components/` — shared UI (shadcn/ui primitives in `components/ui`), not domain logic.
- `prisma/schema.prisma` — single source of truth for all models (tenant models: `Business`, `User`, `Client`, `Project`, `Invoice`, etc.; HQ models: `GlobalAdmin`, `AdminAuditLog`, `SystemAlert`, `GlobalSettings`, etc.).

### Multi-tenancy

Every tenant-scoped query is manually filtered by `businessId` (== Clerk `orgId`) — there is no Postgres RLS. Server Actions must call `const { orgId } = await auth()` and pass it into every `where` clause; there's no automatic tenant guard. Follow the pattern in `src/modules/core/actions.ts` / `src/modules/clients/actions`.

### Auth model (two separate systems)

1. **Tenant app** (`/dashboard/*`): Clerk Organizations. `org:admin` = full access, `org:member` = pipeline-only. `src/middleware.ts` enforces org-context redirect (`/dashboard/select-business`) and blocks members from `financials`, `analytics`, `settings`, `archive`, `clients` routes.
2. **HQ console** (`/hq/*`): independent of Clerk — a signed `admin_session` cookie (or `?key=` query param matching `ADMIN_SECRET_KEY`) checked in `src/middleware.ts`, 15-min inactivity timeout.

Webhook routes (`/api/webhooks/*`) bypass middleware entirely and are verified via Svix signatures instead.

### Conventions

- Money is always stored/handled as integer cents (`Int`), never floats.
- Business/project/etc. use human-facing sequential display IDs (e.g. `CL-XXX`) separate from the DB `id`.
- Heavy aggregation (sums, counts) is done via `prisma.aggregate()`, not JS `.reduce()` over fetched rows.
- Independent DB reads are parallelized with `Promise.all` to avoid query waterfalls.
- Subscription features are gated **server-side** via `requirePlan(orgId, feature)` in `src/lib/plan-guard.ts`, called at the top of every gated Server Action. Layout/page checks only control rendering — they do not run before a Server Action executes, and action ids ship in public client chunks. Always gate on `getActivePlan()`, never the raw `subscriptionPlan` column, so expired plans fall back to FREE.
- Member seats are enforced in Clerk (`maxAllowedMemberships`, synced by `syncClerkSeatCap` on every plan change) plus a backstop in the `organizationMembership.created` webhook. Invites go browser-to-Clerk and never reach this app, so hiding UI cannot gate them.
