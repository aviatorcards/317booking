import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/availability?month=YYYY-MM
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "BAND") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month = req.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  const band = await prisma.band.findUnique({ where: { userId: session.user.id } });
  if (!band) return NextResponse.json({ error: "Band not found" }, { status: 404 });

  const avail = await prisma.availability.findUnique({
    where: { bandId_month: { bandId: band.id, month } },
  });

  return NextResponse.json({
    month,
    availableDates: avail?.availableDates ?? [],
    locked: false,
  });
}

// POST /api/availability
const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  availableDates: z.array(z.number().int().min(1).max(31)),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "BAND") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { month, availableDates } = schema.parse(body);

  const band = await prisma.band.findUnique({ where: { userId: session.user.id } });
  if (!band) return NextResponse.json({ error: "Band not found" }, { status: 404 });

  const avail = await prisma.availability.upsert({
    where: { bandId_month: { bandId: band.id, month } },
    create: { bandId: band.id, month, availableDates },
    update: { availableDates },
  });

  return NextResponse.json(avail);
}
