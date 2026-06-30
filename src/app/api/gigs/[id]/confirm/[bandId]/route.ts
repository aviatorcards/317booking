import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { webhookOutboxOp } from "@/lib/studiosync";
import { logAuditEvent } from "@/lib/audit";
import { sendClaimConfirmedEmail, sendClaimRejectedEmail } from "@/lib/email";

// POST /api/gigs/[id]/confirm/[bandId] — venue confirms a specific band
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; bandId: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: {
      venue: { select: { id: true, name: true, address: true, userId: true } },
      payTier: { select: { amount: true } },
      _count: { select: { claims: true } },
      claims: {
        include: { band: { include: { user: { select: { email: true } } } } },
      },
    },
  });

  if (!gig || gig.venue.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const venue = gig.venue;
  if (gig.status !== "PENDING" && gig.status !== "OPEN") {
    return NextResponse.json({ error: "Gig cannot be confirmed" }, { status: 409 });
  }

  // Look up studiosyncId before the transaction so we can include the outbox write atomically
  const band = await prisma.band.findUnique({
    where: { id: params.bandId },
    select: { studiosyncId: true },
  });

  const outboxOp = band?.studiosyncId
    ? webhookOutboxOp({
        event: "gig.confirmed",
        gig: {
          id: gig.id,
          date: gig.date.toISOString(),
          studiosync_band_id: band.studiosyncId,
          venue_name: gig.venue.name,
          venue_address: gig.venue.address,
          description: gig.description,
        },
      })
    : null;

  // Confirm chosen band, reject all others, and enqueue the outbox event atomically
  await prisma.$transaction([
    prisma.gigClaim.update({
      where: { gigId_bandId: { gigId: gig.id, bandId: params.bandId } },
      data: { status: "CONFIRMED" },
    }),
    prisma.gigClaim.updateMany({
      where: { gigId: gig.id, bandId: { not: params.bandId } },
      data: { status: "REJECTED" },
    }),
    prisma.gig.update({
      where: { id: gig.id },
      data: { status: "CONFIRMED" },
    }),
    ...(outboxOp ? [outboxOp] : []),
  ]);

  // Send emails to all claimants
  for (const claim of gig.claims) {
    if (claim.bandId === params.bandId) {
      void sendClaimConfirmedEmail({
        to: claim.band.user.email,
        bandName: claim.band.name,
        venueName: gig.venue.name,
        venueAddress: gig.venue.address,
        gigDate: gig.date,
        payAmount: gig.payTier.amount,
      });
    } else {
      void sendClaimRejectedEmail({
        to: claim.band.user.email,
        bandName: claim.band.name,
        venueName: gig.venue.name,
        gigDate: gig.date,
      });
    }
  }

  void logAuditEvent({
    event: "claim.confirmed",
    actorId: session.user.id,
    gigId: gig.id,
    bandId: params.bandId,
    venueId: venue.id,
    meta: {
      gigDate: gig.date.toISOString(),
      payAmount: gig.payTier.amount,
      totalClaimants: gig._count.claims,
      rejectedCount: gig._count.claims - 1,
    },
  });

  return NextResponse.json({ ok: true });
}
