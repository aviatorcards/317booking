import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/gigs?status=OPEN&month=YYYY-MM
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const month = searchParams.get("month");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (month) {
    const [year, mon] = month.split("-").map(Number);
    where.date = {
      gte: new Date(year, mon - 1, 1),
      lt: new Date(year, mon, 1),
    };
  }

  const gigs = await prisma.gig.findMany({
    where,
    include: {
      venue: { select: { name: true, address: true } },
      payTier: true,
      _count: { select: { claims: true } },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(gigs);
}

// POST /api/gigs — venue only
const schema = z.object({
  date: z.string().datetime(),
  payTierId: z.string(),
  description: z.string().optional(),
  claimMode: z.enum(["AUTO_ASSIGN", "VENUE_REVIEW"]).default("VENUE_REVIEW"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const data = schema.parse(body);

  const venue = await prisma.venue.findUnique({ where: { userId: session.user.id } });
  if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 });

  const tier = await prisma.payTier.findUnique({ where: { id: data.payTierId } });
  if (!tier) return NextResponse.json({ error: "Pay tier not found" }, { status: 404 });

  const gig = await prisma.gig.create({
    data: {
      venueId: venue.id,
      payTierId: data.payTierId,
      date: new Date(data.date),
      description: data.description ?? "",
      claimMode: data.claimMode,
    },
    include: { venue: true, payTier: true },
  });

  return NextResponse.json(gig, { status: 201 });
}
