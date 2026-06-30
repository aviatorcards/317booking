import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getActiveVenue } from "@/lib/activeVenue";

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const venue = await getActiveVenue(session.user.id);
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: venue.id,
    name: venue.name,
    address: venue.address,
    capacity: venue.capacity,
    logoUrl: venue.logoUrl,
  });
}
