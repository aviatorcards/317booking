import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z
  .object({
    currentPassword: z.string().min(1),
    email: z.string().email().optional(),
    newPassword: z.string().min(8).optional(),
  })
  .refine((d) => d.email !== undefined || d.newPassword !== undefined, {
    message: "Provide a new email or a new password",
  });

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { currentPassword, email, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const valid = await compare(currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  if (email && email !== user.email) {
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(email ? { email } : {}),
      ...(newPassword
        ? { passwordHash: await hash(newPassword, 12), sessionVersion: { increment: 1 } }
        : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
