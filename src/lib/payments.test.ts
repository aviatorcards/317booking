import { describe, expect, it } from "vitest";
import { checkoutIdempotencyKey, paymentBlocksCancel, platformFeeCents } from "./payments";

describe("payment guards", () => {
  it("builds a stable idempotency key per attempt", () => {
    expect(checkoutIdempotencyKey("gig_1", 1)).toBe("gig-checkout-gig_1-1");
    expect(checkoutIdempotencyKey("gig_1", 2)).not.toBe(checkoutIdempotencyKey("gig_1", 1));
  });

  it("blocks cancel only after a charge", () => {
    expect(paymentBlocksCancel(null)).toBe(false);
    expect(paymentBlocksCancel({ status: "PENDING", releasedAt: null })).toBe(false);
    expect(paymentBlocksCancel({ status: "PAID", releasedAt: null })).toBe(true);
    expect(paymentBlocksCancel({ status: "PENDING", releasedAt: new Date() })).toBe(true);
  });

  it("keeps the platform fee below the charge", () => {
    expect(platformFeeCents(10000, 5)).toBe(500);
    expect(platformFeeCents(10000, 99)).toBeLessThan(10000);
  });
});
