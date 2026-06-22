import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
  typescript: true,
});

/** Convert cents → "$12.00" */
export function formatAmount(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
