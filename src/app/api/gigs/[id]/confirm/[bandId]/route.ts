import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { confirmGigClaim } from "@/lib/booking";
import { logAuditEvent } from "@/lib/audit";
import { sendClaimConfirmedEmail, sendClaimRejectedEmail } from "@/lib/email";

// POST /api/gigs/[id]/confirm/[bandId] — venue confirms a specific band
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; bandId: string } }
) {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await confirmGigClaim(prisma, {
    gigId: params.id,
    bandId: params.bandId,
    actorUserId: session.user.id,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  void sendClaimConfirmedEmail({
    to: result.confirmed.email,
    bandName: result.confirmed.bandName,
    venueName: result.confirmed.venueName,
    venueAddress: result.confirmed.venueAddress,
    gigDate: result.gigDate,
    payAmount: result.payAmount,
  });
  for (const rejected of result.rejected) {
    void sendClaimRejectedEmail({
      to: rejected.email,
      bandName: rejected.bandName,
      venueName: result.confirmed.venueName,
      gigDate: result.gigDate,
    });
  }

  void logAuditEvent({
    event: "claim.confirmed",
    actorId: session.user.id,
    gigId: result.gigId,
    bandId: result.bandId,
    venueId: result.venueId,
    meta: {
      gigDate: result.gigDate.toISOString(),
      payAmount: result.payAmount,
      totalClaimants: result.totalClaimants,
      rejectedCount: result.rejected.length,
    },
  });

  return NextResponse.json({ ok: true });
}
