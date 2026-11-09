import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { appBaseUrl } from "@/lib/payments";

// GET /api/stripe/connect — return band's Stripe account status
export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== "BAND") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const band = await prisma.band.findUnique({ where: { userId: session.user.id } });
  if (!band) return NextResponse.json({ error: "Band not found" }, { status: 404 });

  if (!band.stripeAccountId) {
    return NextResponse.json({ connected: false, chargesEnabled: false });
  }

  const account = await stripe.accounts.retrieve(band.stripeAccountId);
  return NextResponse.json({
    connected: true,
    chargesEnabled: account.charges_enabled,
  });
}

// POST /api/stripe/connect — create/retrieve account and return an onboarding link
export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "BAND") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const band = await prisma.band.findUnique({ where: { userId: session.user.id } });
  if (!band) return NextResponse.json({ error: "Band not found" }, { status: 404 });

  let accountId = band.stripeAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({ type: "express" });
    accountId = account.id;
    await prisma.band.update({
      where: { id: band.id },
      data: { stripeAccountId: accountId },
    });
  }

  const base = appBaseUrl();
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/band/settings?stripe=refresh`,
    return_url: `${base}/band/settings?stripe=success`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
