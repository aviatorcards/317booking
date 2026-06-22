import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/gigs/[id]/confirm/[bandId] — venue confirms a specific band
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; bandId: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venue.findUnique({ where: { userId: session.user.id } });
  const gig = await prisma.gig.findUnique({ where: { id: params.id } });

  if (!gig || !venue || gig.venueId !== venue.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (gig.status !== "PENDING" && gig.status !== "OPEN") {
    return NextResponse.json({ error: "Gig cannot be confirmed" }, { status: 409 });
  }

  // Confirm chosen band, reject all others
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
  ]);

  return NextResponse.json({ ok: true });
}
