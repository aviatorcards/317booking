import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1).max(100),
  genre: z.string().max(100).default(""),
  bio: z.string().max(1000).default(""),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "BAND") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const band = await prisma.band.update({
    where: { userId: session.user.id },
    data: parsed.data,
    select: { id: true, name: true, genre: true, bio: true },
  });

  return NextResponse.json(band);
}
