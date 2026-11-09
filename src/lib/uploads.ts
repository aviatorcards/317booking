import { randomBytes } from "crypto";
import { join } from "path";

const MIME_EXT: Record<string, "jpg" | "png" | "webp" | "gif"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export function uploadDir(): string {
  return process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
}

export function extensionForMime(mime: string): "jpg" | "png" | "webp" | "gif" | null {
  return MIME_EXT[mime] ?? null;
}

export function sniffImageMime(bytes: Buffer): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 6 && bytes.subarray(0, 6).toString("ascii") === "GIF87a") return "image/gif";
  if (bytes.length >= 6 && bytes.subarray(0, 6).toString("ascii") === "GIF89a") return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function validateImageUpload(bytes: Buffer, declaredMime: string): { ok: true; mime: string; ext: string } | { ok: false; error: string } {
  if (bytes.length === 0) return { ok: false, error: "Empty file" };
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, error: "Image must be 2MB or smaller" };
  const sniffed = sniffImageMime(bytes);
  if (!sniffed) return { ok: false, error: "Only JPEG, PNG, WebP, and GIF images are allowed" };
  if (declaredMime && declaredMime !== sniffed && extensionForMime(declaredMime) == null) {
    return { ok: false, error: "Only JPEG, PNG, WebP, and GIF images are allowed" };
  }
  const ext = extensionForMime(sniffed);
  if (!ext) return { ok: false, error: "Only JPEG, PNG, WebP, and GIF images are allowed" };
  return { ok: true, mime: sniffed, ext };
}

export function generatedUploadName(ext: string): string {
  return `${randomBytes(16).toString("hex")}.${ext}`;
}

export function isSafeUploadName(name: string): boolean {
  return /^[a-f0-9]{32}\.(jpg|png|webp|gif)$/.test(name);
}
