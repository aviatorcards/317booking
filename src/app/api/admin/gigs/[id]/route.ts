import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyStudioSync } from "@/lib/studiosync";
import { logAuditEvent } from "@/lib/audit";
import { sendGigCancelledEmail } from "@/lib/email";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: { payTier: true, venue: { select: { name: true } } },
  });
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (gig.status === "COMPLETED") {
    return NextResponse.json({ error: "Cannot modify a completed gig" }, { status: 400 });
  }

  const body = await req.json();

  if (body.status !== undefined && body.status !== "CANCELLED") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (body.status === "CANCELLED") {
    const confirmedClaim = await prisma.gigClaim.findFirst({
      where: { gigId: params.id, status: "CONFIRMED" },
      include: { band: { select: { id: true, name: true, studiosyncId: true, user: { select: { email: true } } } } },
    });
    if (confirmedClaim?.band.studiosyncId) {
      await notifyStudioSync({ event: "gig.cancelled", gig: { id: params.id } });
    }
    void logAuditEvent({
      event: "gig.cancelled",
      actorId: session.user.id,
      gigId: params.id,
      venueId: gig.venueId,
      bandId: confirmedClaim?.band.id,
      meta: {
        previousStatus: gig.status,
        gigDate: gig.date.toISOString(),
        payAmount: gig.payTier.amount,
        confirmedBandId: confirmedClaim?.band.id ?? null,
        confirmedBandName: confirmedClaim?.band.name ?? null,
        cancelledByAdmin: true,
      },
    });

    // Email the confirmed band
    if (confirmedClaim) {
      void sendGigCancelledEmail({
        to: confirmedClaim.band.user.email,
        bandName: confirmedClaim.band.name,
        venueName: gig.venue.name,
        gigDate: gig.date,
      });
    }

    // Email any pending claimants
    const pendingClaims = await prisma.gigClaim.findMany({
      where: { gigId: params.id, status: "PENDING" },
      include: { band: { select: { name: true, user: { select: { email: true } } } } },
    });
    for (const claim of pendingClaims) {
      void sendGigCancelledEmail({
        to: claim.band.user.email,
        bandName: claim.band.name,
        venueName: gig.venue.name,
        gigDate: gig.date,
      });
    }
  }

  const updated = await prisma.gig.update({
    where: { id: params.id },
    data: { ...(body.status && { status: body.status }) },
  });

  return NextResponse.json(updated);
}
