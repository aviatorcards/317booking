import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

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
      if (gigId) {
        await prisma.payment.upsert({
          where: { gigId },
          create: {
            gigId,
            stripePaymentIntentId: pi.id,
            amount: pi.amount,
          },
          update: {
            stripePaymentIntentId: pi.id,
            amount: pi.amount,
          },
        });
      }
      break;
    }

    case "transfer.created": {
      // Mark payment as released when Stripe transfers to band
      const transfer = event.data.object;
      const gigId = transfer.metadata?.gigId;
      if (gigId) {
        await prisma.payment.update({
          where: { gigId },
          data: { releasedAt: new Date() },
        });
        await prisma.gig.update({
          where: { id: gigId },
          data: { status: "COMPLETED" },
        });
      }
      break;
    }

    default:
      console.log(`Unhandled Stripe event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
