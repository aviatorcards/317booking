import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyStudioSyncSignature } from "./studiosync";

describe("StudioSync webhook signatures", () => {
  const body = JSON.stringify({ event: "band.created" });
  const secret = "test-secret";

  it("rejects when the secret is missing", () => {
    expect(verifyStudioSyncSignature(body, "sha256=abc", undefined)).toBe(false);
    expect(verifyStudioSyncSignature(body, "sha256=abc", "")).toBe(false);
  });

  it("rejects a missing or wrong signature", () => {
    expect(verifyStudioSyncSignature(body, null, secret)).toBe(false);
    expect(verifyStudioSyncSignature(body, "sha256=deadbeef", secret)).toBe(false);
  });

  it("accepts an HMAC of the raw body", () => {
    const sig = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
    expect(verifyStudioSyncSignature(body, sig, secret)).toBe(true);
  });
});
