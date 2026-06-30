import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { sendPaymentReleasedEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? ""
    );
  } catch (err) {
    console.error("Stripe webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      const gigId = pi.metadata?.gigId;
      const platformFee = pi.metadata?.platformFee ? parseInt(pi.metadata.platformFee, 10) : 0;
      if (gigId) {
        await prisma.payment.upsert({
          where: { gigId },
          create: { gigId, stripePaymentIntentId: pi.id, amount: pi.amount, platformFee },
          update: { stripePaymentIntentId: pi.id, amount: pi.amount, platformFee },
        });
        void logAuditEvent({
          event: "payment.received",
          gigId,
          meta: { stripePaymentIntentId: pi.id, amount: pi.amount, platformFee },
        });
      }
      break;
    }

    case "transfer.created": {
      const transfer = event.data.object;
      const gigId = transfer.metadata?.gigId;
      if (gigId) {
        const payment = await prisma.payment.update({
          where: { gigId },
          data: { releasedAt: new Date() },
        });
        const gig = await prisma.gig.update({
          where: { id: gigId },
          data: { status: "COMPLETED" },
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
          meta: { stripeTransferId: transfer.id, amount: transfer.amount },
        });

        const confirmedClaim = gig.claims[0];
        if (confirmedClaim) {
          const netAmount = payment.amount - payment.platformFee;
          void sendPaymentReleasedEmail({
            to: confirmedClaim.band.user.email,
            bandName: confirmedClaim.band.name,
            venueName: gig.venue.name,
            gigDate: gig.date,
            payAmount: netAmount,
          });
        }
      }
      break;
    }

    default:
      console.log(`Unhandled Stripe event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
