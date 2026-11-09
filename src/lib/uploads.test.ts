import { describe, expect, it } from "vitest";
import { generatedUploadName, isSafeUploadName, validateImageUpload } from "./uploads";

function png(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
}

describe("upload validation", () => {
  it("accepts a PNG and ignores the original filename", () => {
    const result = validateImageUpload(png(), "image/png");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const name = generatedUploadName(result.ext);
    expect(name).toMatch(/^[a-f0-9]{32}\.png$/);
    expect(name.includes("..")).toBe(false);
    expect(isSafeUploadName(name)).toBe(true);
  });

  it("rejects non-images, spoofed names, and oversized files", () => {
    expect(validateImageUpload(Buffer.from("<html></html>"), "text/html").ok).toBe(false);
    expect(validateImageUpload(Buffer.from("not a png"), "image/png").ok).toBe(false);
    expect(isSafeUploadName("../../etc/passwd")).toBe(false);
    expect(isSafeUploadName("note.html")).toBe(false);
    const big = Buffer.alloc(2 * 1024 * 1024 + 1);
    big[0] = 0x89; big[1] = 0x50; big[2] = 0x4e; big[3] = 0x47;
    expect(validateImageUpload(big, "image/png").ok).toBe(false);
  });
});
