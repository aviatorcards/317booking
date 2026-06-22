import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const gig = await prisma.gig.findUnique({ where: { id: params.id } });

  if (!gig || !venue || gig.venueId !== venue.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.gig.update({
    where: { id: params.id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.description !== undefined && { description: body.description }),
    },
  });

  return NextResponse.json(updated);
}
