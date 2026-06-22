import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    include: { claims: true },
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

  // Auto-assign: first claim confirms immediately
  if (gig.claimMode === "AUTO_ASSIGN") {
    const [claim] = await prisma.$transaction([
      prisma.gigClaim.create({
        data: { gigId: gig.id, bandId: band.id, status: "CONFIRMED" },
      }),
      prisma.gig.update({
        where: { id: gig.id },
        data: { status: "CONFIRMED" },
      }),
    ]);
    return NextResponse.json(claim, { status: 201 });
  }

  // Venue review: claim goes pending, gig moves to PENDING if first claim
  const claim = await prisma.gigClaim.create({
    data: { gigId: gig.id, bandId: band.id },
  });
  if (gig.status === "OPEN") {
    await prisma.gig.update({ where: { id: gig.id }, data: { status: "PENDING" } });
  }

  return NextResponse.json(claim, { status: 201 });
}
