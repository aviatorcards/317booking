import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { hashToken, newToken } from "@/lib/tokens";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`forgot:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (!rateLimit(`forgot:${parsed.data.email.toLowerCase()}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { band: true, venues: { take: 1 } },
  });

  // Always return 200 to avoid leaking which emails are registered
  if (!user) return NextResponse.json({ ok: true });

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = newToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const name = user.band?.name ?? user.venues?.[0]?.name ?? user.email;
  void sendPasswordResetEmail({ to: user.email, name, token });

  return NextResponse.json({ ok: true });
}
