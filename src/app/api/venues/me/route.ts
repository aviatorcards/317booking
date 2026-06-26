import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(200),
  capacity: z.number().int().min(1).max(100000),
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

  const venue = await prisma.venue.update({
    where: { userId: session.user.id },
    data: parsed.data,
    select: { id: true, name: true, address: true, capacity: true },
  });

  return NextResponse.json(venue);
}
