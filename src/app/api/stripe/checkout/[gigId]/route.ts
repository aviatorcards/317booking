import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { appBaseUrl, checkoutIdempotencyKey, platformFeeCents } from "@/lib/payments";
import { formatShowDate } from "@/lib/timezone";

// POST /api/stripe/checkout/[gigId] — venue starts a single checkout for a confirmed gig
export async function POST(
  _req: NextRequest,
  { params }: { params: { gigId: string } }
) {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = appBaseUrl();

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Gig" WHERE id = ${params.gigId} FOR UPDATE`;
      const gig = await tx.gig.findUnique({
        where: { id: params.gigId },
        include: {
          venue: { select: { id: true, name: true, userId: true } },
          payTier: true,
          payment: true,
          claims: { where: { status: "CONFIRMED" }, include: { band: true } },
        },
      });
      if (!gig || gig.venue.userId !== session.user.id) {
        return { error: "Forbidden", status: 403 as const };
      }
      if (gig.status !== "CONFIRMED") {
        return { error: "Gig must be confirmed before payment", status: 409 as const };
      }
      if (gig.payment && (gig.payment.status === "PAID" || gig.payment.releasedAt)) {
        return { error: "Payment already completed", status: 409 as const };
      }

      const confirmedBand = gig.claims[0]?.band;
      if (!confirmedBand) return { error: "No confirmed band found", status: 409 as const };
      if (!confirmedBand.stripeAccountId) {
        return { error: "Band has not connected a Stripe account yet", status: 409 as const };
      }

      if (gig.payment?.stripeCheckoutSessionId && gig.payment.status === "PENDING") {
        const existing = await stripe.checkout.sessions.retrieve(gig.payment.stripeCheckoutSessionId);
        if (existing.status === "open" && existing.url) return { url: existing.url };
        if (existing.status === "complete") return { error: "Payment already completed", status: 409 as const };
      }

      const platformFee = platformFeeCents(gig.payTier.amount, gig.payTier.platformFeePercent);
      if (platformFee >= gig.payTier.amount) {
        return { error: "Platform fee must be less than the gig amount", status: 400 as const };
      }

      const attempt = (gig.payment?.checkoutAttempt ?? 0) + 1;
      const gigDate = formatShowDate(gig.date);
      const checkoutSession = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: "usd",
                unit_amount: gig.payTier.amount,
                product_data: {
                  name: `${confirmedBand.name} @ ${gig.venue.name}`,
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
          metadata: { gigId: gig.id, platformFee: String(platformFee) },
          success_url: `${base}/venue/gigs/${gig.id}?payment=success`,
          cancel_url: `${base}/venue/gigs/${gig.id}`,
        },
        { idempotencyKey: checkoutIdempotencyKey(gig.id, attempt) }
      );

      if (gig.payment) {
        await tx.payment.update({
          where: { id: gig.payment.id },
          data: {
            stripeCheckoutSessionId: checkoutSession.id,
            checkoutAttempt: attempt,
            amount: gig.payTier.amount,
            platformFee,
            status: "PENDING",
          },
        });
      } else {
        await tx.payment.create({
          data: {
            gigId: gig.id,
            amount: gig.payTier.amount,
            platformFee,
            status: "PENDING",
            stripeCheckoutSessionId: checkoutSession.id,
            checkoutAttempt: attempt,
          },
        });
      }

      return { url: checkoutSession.url };
    }, { timeout: 20000 });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ url: result.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
  }
}
