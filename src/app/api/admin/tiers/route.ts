import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

// GET /api/admin/tiers
export async function GET() {
  const tiers = await prisma.payTier.findMany({ orderBy: { amount: "asc" } });
  return NextResponse.json(tiers);
}

// POST /api/admin/tiers
const schema = z.object({
  name: z.string().min(1),
  amount: z.number().int().positive(), // cents
  platformFeePercent: z.number().min(0).max(100).default(0),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const data = schema.parse(body);

  const tier = await prisma.payTier.create({ data });
  return NextResponse.json(tier, { status: 201 });
}

// DELETE /api/admin/tiers?id=...
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.payTier.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
