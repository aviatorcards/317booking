import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { verifyStudioSyncSignature } from "@/lib/studiosync";
import { hashToken, newToken } from "@/lib/tokens";

const schema = z.object({
  event: z.enum(["band.created", "band.updated"]),
  band: z.object({
    id: z.string(),          // StudioSync UUID — stored as externalId for linking back
    name: z.string().min(1),
    genre: z.string().default(""),
    billing_email: z.string().email(),
  }),
});

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-studiosync-signature");
  const secret = process.env.STUDIOSYNC_WEBHOOK_SECRET;

  if (!secret) {
    console.error("STUDIOSYNC_WEBHOOK_SECRET is not set — rejecting webhook");
    return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 500 });
  }
  if (!verifyStudioSyncSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const { event, band: bandData } = parsed.data;

  if (event === "band.created") {
    // Idempotency: skip if this StudioSync band is already registered
    const existing = await prisma.band.findFirst({
      where: { studiosyncId: bandData.id },
    });
    if (existing) {
      return NextResponse.json({ ok: true, bandId: existing.id, skipped: true });
    }

    // Also skip if the email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: bandData.billing_email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists. Have the band log in and link their accounts." },
        { status: 409 }
      );
    }

    // Generate a random initial password — band must reset via email
    const tempPassword = randomBytes(24).toString("base64url");
    const passwordHash = await hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        email: bandData.billing_email,
        passwordHash,
        role: "BAND",
        band: {
          create: {
            name: bandData.name,
            genre: bandData.genre,
            studiosyncId: bandData.id,
          },
        },
      },
      include: { band: true },
    });

    const appUrl = process.env.NEXTAUTH_URL ?? "";
    const icalUrl = appUrl ? `${appUrl}/api/bands/${user.band!.id}/calendar.ics` : null;

    // Send the band a password-set email so they can log in
    const resetToken = newToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashToken(resetToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days for first-time setup
      },
    });
    void sendPasswordResetEmail({ to: bandData.billing_email, name: bandData.name, token: resetToken, isNewAccount: true });

    return NextResponse.json(
      { ok: true, bandId: user.band!.id, icalUrl },
      { status: 201 }
    );
  }

  if (event === "band.updated") {
    const band = await prisma.band.findFirst({
      where: { studiosyncId: bandData.id },
    });
    if (!band) {
      return NextResponse.json({ error: "Band not found — send band.created first" }, { status: 404 });
    }

    await prisma.band.update({
      where: { id: band.id },
      data: {
        name: bandData.name,
        genre: bandData.genre,
      },
    });

    return NextResponse.json({ ok: true, bandId: band.id });
  }

  return NextResponse.json({ error: "Unknown event" }, { status: 400 });
}
