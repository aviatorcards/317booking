import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(200),
  capacity: z.coerce.number().int().min(1).max(100000),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const venue = await prisma.venue.create({
    data: { userId: session.user.id, ...parsed.data },
  });

  cookies().set("venue-active", venue.id, { path: "/", httpOnly: true, sameSite: "lax" });

  return NextResponse.json(venue, { status: 201 });
}
