import { createHmac } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

interface GigConfirmedPayload {
  id: string;
  date: string;
  studiosync_band_id: string;
  venue_name: string;
  venue_address: string;
  description: string;
}

interface GigCancelledPayload {
  id: string;
}

type WebhookPayload =
  | { event: "gig.confirmed"; gig: GigConfirmedPayload }
  | { event: "gig.cancelled"; gig: GigCancelledPayload };

function outboxUrl(): string | null {
  const base = process.env.STUDIOSYNC_URL;
  return base ? `${base}/api/gigs/webhooks/317booking/` : null;
}

// For use inside prisma.$transaction([...]) — commits atomically with surrounding business logic.
export function webhookOutboxOp(payload: WebhookPayload) {
  const url = outboxUrl();
  if (!url) return null;
  return prisma.webhookOutbox.create({
    data: { url, payload: payload as unknown as Prisma.InputJsonValue },
  });
}

// For use outside a transaction (cancel routes, etc.)
export async function notifyStudioSync(payload: WebhookPayload): Promise<void> {
  const url = outboxUrl();
  if (!url) return;
  await prisma.webhookOutbox.create({
    data: { url, payload: payload as unknown as Prisma.InputJsonValue },
  });
}

// Used by the drain worker — computes HMAC fresh at delivery time.
export function signPayload(body: string): Record<string, string> {
  const secret = process.env.STUDIOSYNC_WEBHOOK_SECRET;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) {
    headers["x-317booking-signature"] =
      `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  }
  return headers;
}
