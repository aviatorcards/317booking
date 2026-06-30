import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// POST /api/stripe/checkout/[gigId] — venue initiates payment for a confirmed gig
export async function POST(
  req: NextRequest,
  { params }: { params: { gigId: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gig = await prisma.gig.findUnique({
    where: { id: params.gigId },
    include: {
      venue: { select: { id: true, name: true, userId: true } },
      payTier: true,
      payment: true,
      claims: {
        where: { status: "CONFIRMED" },
        include: { band: true },
      },
    },
  });

  if (!gig || gig.venue.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const venue = gig.venue;
  if (gig.status !== "CONFIRMED") {
    return NextResponse.json({ error: "Gig must be confirmed before payment" }, { status: 409 });
  }
  if (gig.payment) {
    return NextResponse.json({ error: "Payment already initiated" }, { status: 409 });
  }

  const confirmedBand = gig.claims[0]?.band;
  if (!confirmedBand) {
    return NextResponse.json({ error: "No confirmed band found" }, { status: 409 });
  }

  if (!confirmedBand.stripeAccountId) {
    return NextResponse.json(
      { error: "Band has not connected a Stripe account yet" },
      { status: 409 }
    );
  }

  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "";
  const gigDate = gig.date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const platformFee = Math.round(gig.payTier.amount * (gig.payTier.platformFeePercent / 100));

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: gig.payTier.amount,
          product_data: {
            name: `${confirmedBand.name} @ ${venue.name}`,
            description: `Gig on ${gigDate}`,
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: platformFee,
      transfer_data: { destination: confirmedBand.stripeAccountId },
      metadata: {
        gigId: gig.id,
        bandId: confirmedBand.id,
        platformFee: String(platformFee),
      },
    },
    metadata: { gigId: gig.id },
    success_url: `${origin}/venue/gigs/${gig.id}?payment=success`,
    cancel_url: `${origin}/venue/gigs/${gig.id}`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
