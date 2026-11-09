import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { daysInMonth, isMonthLocked } from "@/lib/availability";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);

// GET /api/availability?month=YYYY-MM
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "BAND") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month = req.nextUrl.searchParams.get("month");
  if (!month || !monthSchema.safeParse(month).success) {
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
    locked: isMonthLocked(month),
  });
}

const schema = z.object({
  month: monthSchema,
  availableDates: z.array(z.number().int().min(1).max(31)),
}).superRefine((val, ctx) => {
  const max = daysInMonth(val.month);
  if (val.availableDates.some((day) => day > max)) {
    ctx.addIssue({ code: "custom", message: `Day must be between 1 and ${max}`, path: ["availableDates"] });
  }
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "BAND") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }
  const { month, availableDates } = parsed.data;
  if (isMonthLocked(month)) {
    return NextResponse.json({ error: "This month is locked" }, { status: 409 });
  }

  const band = await prisma.band.findUnique({ where: { userId: session.user.id } });
  if (!band) return NextResponse.json({ error: "Band not found" }, { status: 404 });

  const uniqueDates = Array.from(new Set(availableDates)).sort((a, b) => a - b);
  const avail = await prisma.availability.upsert({
    where: { bandId_month: { bandId: band.id, month } },
    create: { bandId: band.id, month, availableDates: uniqueDates },
    update: { availableDates: uniqueDates },
  });

  return NextResponse.json({ ...avail, locked: false });
}
