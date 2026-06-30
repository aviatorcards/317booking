import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role === "ADMIN") {
    return NextResponse.json({ error: "Admin accounts cannot be self-deleted" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { password } = body as { password?: string };
  if (!password) return NextResponse.json({ error: "Password is required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      band: { select: { id: true, name: true } },
      venues: { select: { id: true, name: true }, take: 1 },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const valid = await compare(password, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Password is incorrect" }, { status: 400 });

  await logAuditEvent({
    event: "user.deleted",
    actorId: session.user.id,
    bandId: user.band?.id,
    venueId: user.venues?.[0]?.id,
    meta: {
      email: user.email,
      role: user.role,
      entityName: user.band?.name ?? user.venues?.[0]?.name ?? null,
      selfDeleted: true,
      accountCreatedAt: user.createdAt.toISOString(),
    },
  });

  await prisma.user.delete({ where: { id: session.user.id } });
  return NextResponse.json({ ok: true });
}
