import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bandSchema = z.object({
  role: z.literal("BAND"),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  genre: z.string().min(1),
  bio: z.string().optional(),
});

const venueSchema = z.object({
  role: z.literal("VENUE"),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  address: z.string().min(1),
  capacity: z.coerce.number().int().positive(),
});

const schema = z.discriminatedUnion("role", [bandSchema, venueSchema]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hash(data.password, 12);

    if (data.role === "BAND") {
      await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: "BAND",
          band: {
            create: {
              name: data.name,
              genre: data.genre,
              bio: data.bio ?? "",
            },
          },
        },
      });
    } else {
      await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: "VENUE",
          venue: {
            create: {
              name: data.name,
              address: data.address,
              capacity: data.capacity,
            },
          },
        },
      });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
