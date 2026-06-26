import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/bands/me/gigs?status=CONFIRMED&upcoming=true
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "BAND") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const band = await prisma.band.findUnique({ where: { userId: session.user.id } });
  if (!band) return NextResponse.json({ error: "Band not found" }, { status: 404 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status"); // PENDING | CONFIRMED | REJECTED
  const upcoming = searchParams.get("upcoming") === "true";

  const claims = await prisma.gigClaim.findMany({
    where: {
      bandId: band.id,
      ...(status ? { status: status as "PENDING" | "CONFIRMED" | "REJECTED" } : {}),
      ...(upcoming ? { gig: { date: { gte: new Date() } } } : {}),
    },
    include: {
      gig: {
        include: {
          venue: { select: { id: true, name: true, address: true } },
          payTier: true,
        },
      },
    },
    orderBy: { gig: { date: "asc" } },
  });

  return NextResponse.json(claims);
}
