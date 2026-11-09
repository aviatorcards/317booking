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
  platformFeePercent: z.number().min(0).max(99).default(0),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  const data = parsed.data;

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

  try {
    await prisma.payTier.delete({ where: { id } });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "P2003" || code === "P2014") {
      return NextResponse.json({ error: "Pay tier is still used by a gig" }, { status: 409 });
    }
    if (code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
    throw err;
  }
  return NextResponse.json({ ok: true });
}
