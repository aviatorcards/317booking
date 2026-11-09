import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveVenue } from "@/lib/activeVenue";
import { parseShowDateTime, zonedMonthRange } from "@/lib/timezone";

const PUBLIC_STATUSES = new Set(["OPEN", "PENDING"]);

// GET /api/gigs?status=OPEN&month=YYYY-MM
export async function GET(req: NextRequest) {
  const session = await getSession();
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const month = searchParams.get("month");

  if (status && !PUBLIC_STATUSES.has(status) && !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  else if (!session?.user?.id) where.status = { in: ["OPEN", "PENDING"] };

  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }
    where.date = zonedMonthRange(month);
  }

  const gigs = await prisma.gig.findMany({
    where,
    include: {
      venue: { select: { name: true, address: true } },
      payTier: true,
      _count: { select: { claims: true } },
    },
    orderBy: { date: "asc" },
    take: 100,
  });

  return NextResponse.json(gigs);
}

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/),
  payTierId: z.string().min(1),
  description: z.string().max(5000).optional(),
  claimMode: z.enum(["AUTO_ASSIGN", "VENUE_REVIEW"]).default("VENUE_REVIEW"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });
  if (!user?.emailVerified) {
    return NextResponse.json({ error: "Verify your email before posting a gig" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  let date: Date;
  try {
    date = parseShowDateTime(parsed.data.date);
  } catch {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const venue = await getActiveVenue(session.user.id);
  if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 });

  const tier = await prisma.payTier.findUnique({ where: { id: parsed.data.payTierId } });
  if (!tier) return NextResponse.json({ error: "Pay tier not found" }, { status: 404 });

  const gig = await prisma.gig.create({
    data: {
      venueId: venue.id,
      payTierId: parsed.data.payTierId,
      date,
      description: parsed.data.description ?? "",
      claimMode: parsed.data.claimMode,
    },
    include: { venue: true, payTier: true },
  });

  return NextResponse.json(gig, { status: 201 });
}
