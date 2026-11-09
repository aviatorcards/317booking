import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const ALLOWED_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "EMAIL_FROM",
];

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ALLOWED_KEYS } },
  });

  const config = ALLOWED_KEYS.reduce((acc, key) => {
    const s = settings.find((x) => x.key === key);
    if (key === "SMTP_PASS") {
      acc[key] = "";
      acc.SMTP_PASS_SET = s?.value ? "true" : "";
    } else {
      acc[key] = s ? s.value : "";
    }
    return acc;
  }, {} as Record<string, string>);

  return NextResponse.json(config);
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  for (const key of ALLOWED_KEYS) {
    if (key === "SMTP_PASS" && (body[key] === "" || body[key] === "********")) continue;
    if (body[key] !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(body[key]) },
        create: { key, value: String(body[key]) },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
