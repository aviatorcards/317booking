import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelGig } from "@/lib/booking";
import { logAuditEvent } from "@/lib/audit";
import { sendGigCancelledEmail } from "@/lib/email";
import { parseShowDateTime } from "@/lib/timezone";

const patchSchema = z.object({
  status: z.literal("CANCELLED").optional(),
  description: z.string().max(5000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/).optional(),
  payTierId: z.string().optional(),
  claimMode: z.enum(["AUTO_ASSIGN", "VENUE_REVIEW"]).optional(),
});

// GET /api/gigs/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: {
      venue: { select: { id: true, name: true, address: true, capacity: true, userId: true } },
      payTier: true,
      claims: {
        include: { band: { select: { id: true, name: true, genre: true, bio: true, userId: true } } },
        orderBy: { claimedAt: "asc" },
      },
    },
  });

  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = session?.user?.role === "VENUE" && gig.venue.userId === session.user.id;
  const myBand = session?.user?.role === "BAND"
    ? await prisma.band.findUnique({ where: { userId: session.user.id }, select: { id: true } })
    : null;

  const claims = gig.claims
    .filter((claim) => isOwner || (myBand && claim.bandId === myBand.id))
    .map((claim) => ({
      id: claim.id,
      status: claim.status,
      claimedAt: claim.claimedAt,
      band: isOwner
        ? { name: claim.band.name, genre: claim.band.genre, bio: claim.band.bio }
        : { name: claim.band.name, genre: claim.band.genre },
    }));

  const { userId: _userId, ...venue } = gig.venue;
  return NextResponse.json({ ...gig, venue, claims });
}

// PATCH /api/gigs/[id] — venue can cancel or update an open gig
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  if (parsed.data.status === "CANCELLED") {
    const result = await cancelGig(prisma, {
      gigId: params.id,
      actorUserId: session.user.id,
      asAdmin: false,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

    void logAuditEvent({
      event: "gig.cancelled",
      actorId: session.user.id,
      gigId: params.id,
      venueId: result.venueId,
      bandId: result.confirmedBandId ?? undefined,
      meta: {
        previousStatus: result.previousStatus,
        gigDate: result.gigDate.toISOString(),
        payAmount: result.payAmount,
        confirmedBandId: result.confirmedBandId,
        confirmedBandName: result.confirmedBandName,
      },
    });
    const venue = await prisma.venue.findUnique({ where: { id: result.venueId }, select: { name: true } });
    for (const recipient of result.recipients) {
      void sendGigCancelledEmail({
        to: recipient.email,
        bandName: recipient.bandName,
        venueName: venue?.name ?? "the venue",
        gigDate: result.gigDate,
      });
    }
    const updated = await prisma.gig.findUnique({ where: { id: params.id } });
    return NextResponse.json(updated);
  }

  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: { venue: { select: { userId: true } } },
  });
  if (!gig || gig.venue.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isOpen = gig.status === "OPEN";
  let date: Date | undefined;
  if (parsed.data.date) {
    if (!isOpen) return NextResponse.json({ error: "Date cannot be changed after a claim" }, { status: 409 });
    try {
      date = parseShowDateTime(parsed.data.date);
    } catch {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
  }

  const updated = await prisma.gig.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(date && { date }),
      ...(isOpen && parsed.data.payTierId && { payTierId: parsed.data.payTierId }),
      ...(isOpen && parsed.data.claimMode && { claimMode: parsed.data.claimMode }),
    },
  });

  return NextResponse.json(updated);
}
