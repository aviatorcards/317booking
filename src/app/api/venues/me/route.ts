import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveVenue } from "@/lib/activeVenue";

const schema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(200),
  capacity: z.number().int().min(1).max(100000),
  logoUrl: z.string().max(500).refine(
    (value) => value === "" || value.startsWith("/api/uploads/") || /^https:\/\/\S+$/.test(value),
    "Logo must be an uploaded image or an https URL"
  ).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const active = await getActiveVenue(session.user.id);
  if (!active) return NextResponse.json({ error: "Venue not found" }, { status: 404 });

  const venue = await prisma.venue.update({
    where: { id: active.id },
    data: parsed.data,
    select: { id: true, name: true, address: true, capacity: true, logoUrl: true },
  });

  return NextResponse.json(venue);
}
