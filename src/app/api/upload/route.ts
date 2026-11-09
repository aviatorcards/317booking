import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { getSession } from "@/lib/auth";
import { generatedUploadName, uploadDir, validateImageUpload } from "@/lib/uploads";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.formData();
    const file = data.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const checked = validateImageUpload(bytes, file.type);
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

    const name = generatedUploadName(checked.ext);
    const dir = uploadDir();
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), bytes);

    return NextResponse.json({ url: `/api/uploads/${name}` });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
