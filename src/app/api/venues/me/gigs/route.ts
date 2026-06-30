import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveVenue } from "@/lib/activeVenue";

// GET /api/venues/me/gigs?status=OPEN&upcoming=true
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const venue = await getActiveVenue(session.user.id);
  if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status"); // OPEN | PENDING | CONFIRMED | COMPLETED | CANCELLED
  const upcoming = searchParams.get("upcoming") === "true";

  const gigs = await prisma.gig.findMany({
    where: {
      venueId: venue.id,
      ...(status ? { status: status as "OPEN" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" } : {}),
      ...(upcoming ? { date: { gte: new Date() } } : {}),
    },
    include: {
      payTier: true,
      _count: { select: { claims: true } },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(gigs);
}
