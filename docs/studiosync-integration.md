# StudioSync Integration

317booking can sync with a [StudioSync](https://github.com/tristansmith/StudioSync) instance so that bands managed in StudioSync automatically get 317booking accounts, and confirmed gigs block band availability in both systems in real time.

## How it works

There are two data flows:

### 1. Band registration (StudioSync → 317booking)

When a Band is created or updated in StudioSync, StudioSync posts a signed webhook to 317booking:

```
StudioSync  ──band.created──►  POST /api/webhooks/studiosync
                                   ↓
                           creates User + Band
                                   ↓
                           returns { bandId, icalUrl }
                                   ↓
StudioSync  ◄──icalUrl──────  stores URL on Band.ical_feed_url
```

- A random temporary password is generated; the band must reset it via email before logging in.
- If a user with the same email already exists, the webhook returns `409` with a message to log in and link accounts manually.
- The `icalUrl` returned is the 317booking iCal feed for that band. StudioSync stores it and polls it periodically to import confirmed gigs as blocked dates.

### 2. Gig blocking (317booking → StudioSync)

Whenever a gig is confirmed in 317booking — either instantly via `AUTO_ASSIGN` or after a venue review — 317booking fires a signed webhook to StudioSync:

```
317booking  ──gig.confirmed──►  POST /api/gigs/webhooks/317booking/
                                    ↓
                            upserts BandExternalEvent
                            (blocks the date immediately)
```

When a gig is cancelled, a `gig.cancelled` event deletes the blocking event so the date opens back up.

Only bands that were originally created via the `band.created` webhook (i.e., they have a `studiosyncId`) receive these notifications.

### iCal feed (bulk / fallback sync)

StudioSync also has a background task (`sync_band_calendar`) that polls each band's `ical_feed_url` and imports events as `BandExternalEvent` records. This handles bulk backfill and acts as a safety net if a webhook is missed.

The iCal feed lives at:

```
GET /api/bands/{bandId}/calendar.ics
```

It contains one `VEVENT` per confirmed gig (all-day events).

---

## Configuration

### 317booking `.env.local`

| Variable | Description |
|---|---|
| `STUDIOSYNC_URL` | Base URL of your StudioSync instance, no trailing slash (e.g. `http://localhost:8000`) |
| `STUDIOSYNC_WEBHOOK_SECRET` | Shared HMAC secret for verifying inbound webhooks and signing outbound ones |

### StudioSync `.env`

| Variable | Description |
|---|---|
| `BOOKING_317_URL` | Base URL of your 317booking instance, no trailing slash (e.g. `http://localhost:3000`) |
| `BOOKING_317_WEBHOOK_SECRET` | Same shared secret as `STUDIOSYNC_WEBHOOK_SECRET` above |

Generate a secret with:

```bash
openssl rand -hex 32
```

Both variables must hold the same value.

---

## API reference

### `POST /api/webhooks/studiosync`

Receives band lifecycle events from StudioSync. Called by StudioSync automatically — you should not need to call this manually.

**Headers**

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `x-studiosync-signature` | `sha256=<hmac-hex>` |

**Request body**

```jsonc
// band.created
{
  "event": "band.created",
  "band": {
    "id": "<StudioSync UUID>",
    "name": "The Midnight",
    "genre": "Synth-pop",
    "billing_email": "band@example.com"
  }
}

// band.updated
{
  "event": "band.updated",
  "band": {
    "id": "<StudioSync UUID>",
    "name": "The Midnight (Updated)",
    "genre": "Synth-pop",
    "billing_email": "band@example.com"
  }
}
```

**Responses**

| Status | Meaning |
|---|---|
| `201` | Band created. Body includes `bandId` and `icalUrl`. |
| `200` | Band updated (or `band.created` skipped — band already exists). |
| `401` | Invalid signature. |
| `409` | Email already taken by a non-StudioSync user. |

**`band.created` success response**

```json
{
  "ok": true,
  "bandId": "clx...",
  "icalUrl": "https://317booking.example.com/api/bands/clx.../calendar.ics",
  "message": "Band registered. Send the band a password reset link so they can log in."
}
```

---

### `GET /api/bands/{bandId}/calendar.ics`

Returns an iCal feed of all confirmed gigs for the band. Public — no authentication required.

The feed contains one all-day `VEVENT` per confirmed gig. Each event uses the UID `gig-{gigId}@317booking` for stable idempotent updates.

---

## Signature verification

Both sides sign outbound payloads using HMAC-SHA256 over the raw request body:

```
x-studiosync-signature: sha256=<hex>      # StudioSync → 317booking
x-317booking-signature: sha256=<hex>      # 317booking → StudioSync
```

If `STUDIOSYNC_WEBHOOK_SECRET` (317booking) or `BOOKING_317_WEBHOOK_SECRET` (StudioSync) is not set, signature checking is skipped — safe for local development, but **always set a secret in production**.

---

## Troubleshooting

**Bands aren't being created in 317booking**

- Check that `BOOKING_317_URL` is set and reachable from the StudioSync server.
- Look at StudioSync's Django logs for `317booking webhook` error lines.
- Confirm the secrets match on both sides.

**Gig dates aren't being blocked in StudioSync**

- Verify `STUDIOSYNC_URL` and `STUDIOSYNC_WEBHOOK_SECRET` are set in 317booking.
- Check that the band was originally created via the StudioSync webhook (it needs a `studiosyncId`).
- If webhooks are working, check StudioSync's `BandExternalEvent` table for records with UIDs matching `gig-*@317booking`.
- As a fallback, trigger a manual calendar sync in StudioSync: `python manage.py shell -c "from apps.gigs.tasks import sync_all_band_calendars; sync_all_band_calendars()"`.

**409 on band.created**

A user with that email already has an account. Have the band log in to 317booking and contact support to link the accounts. There is no automatic merge path to avoid accidental account takeover.
