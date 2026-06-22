import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * POST /api/setup
 *
 * One-time bootstrap: creates the first ADMIN user.
 * Returns 409 if any admin already exists — effectively locks itself after first use.
 * Remove or gate this route once your admin account is created.
 */
export async function POST(req: NextRequest) {
  try {
    // Lock after first admin is created
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "Setup already complete. An admin account already exists." },
        { status: 409 }
      );
    }

    const body = await req.json();
    const { email, password } = schema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);

    await prisma.user.create({
      data: { email, passwordHash, role: "ADMIN" },
    });

    return NextResponse.json({ ok: true, message: "Admin account created. You can now log in." }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
