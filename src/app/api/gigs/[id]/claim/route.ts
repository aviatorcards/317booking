import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyStudioSync } from "@/lib/studiosync";
import { sendGigClaimedEmail } from "@/lib/email";

// DELETE /api/gigs/[id]/claim — band withdraws a pending claim
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.user.role !== "BAND") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const band = await prisma.band.findUnique({ where: { userId: session.user.id } });
  if (!band) return NextResponse.json({ error: "Band not found" }, { status: 404 });

  const claim = await prisma.gigClaim.findUnique({
    where: { gigId_bandId: { gigId: params.id, bandId: band.id } },
  });
  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  if (claim.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only pending claims can be withdrawn" },
      { status: 409 }
    );
  }

  await prisma.gigClaim.delete({
    where: { gigId_bandId: { gigId: params.id, bandId: band.id } },
  });

  // If no other pending claims remain, revert gig to OPEN
  const remainingPending = await prisma.gigClaim.count({
    where: { gigId: params.id, status: "PENDING" },
  });
  if (remainingPending === 0) {
    await prisma.gig.update({
      where: { id: params.id },
      data: { status: "OPEN" },
    });
  }

  return NextResponse.json({ ok: true });
}

// POST /api/gigs/[id]/claim
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.user.role !== "BAND") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const band = await prisma.band.findUnique({ where: { userId: session.user.id } });
  if (!band) return NextResponse.json({ error: "Band not found" }, { status: 404 });

  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: {
      claims: true,
      venue: { include: { user: { select: { email: true } } } },
    },
  });
  if (!gig) return NextResponse.json({ error: "Gig not found" }, { status: 404 });
  if (gig.status !== "OPEN") {
    return NextResponse.json({ error: "Gig is not open for claims" }, { status: 409 });
  }

  // Check band is available on gig date
  const month = gig.date.toISOString().slice(0, 7);
  const day = gig.date.getUTCDate();
  const avail = await prisma.availability.findUnique({
    where: { bandId_month: { bandId: band.id, month } },
  });
  if (!avail || !avail.availableDates.includes(day)) {
    return NextResponse.json(
      { error: "You haven't marked yourself available on this date" },
      { status: 400 }
    );
  }

  // Check not already claimed
  const existing = await prisma.gigClaim.findUnique({
    where: { gigId_bandId: { gigId: gig.id, bandId: band.id } },
  });
  if (existing) return NextResponse.json({ error: "Already claimed" }, { status: 409 });

  // Auto-assign: first claim confirms immediately.
  // Use updateMany as a CAS so concurrent requests can't both win.
  if (gig.claimMode === "AUTO_ASSIGN") {
    const claim = await prisma.$transaction(async (tx) => {
      const { count } = await tx.gig.updateMany({
        where: { id: gig.id, status: "OPEN" },
        data: { status: "CONFIRMED" },
      });
      if (count === 0) return null;
      return tx.gigClaim.create({
        data: { gigId: gig.id, bandId: band.id, status: "CONFIRMED" },
      });
    });

    if (!claim) {
      return NextResponse.json({ error: "Gig is not open for claims" }, { status: 409 });
    }

    if (band.studiosyncId) {
      void notifyStudioSync({
        event: "gig.confirmed",
        gig: {
          id: gig.id,
          date: gig.date.toISOString(),
          studiosync_band_id: band.studiosyncId,
          venue_name: gig.venue.name,
          venue_address: gig.venue.address,
          description: gig.description,
        },
      });
    }

    return NextResponse.json(claim, { status: 201 });
  }

  // Venue review: claim goes pending, gig moves to PENDING if first claim
  const claim = await prisma.gigClaim.create({
    data: { gigId: gig.id, bandId: band.id },
  });
  if (gig.status === "OPEN") {
    await prisma.gig.update({ where: { id: gig.id }, data: { status: "PENDING" } });
  }

  void sendGigClaimedEmail({
    to: gig.venue.user.email,
    venueName: gig.venue.name,
    bandName: band.name,
    bandGenre: band.genre,
    gigDate: gig.date,
    gigId: gig.id,
  });

  return NextResponse.json(claim, { status: 201 });
}
