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
      const bandId = pi.metadata?.bandId;
      if (gigId) {
        const gig = await prisma.gig.findUnique({
          where: { id: gigId },
          include: { payTier: true },
        });
        const platformFee = gig
          ? Math.round(pi.amount * (gig.payTier.platformFeePercent / 100))
          : 0;

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

        // Transfer payout to band's Stripe Connect account
        if (bandId) {
          const band = await prisma.band.findUnique({ where: { id: bandId } });
          if (band?.stripeAccountId) {
            const payoutAmount = pi.amount - platformFee;
            try {
              await stripe.transfers.create({
                amount: payoutAmount,
                currency: "usd",
                destination: band.stripeAccountId,
                metadata: { gigId, bandId },
              });
            } catch (err) {
              console.error("Stripe transfer failed:", err);
            }
          }
        }
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
