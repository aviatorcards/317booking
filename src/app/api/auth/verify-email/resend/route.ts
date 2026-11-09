import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { hashToken, newToken } from "@/lib/tokens";
import { appBaseUrl } from "@/lib/payments";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = clientIp(req.headers);
  if (!rateLimit(`verify-resend:${session.user.id}`, 3, 60 * 60 * 1000) || !rateLimit(`verify-resend:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { band: { select: { name: true } }, venues: { take: 1, select: { name: true } } },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
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
  const name = user.band?.name ?? user.venues[0]?.name ?? user.email;
  const sent = await sendVerificationEmail({ to: user.email, name, verificationUrl });

  return NextResponse.json({
    ok: true,
    ...(sent || process.env.NODE_ENV === "production" ? {} : { devVerificationUrl: verificationUrl }),
  });
}
