import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== "BAND") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const band = await prisma.band.findUnique({
    where: { userId: session.user.id },
    select: { id: true, name: true, genre: true, bio: true },
  });

  if (!band) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(band);
}
