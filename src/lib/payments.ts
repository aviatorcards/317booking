import { PrismaClient } from "@prisma/client";

export function checkoutIdempotencyKey(gigId: string, attempt: number): string {
  return `gig-checkout-${gigId}-${attempt}`;
}

export function paymentBlocksCancel(payment: { status?: string | null; releasedAt?: Date | null } | null | undefined): boolean {
  if (!payment) return false;
  return payment.status === "PAID" || payment.releasedAt != null;
}

export function appBaseUrl(): string {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

type PaidInput = {
  gigId: string;
  paymentIntentId: string | null;
  checkoutSessionId?: string | null;
  amount: number;
  platformFee: number;
};

/** Idempotent. Returns true only the first time the payment becomes PAID. */
export async function recordPaidGig(db: PrismaClient, input: PaidInput): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({ where: { gigId: input.gigId } });
    if (existing?.status === "PAID") return false;
    const releasedAt = existing?.releasedAt ?? new Date();
    const data = {
      status: "PAID" as const,
      amount: input.amount,
      platformFee: input.platformFee,
      releasedAt,
      ...(input.paymentIntentId ? { stripePaymentIntentId: input.paymentIntentId } : {}),
      ...(input.checkoutSessionId ? { stripeCheckoutSessionId: input.checkoutSessionId } : {}),
    };
    if (existing) {
      await tx.payment.update({ where: { id: existing.id }, data });
    } else {
      await tx.payment.create({
        data: { gigId: input.gigId, ...data },
      });
    }
    await tx.gig.updateMany({
      where: { id: input.gigId, status: "CONFIRMED" },
      data: { status: "COMPLETED" },
    });
    return true;
  });
}

export function platformFeeCents(amount: number, percent: number): number {
  return Math.round(amount * (percent / 100));
}
