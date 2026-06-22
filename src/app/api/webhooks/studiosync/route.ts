import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  event: z.enum(["band.created", "band.updated"]),
  band: z.object({
    id: z.string(),          // StudioSync UUID — stored as externalId for linking back
    name: z.string().min(1),
    genre: z.string().default(""),
    billing_email: z.string().email(),
  }),
});

function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.STUDIOSYNC_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("STUDIOSYNC_WEBHOOK_SECRET not set — skipping signature check");
    return true; // allow in dev if secret not configured
  }
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const expectedBuf = Buffer.from(`sha256=${expected}`, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");

  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-studiosync-signature");

  if (!verifySignature(rawBody, signature)) {
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
    const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
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

    return NextResponse.json(
      {
        ok: true,
        bandId: user.band!.id,
        message: "Band registered. Send the band a password reset link so they can log in.",
      },
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
