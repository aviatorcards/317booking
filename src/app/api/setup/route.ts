import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function GET() {
  const adminExists = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  return NextResponse.json({ completed: !!adminExists });
}

class SetupComplete extends Error {}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = schema.parse(body);
    const passwordHash = await hash(password, 12);

    await prisma.$transaction(async (tx) => {
      const existingAdmin = await tx.user.findFirst({ where: { role: "ADMIN" } });
      if (existingAdmin) throw new SetupComplete();
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing) {
        const err = new Error("Email already registered");
        (err as Error & { status: number }).status = 409;
        throw err;
      }
      await tx.user.create({
        data: { email, passwordHash, role: "ADMIN", emailVerified: new Date() },
      });
    });

    return NextResponse.json({ ok: true, message: "Admin account created. You can now log in." }, { status: 201 });
  } catch (err) {
    if (err instanceof SetupComplete) {
      return NextResponse.json(
        { error: "Setup already complete. An admin account already exists." },
        { status: 409 }
      );
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const coded = err as { code?: string; status?: number; message?: string };
    if (coded.code === "P2002") {
      return NextResponse.json(
        { error: "Setup already complete. An admin account already exists." },
        { status: 409 }
      );
    }
    if (coded.status === 409) {
      return NextResponse.json({ error: coded.message }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
