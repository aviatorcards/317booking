import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelGig } from "@/lib/booking";
import { logAuditEvent } from "@/lib/audit";
import { sendGigCancelledEmail } from "@/lib/email";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || body.status !== "CANCELLED") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const result = await cancelGig(prisma, {
    gigId: params.id,
    actorUserId: session.user.id,
    asAdmin: true,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  void logAuditEvent({
    event: "gig.cancelled",
    actorId: session.user.id,
    gigId: params.id,
    venueId: result.venueId,
    bandId: result.confirmedBandId ?? undefined,
    meta: {
      previousStatus: result.previousStatus,
      gigDate: result.gigDate.toISOString(),
      payAmount: result.payAmount,
      confirmedBandId: result.confirmedBandId,
      confirmedBandName: result.confirmedBandName,
      cancelledByAdmin: true,
    },
  });

  const venue = await prisma.venue.findUnique({ where: { id: result.venueId }, select: { name: true } });
  for (const recipient of result.recipients) {
    void sendGigCancelledEmail({
      to: recipient.email,
      bandName: recipient.bandName,
      venueName: venue?.name ?? "the venue",
      gigDate: result.gigDate,
    });
  }

  const updated = await prisma.gig.findUnique({ where: { id: params.id } });
  return NextResponse.json(updated);
}
