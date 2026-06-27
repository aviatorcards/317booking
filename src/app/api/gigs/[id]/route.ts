import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyStudioSync } from "@/lib/studiosync";
import { logAuditEvent } from "@/lib/audit";
import { sendGigCancelledEmail } from "@/lib/email";

// GET /api/gigs/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: {
      venue: { select: { name: true, address: true, capacity: true } },
      payTier: true,
      claims: {
        include: { band: { select: { name: true, genre: true, bio: true } } },
        orderBy: { claimedAt: "asc" },
      },
    },
  });

  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(gig);
}

// PATCH /api/gigs/[id] — venue can cancel or update description
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venue.findUnique({ where: { userId: session.user.id } });
  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: { payTier: true },
  });

  if (!gig || !venue || gig.venueId !== venue.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      await notifyStudioSync({
        event: "gig.cancelled",
        gig: { id: params.id },
      });
    }
    void logAuditEvent({
      event: "gig.cancelled",
      actorId: session.user.id,
      gigId: params.id,
      venueId: venue.id,
      bandId: confirmedClaim?.band.id,
      meta: {
        previousStatus: gig.status,
        gigDate: gig.date.toISOString(),
        payAmount: gig.payTier.amount,
        confirmedBandId: confirmedClaim?.band.id ?? null,
        confirmedBandName: confirmedClaim?.band.name ?? null,
      },
    });

    // Email the confirmed band
    if (confirmedClaim) {
      void sendGigCancelledEmail({
        to: confirmedClaim.band.user.email,
        bandName: confirmedClaim.band.name,
        venueName: venue.name,
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
        venueName: venue.name,
        gigDate: gig.date,
      });
    }
  }

  const isOpen = gig.status === "OPEN";
  const updated = await prisma.gig.update({
    where: { id: params.id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.description !== undefined && { description: body.description }),
      ...(isOpen && body.date && { date: new Date(body.date) }),
      ...(isOpen && body.payTierId && { payTierId: body.payTierId }),
      ...(isOpen && body.claimMode && { claimMode: body.claimMode }),
    },
  });

  return NextResponse.json(updated);
}

