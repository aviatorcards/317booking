import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { venueId } = await req.json();
  if (!venueId) return NextResponse.json({ error: "venueId required" }, { status: 400 });

  const venue = await prisma.venue.findFirst({ where: { id: venueId, userId: session.user.id } });
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  cookies().set("venue-active", venueId, { path: "/", httpOnly: true, sameSite: "lax" });
  return NextResponse.json({ ok: true });
}
