import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (params.id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      band: { select: { id: true, name: true } },
      venues: { select: { id: true, name: true }, take: 1 },
    },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "Cannot delete another admin account" }, { status: 400 });
  }

  // Log before deleting so the snapshot is accurate
  await logAuditEvent({
    event: "user.deleted",
    actorId: session.user.id,
    bandId: target.band?.id,
    venueId: target.venues?.[0]?.id,
    meta: {
      email: target.email,
      role: target.role,
      entityName: target.band?.name ?? target.venues?.[0]?.name ?? null,
      accountCreatedAt: target.createdAt.toISOString(),
    },
  });

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
