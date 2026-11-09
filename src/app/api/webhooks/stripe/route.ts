import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { sendPaymentReleasedEmail } from "@/lib/email";
import { recordPaidGig } from "@/lib/payments";

async function notifyPaid(gigId: string, amount: number, platformFee: number, reference: string) {
  const gig = await prisma.gig.findUnique({
    where: { id: gigId },
    include: {
      venue: { select: { name: true } },
      claims: {
        where: { status: "CONFIRMED" },
        include: { band: { include: { user: { select: { email: true } } } } },
      },
    },
  });
  void logAuditEvent({
    event: "payment.released",
    gigId,
    meta: { reference, amount, platformFee },
  });
  const confirmed = gig?.claims[0];
  if (gig && confirmed) {
    void sendPaymentReleasedEmail({
      to: confirmed.band.user.email,
      bandName: confirmed.band.name,
      venueName: gig.venue.name,
      gigDate: gig.date,
      payAmount: amount - platformFee,
    });
  }
}

function feeFromMetadata(meta: Stripe.Metadata | null | undefined, amount: number): number {
  if (meta?.platformFee) {
    const parsed = parseInt(meta.platformFee, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("Stripe webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const gigId = session.metadata?.gigId;
      if (!gigId || session.payment_status !== "paid") break;
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
      const amount = session.amount_total ?? 0;
      const platformFee = feeFromMetadata(session.metadata, amount);
      const first = await recordPaidGig(prisma, {
        gigId,
        paymentIntentId,
        checkoutSessionId: session.id,
        amount,
        platformFee,
      });
      if (first) {
        void logAuditEvent({
          event: "payment.received",
          gigId,
          meta: { stripeCheckoutSessionId: session.id, stripePaymentIntentId: paymentIntentId, amount, platformFee },
        });
        await notifyPaid(gigId, amount, platformFee, session.id);
      }
      break;
    }

    case "payment_intent.succeeded": {
      const pi = event.data.object;
      const gigId = pi.metadata?.gigId;
      if (!gigId) break;
      const platformFee = feeFromMetadata(pi.metadata, pi.amount);
      const first = await recordPaidGig(prisma, {
        gigId,
        paymentIntentId: pi.id,
        amount: pi.amount,
        platformFee,
      });
      if (first) {
        void logAuditEvent({
          event: "payment.received",
          gigId,
          meta: { stripePaymentIntentId: pi.id, amount: pi.amount, platformFee },
        });
        await notifyPaid(gigId, pi.amount, platformFee, pi.id);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
