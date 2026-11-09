# 317booking

A self-hosted gig booking platform that cuts out the middleman. Venues post gigs with built-in pay scales, bands manage their own availability, and everyone claims and releases gigs directly — no booker taking a cut.

---

## Quick start

### Prerequisites

- Node.js 20+ (or Docker)
- PostgreSQL 16+ (or use the included Docker Compose setup)
- A Stripe account (required for payments)

### 1. Clone and install

```bash
git clone https://github.com/aviatorcards/317booking
cd 317booking
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the required values:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Full URL of your app. Local npm: `http://localhost:3000`. Docker Compose publishes port 3001, so use `http://localhost:3001` there. |
| `APP_TIMEZONE` |  | IANA zone for show times. Defaults to `America/Indiana/Indianapolis`. |
| `UPLOAD_DIR` |  | Venue logo files. Defaults to `./uploads`, outside `public/`. |
| `STRIPE_SECRET_KEY` | ✅ | From your Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | ✅ | From `stripe listen` or the Stripe dashboard |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | From your Stripe dashboard |
| `STUDIOSYNC_WEBHOOK_SECRET` | ⬜ | Only needed if integrating with StudioSync |

### 3. Set up the database

```bash
npm run db:migrate    # applies Prisma migrations (use this for every environment)
```

If a database was previously created with `prisma db push` and has no `_prisma_migrations` table, baseline it once before deploying the new migrations:

```bash
npx prisma migrate resolve --applied 20261109000000_baseline
npx prisma migrate deploy
```

`migrate resolve` marks the baseline as already applied and does not change tables. `migrate deploy` then applies only the later migrations. Do this before starting a container whose command is `prisma migrate deploy`, or that boot will try to create tables that already exist.

### 4. Create your admin account

The app has no seed data and no default admin. Use the one-time setup endpoint:

```bash
curl -X POST http://localhost:3000/api/setup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'
```

> **This endpoint locks itself after first use.** Once an admin account exists, it returns 409 on every subsequent call — you don't need to remove it.

### 5. Start the dev server

```bash
npm run dev
```

Log in at `http://localhost:3000/login` with the admin credentials you just created.

---

## Docker

A `docker-compose.yml` is included that runs the app and a Postgres database together.

```bash
# Copy and fill in your env vars. Set STUDIOSYNC_WEBHOOK_SECRET before exposing the webhook.
cp .env.example .env

# The compose file joins an external network shared with StudioSync. Create it once.
docker network create booking-shared

# Start everything (the container runs prisma migrate deploy on boot)
docker compose up -d

# Create your admin account (the compose file publishes the app on port 3001)
curl -X POST http://localhost:3001/api/setup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'
```

---

## First-time admin setup

Once you're logged in as admin, do these three things before inviting anyone:

### 1. Create pay tiers

Go to **Admin → Manage Pay Tiers** and create at least one tier. Pay tiers define how much a gig pays and what platform fee percentage you take.

Example tiers:
- **Local Opener** — $150, 5% platform fee
- **Headliner** — $500, 5% platform fee
- **Private Event** — $800, 10% platform fee

Venues pick from these tiers when posting a gig. You control the menu.

### 2. Invite venues and bands

There's no invite-only flow — venues and bands register themselves at `/register`. Share the link.

- **Bands** register with a name and genre. They'll need to connect a Stripe account to receive payouts.
- **Venues** register with a name, address, and capacity.

You can view everyone who's signed up at **Admin → Bands** and **Admin → Venues**.

### 3. Set up Stripe webhooks

Payments aren't fully tracked until Stripe can call back into the app. In your Stripe dashboard, create a webhook pointing to:

```
https://yourdomain.com/api/webhooks/stripe
```

Listen for these events:
- `checkout.session.completed`
- `payment_intent.succeeded`

`checkout.session.completed` marks the gig paid and completed. `payment_intent.succeeded` does the same if the Checkout event is missed. Both are idempotent.

Paste the webhook signing secret into `STRIPE_WEBHOOK_SECRET` in your env.

---

## How the booking flow works

1. **Bands submit availability** — each month, bands mark which days they're free. Availability locks on the 25th of the prior month (e.g. July availability locks June 25th), so you have time to match gigs before the month starts.

2. **Venues post gigs** — venues pick a date, a pay tier, and a claim mode:
   - **Auto-assign** — the first band to claim it gets it automatically.
   - **Venue review** — bands apply and the venue picks one.

3. **Bands claim gigs** — open gigs appear at `/gigs`. Bands can only claim a gig if they've marked that date available.

4. **Payment** — once a gig is confirmed, payment flows through Stripe. The platform fee is taken automatically and the remainder is transferred to the band's Stripe account.

5. **Admin oversight** — the **Admin → Payment Audit** page shows every transaction: amount, platform fee, band payout, Stripe payment intent ID, and whether funds have been released.

---

## Admin pages

| Page | URL | What it does |
|---|---|---|
| Dashboard | `/admin` | Overview stats + recent gigs |
| Bands | `/admin/bands` | All registered bands, availability status, Stripe connection |
| Venues | `/admin/venues` | All venues, gig counts by status |
| Payments | `/admin/payments` | Full payment audit trail |
| Pay Tiers | `/admin/tiers` | Create/delete pay tiers |

---

## StudioSync integration (optional)

If you're also running [StudioSync](../StudioSync), the two apps can talk to each other.

**What it does:**
- When a band is created in StudioSync, it's automatically registered in 317booking (no double sign-up).
- Bands can sync their confirmed gig dates back into StudioSync's calendar, so the studio knows when their bands are performing.

**Setup:**

1. Generate a shared secret:
   ```bash
   openssl rand -hex 32
   ```

2. In 317booking's `.env.local`, set:
   ```
   STUDIOSYNC_WEBHOOK_SECRET=<the secret>
   ```

3. In StudioSync's `.env`, set:
   ```
   BOOKING_317_URL=https://yourdomain.com
   BOOKING_317_WEBHOOK_SECRET=<same secret>
   ```

4. Restart both apps. New bands created in StudioSync will automatically appear in 317booking.

**iCal feed for gig dates:**

Each band has an iCal feed at:
```
GET /api/bands/<band-id>/calendar.ics
```

Paste this URL into the band's `ical_feed_url` field in StudioSync. StudioSync's background sync task will pull confirmed gig dates and block them off on its own calendar automatically.

---

## Development commands

```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # prisma generate + next build
npm run lint         # ESLint
npm run db:push      # sync schema to DB (dev, no migration history)
npm run db:migrate   # run migrations (production)
npm run db:studio    # open Prisma Studio (visual DB browser)
```
