# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start Next.js dev server (localhost:3000)
npm run build        # prisma generate + next build
npm run lint         # ESLint
npm run db:push      # sync Prisma schema to DB without migrations (dev)
npm run db:migrate   # run migrations (production)
npm run db:studio    # open Prisma Studio
```

Copy `.env.example` to `.env.local` and fill in values before running locally. `DATABASE_URL` points to a local Postgres instance; `NEXTAUTH_SECRET` must be set (generate with `openssl rand -base64 32`). Stripe keys are needed for payment flows but can be omitted for non-payment work.

## Architecture

**Stack:** Next.js 14 App Router, TypeScript, Prisma + PostgreSQL, NextAuth v4 (JWT/credentials), Stripe, Tailwind CSS, Zod for request validation.

**User roles** (`UserRole` enum): `BAND`, `VENUE`, `ADMIN`. Role is stored in the JWT and available as `session.user.role`. Use `getSession()` from `src/lib/auth.ts` in server components and API routes. The middleware in `src/middleware.ts` protects `/band/*`, `/venue/*`, `/admin/*`, and `/dashboard/*` routes — any unauthenticated access redirects to `/login`.

**Route layout:**
- `src/app/(auth)/` — login and register pages (no sidebar layout)
- `src/app/band/` — band dashboard and availability editor
- `src/app/venue/` — venue dashboard and new-gig form
- `src/app/gigs/` — public gig listing and per-gig detail/claim page
- `src/app/dashboard/` — generic post-login landing (redirects by role)
- `src/app/api/` — all API routes

**Key domain flow:**

1. **Availability** — Bands mark available days per month. The month `M` locks on the 25th of month `M-1` (see `src/lib/availability.ts`: `LOCK_DAY = 25`, `isMonthLocked()`). Availability is stored as an `Int[]` of day numbers in `Availability.availableDates`.

2. **Gig creation** — Venues `POST /api/gigs` with a `payTierId`, date, description, and `claimMode` (`AUTO_ASSIGN` | `VENUE_REVIEW`). `PayTier` records (managed by ADMIN via `/api/admin/tiers`) define the pay amount in cents and the platform fee percentage.

3. **Claiming** — Bands `POST /api/gigs/[id]/claim`. The route checks band availability for the gig date before allowing the claim. In `AUTO_ASSIGN` mode the first claimer is immediately confirmed and the gig status flips to `CONFIRMED`. In `VENUE_REVIEW` mode the claim is `PENDING` and the gig moves to `PENDING`; the venue then calls `POST /api/gigs/[id]/confirm/[bandId]` to confirm one band and reject all others.

4. **Payments** — Handled via Stripe webhooks at `/api/webhooks/stripe`. `payment_intent.succeeded` creates/upserts a `Payment` record; `transfer.created` marks `Payment.releasedAt` and sets gig status to `COMPLETED`.

**Shared lib:**
- `src/lib/prisma.ts` — singleton Prisma client
- `src/lib/auth.ts` — `authOptions` and `getSession()` convenience wrapper
- `src/lib/stripe.ts` — Stripe client singleton
- `src/lib/availability.ts` — lock date logic and month utilities

**Type augmentation:** `src/types/next-auth.d.ts` extends `Session` and `JWT` to include `id` and `role` fields.
