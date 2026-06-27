# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start Next.js dev server (localhost:3000)
npm run build        # prisma generate + next build
npm run start        # start production build
npm run lint         # ESLint
npm run db:push      # sync Prisma schema to DB without migrations (dev)
npm run db:migrate   # run migrations (production)
npm run db:studio    # open Prisma Studio
npm run db:seed      # seed demo data (password: demo1234 for all accounts)
```

Copy `.env.example` to `.env.local` and fill in values before running locally. `DATABASE_URL` points to a local Postgres instance; `NEXTAUTH_SECRET` must be set (generate with `openssl rand -base64 32`). Stripe keys are needed for payment flows but can be omitted for non-payment work. SMTP vars are optional — emails are silently skipped when `SMTP_HOST` is unset.

**First-run setup:** On a fresh DB, visit `/setup` to create the first admin account via `POST /api/setup` (locked out once any `ADMIN` user exists).

## Architecture

**Stack:** Next.js 14 App Router, TypeScript, Prisma + PostgreSQL, NextAuth v4 (JWT/credentials), Stripe, Tailwind CSS, Zod for request validation.

**User roles** (`UserRole` enum): `BAND`, `VENUE`, `ADMIN`. Role is stored in the JWT and available as `session.user.role`. Use `getSession()` from `src/lib/auth.ts` in server components and API routes. The middleware in `src/middleware.ts` protects `/band/*`, `/venue/*`, `/admin/*`, and `/dashboard/*` routes — any unauthenticated access redirects to `/login`.

**Route layout:**
- `src/app/(auth)/` — login, register, forgot/reset password (no sidebar layout)
- `src/app/(public)/` — unauthenticated pages: home, public gig listing, band/venue profile pages
- `src/app/band/` — band dashboard, availability editor, gig list, profile, settings
- `src/app/venue/` — venue dashboard, gig creation/edit, gig detail with confirm/pay actions
- `src/app/admin/` — admin dashboard, user/band/venue/gig/payment/tier management, audit log
- `src/app/dashboard/` — generic post-login landing (redirects by role)
- `src/app/api/` — all API routes

**Key domain flow:**

1. **Availability** — Bands mark available days per month. The month `M` locks on the 25th of month `M-1` (see `src/lib/availability.ts`: `LOCK_DAY = 25`, `isMonthLocked()`). Availability is stored as an `Int[]` of day numbers in `Availability.availableDates`.

2. **Gig creation** — Venues `POST /api/gigs` with a `payTierId`, date, description, and `claimMode` (`AUTO_ASSIGN` | `VENUE_REVIEW`). `PayTier` records (managed by ADMIN via `/api/admin/tiers`) define the pay amount in cents and the platform fee percentage.

3. **Claiming** — Bands `POST /api/gigs/[id]/claim`. The route checks band availability for the gig date before allowing the claim. In `AUTO_ASSIGN` mode the first claimer is immediately confirmed and the gig status flips to `CONFIRMED`. In `VENUE_REVIEW` mode the claim is `PENDING` and the gig moves to `PENDING`; the venue then calls `POST /api/gigs/[id]/confirm/[bandId]` to confirm one band and reject all others.

4. **Payments** — Venue initiates via `POST /api/stripe/checkout/[gigId]`, which creates a Stripe Checkout session. Stripe webhooks at `/api/webhooks/stripe` handle the async result: `payment_intent.succeeded` creates/upserts a `Payment` record; `transfer.created` marks `Payment.releasedAt` and sets gig status to `COMPLETED`. Bands must connect a Stripe account (`POST /api/stripe/connect`) to receive payouts.

5. **Ratings** — After a gig is `COMPLETED`, venues can rate the band via `POST /api/gigs/[id]/rating`. One rating per gig; stored in `GigRating`.

**StudioSync integration** (`src/lib/studiosync.ts`):

Bidirectional webhook integration with StudioSync (a separate band-management platform):

- **Inbound** (`POST /api/webhooks/studiosync`): receives `band.created` / `band.updated` events. On `band.created`, auto-provisions a `User` + `Band` with a random password and sends a password-set email so the band can log in. Verified with HMAC-SHA256 signature on the `x-studiosync-signature` header.
- **Outbound**: when a gig is confirmed or cancelled, a `WebhookOutbox` row is written (atomically inside the business-logic transaction via `webhookOutboxOp()`). A drain worker reads `PENDING` outbox rows and delivers them to StudioSync, signing with HMAC on `x-317booking-signature`. `Band.studiosyncId` stores the StudioSync UUID for cross-system linking.

**Email** (`src/lib/email.ts`): Uses Nodemailer + `@react-email/components`. Templates live in `src/emails/`. In development, preview any template at `GET /api/dev/email-preview/[template]` (e.g. `/api/dev/email-preview/claim-confirmed`). Available templates: `gig-claimed`, `claim-confirmed`, `claim-rejected`, `gig-cancelled`, `payment-released`, `password-reset`, `new-account`.

**Audit log** (`src/lib/audit.ts`): `logAuditEvent()` writes to `AuditLog`. IDs are stored as plain strings (no FK) so records survive deletions. Visible to admins at `/admin/audit`.

**Exports** (`src/lib/export.ts`): `toCSV()` and `toXLSX()` helpers used by band/venue export routes (`/api/bands/me/export`, `/api/venues/me/export`) and the `ExportRecords` component. Bands also get an iCal feed at `GET /api/bands/[id]/calendar.ics`.

**Shared lib:**
- `src/lib/prisma.ts` — singleton Prisma client
- `src/lib/auth.ts` — `authOptions` and `getSession()` convenience wrapper
- `src/lib/stripe.ts` — Stripe client singleton and `formatAmount()` helper
- `src/lib/availability.ts` — lock date logic and month utilities

**Type augmentation:** `src/types/next-auth.d.ts` extends `Session` and `JWT` to include `id` and `role` fields.
