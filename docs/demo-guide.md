# Demo Guide

A pre-seeded demo environment so you can walk through every part of the platform without setting anything up manually.

---

## Quick start

```bash
# 1. Start the app
docker compose up -d

# 2. Seed demo data (run once, or any time you want to reset)
docker compose exec app npx prisma db seed
```

The seed is **idempotent** — running it again won't create duplicates. Gig dates are always relative to today so they never go stale.

---

## Demo accounts

All accounts use the same password: **`demo1234`**

| Email | Role | Notes |
|---|---|---|
| `admin@317booking.com` | Admin | Full platform access |
| `vogue@317booking.com` | Venue | The Vogue Theatre |
| `hifi@317booking.com` | Venue | Hi-Fi |
| `deluxe@317booking.com` | Venue | Deluxe at Old National Centre |
| `palms@317booking.com` | Band | The Static Palms — Indie Rock |
| `ghost@317booking.com` | Band | Ghost Meridian — Dream Pop |
| `copper@317booking.com` | Band | Copper & The Rust — Americana |
| `voltage@317booking.com` | Band | Voltage Drop — Post-Punk |

---

## Pre-seeded state

The seed creates gigs in every status so you can demo any part of the workflow immediately without having to set it up step by step.

| Gig | Venue | Status | What to demo |
|---|---|---|---|
| Saturday rock show | The Vogue | OPEN | Band claiming, venue selecting |
| Opener slot | Hi-Fi | OPEN | Auto-assign (first-come) |
| Monthly showcase | Deluxe | OPEN | Headliner tier |
| Friday headliner | The Vogue | PENDING | 2 claimants waiting for venue review |
| Weekend show | Hi-Fi | CONFIRMED | Ready for venue to pay |
| Last Friday's show | Deluxe | COMPLETED | Past gig with payment released |

Three pay tiers are configured: **Opener $150 · Support $300 · Headliner $500** (all with a 5% platform fee).

---

## Walkthrough scenarios

### Scenario 1: Band claims a gig (venue review mode)

This shows the full claim → review → confirm/reject cycle.

1. Log in as `palms@317booking.com` (The Static Palms)
2. Go to **Find Gigs** in the sidebar
3. Click into the **Saturday rock show** at The Vogue (OPEN, venue review)
4. Click **Claim this gig** — your claim is now PENDING
5. Log out, log in as `vogue@317booking.com` (The Vogue Theatre)
6. The dashboard shows **Needs Review** with a badge count
7. Click the gig — you'll see all claimants with their genre and bio
8. Click **Confirm** next to The Static Palms
9. The other claimants are automatically rejected
10. Log out, log in as `palms@317booking.com` — dashboard now shows **Upcoming Gig**

---

### Scenario 2: Auto-assign (first-come, first-served)

1. Log in as `voltage@317booking.com` (Voltage Drop)
2. Go to **Find Gigs** → click the **Opener slot** at Hi-Fi (AUTO_ASSIGN)
3. Click **Claim this gig**
4. The gig immediately flips to CONFIRMED — no venue review step
5. Log in as `hifi@317booking.com` — dashboard shows the gig as Confirmed

---

### Scenario 3: Venue pays a confirmed gig

The **Weekend show** at Hi-Fi is already CONFIRMED with Ghost Meridian. Use this to demo the payment flow without going through the claim cycle first.

1. Log in as `hifi@317booking.com`
2. Click **Weekend show** from the dashboard
3. The gig detail shows a **Pay** button (requires Stripe keys configured — see note below)
4. Clicking Pay initiates a Stripe Checkout session; on success the gig moves to COMPLETED and the band receives a "You've been paid" email

> **Stripe test mode:** Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to your Stripe test keys. Use card `4242 4242 4242 4242` with any future expiry. The band also needs a connected Stripe account to receive the transfer — in test mode you can create one via the band's Settings → Connect Stripe.

---

### Scenario 4: Venue cancels a confirmed gig

1. Log in as `hifi@317booking.com`
2. Open the **Weekend show** (CONFIRMED with Ghost Meridian)
3. Click **Cancel Gig** and confirm the dialog
4. Ghost Meridian receives a cancellation email (if SMTP is configured)
5. The gig status flips to CANCELLED

---

### Scenario 5: Admin manages the platform

1. Log in as `admin@317booking.com`
2. **Dashboard** — overview of all gigs, bands, venues, recent payments
3. **Gigs** — view and cancel any gig across all venues
4. **Bands / Venues** — view profiles, connected Stripe status
5. **Payments** — revenue summary and transaction log
6. **Tiers** — create / delete pay tiers (the three demo tiers are pre-seeded)
7. **Audit Log** — every claim, confirm, cancel, and payment action is recorded here
8. **Settings** — platform-wide configuration

---

### Scenario 6: Band sets availability

Availability is what determines which gigs a band can claim. The demo seeds realistic patterns — Static Palms is available on even days, Voltage Drop is available every day, etc.

1. Log in as `copper@317booking.com` (Copper & The Rust)
2. Go to **Availability** in the sidebar
3. Toggle days on/off on the calendar grid
4. Click **Save availability**
5. Go to **Find Gigs** — gigs on your available dates show a green "✓ You're available" indicator; others show "Not available"

Availability locks on the **25th of the prior month** — after that the calendar is read-only for that month.

---

### Scenario 7: Password reset flow

1. Go to `/login` and click **Forgot password?**
2. Enter any demo account email and submit
3. If SMTP is configured, a reset email arrives with a 24-hour link
4. Without SMTP, preview the reset email at `/api/dev/email-preview/password-reset` (dev server only)

---

## Email previews (dev only)

While running `npm run dev`, all email templates can be previewed in the browser without sending anything:

| URL | Template |
|---|---|
| `/api/dev/email-preview/gig-claimed` | Venue notified of a new claim |
| `/api/dev/email-preview/claim-confirmed` | Band confirmed for a gig |
| `/api/dev/email-preview/claim-rejected` | Band not selected |
| `/api/dev/email-preview/gig-cancelled` | Gig cancelled notification |
| `/api/dev/email-preview/payment-released` | Payment transferred to band |
| `/api/dev/email-preview/password-reset` | Standard password reset |
| `/api/dev/email-preview/new-account` | New account setup (from StudioSync) |

These routes return `404` in production.

---

## Resetting demo data

The seed is safe to re-run at any time — it uses upserts so existing records are left as-is. If you want a full clean slate:

```bash
# Drop and recreate the database, then re-seed
docker compose exec db psql -U postgres -c "DROP DATABASE \"317booking\";"
docker compose exec db psql -U postgres -c "CREATE DATABASE \"317booking\";"
docker compose exec app npx prisma db push
docker compose exec app npx prisma db seed
```
