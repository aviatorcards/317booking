import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { claimGig, withdrawClaim } from "@/lib/booking";
import { logAuditEvent } from "@/lib/audit";
import { sendClaimConfirmedEmail, sendGigClaimedEmail } from "@/lib/email";

// DELETE /api/gigs/[id]/claim — band withdraws a pending claim
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "BAND") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await withdrawClaim(prisma, { gigId: params.id, userId: session.user.id });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}

// POST /api/gigs/[id]/claim
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "BAND") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await claimGig(prisma, { gigId: params.id, userId: session.user.id });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  if (result.autoAssigned) {
    if (result.bandEmail) {
      void sendClaimConfirmedEmail({
        to: result.bandEmail,
        bandName: result.bandName,
        venueName: result.venueName,
        venueAddress: result.venueAddress,
        gigDate: result.gigDate,
        payAmount: result.payAmount,
      });
    }
    void logAuditEvent({
      event: "claim.confirmed",
      actorId: session.user.id,
      gigId: params.id,
      meta: { autoAssigned: true, gigDate: result.gigDate.toISOString(), payAmount: result.payAmount },
    });
  } else if (result.venueEmail) {
    void sendGigClaimedEmail({
      to: result.venueEmail,
      venueName: result.venueName,
      bandName: result.bandName,
      bandGenre: result.bandGenre,
      gigDate: result.gigDate,
      gigId: params.id,
    });
  }

  return NextResponse.json({ id: result.claimId, status: result.status }, { status: 201 });
}
