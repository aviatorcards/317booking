import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { hashToken, newToken } from "@/lib/tokens";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { appBaseUrl } from "@/lib/payments";

const bandSchema = z.object({
  role: z.literal("BAND"),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  genre: z.string().min(1).max(100),
  bio: z.string().max(1000).optional(),
});

const venueSchema = z.object({
  role: z.literal("VENUE"),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(200),
  capacity: z.coerce.number().int().positive().max(100000),
});

const schema = z.discriminatedUnion("role", [bandSchema, venueSchema]);

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hash(data.password, 12);
    const user = data.role === "BAND"
      ? await prisma.user.create({
          data: {
            email: data.email,
            passwordHash,
            role: "BAND",
            band: { create: { name: data.name, genre: data.genre, bio: data.bio ?? "" } },
          },
        })
      : await prisma.user.create({
          data: {
            email: data.email,
            passwordHash,
            role: "VENUE",
            venues: { create: { name: data.name, address: data.address, capacity: data.capacity } },
          },
        });

    const token = newToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    const verificationUrl = `${appBaseUrl()}/verify-email?token=${token}`;
    const sent = await sendVerificationEmail({ to: data.email, name: data.name, verificationUrl });

    return NextResponse.json(
      {
        ok: true,
        needsVerification: true,
        ...(sent || process.env.NODE_ENV === "production" ? {} : { devVerificationUrl: verificationUrl }),
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
