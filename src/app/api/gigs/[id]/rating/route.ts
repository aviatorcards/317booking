import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  note: z.string().max(500).default(""),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: {
      venue: { select: { id: true, userId: true } },
      claims: { where: { status: "CONFIRMED" }, select: { bandId: true } },
    },
  });

  if (!gig) return NextResponse.json({ error: "Gig not found" }, { status: 404 });
  if (gig.venue.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const venue = gig.venue;
  if (gig.status !== "COMPLETED") {
    return NextResponse.json({ error: "Can only rate completed gigs" }, { status: 400 });
  }

  const confirmedBandId = gig.claims[0]?.bandId;
  if (!confirmedBandId) {
    return NextResponse.json({ error: "No confirmed band on this gig" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const { rating, note } = parsed.data;

  const gigRating = await prisma.gigRating.upsert({
    where: { gigId: params.id },
    update: { rating, note },
    create: { gigId: params.id, venueId: venue.id, bandId: confirmedBandId, rating, note },
  });

  void logAuditEvent({
    event: "gig.rated",
    actorId: session.user.id,
    gigId: params.id,
    venueId: venue.id,
    bandId: confirmedBandId,
    meta: { rating, note },
  });

  return NextResponse.json(gigRating);
}
