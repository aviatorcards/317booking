import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";
import { CreateTierForm } from "./CreateTierForm";
import { DeleteTierButton } from "./DeleteTierButton";

export default async function TiersPage() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const tiers = await prisma.payTier.findMany({ orderBy: { amount: "asc" } });

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Pay Tiers</h1>
      <p className="text-sm text-gray-500 mb-8">
        Set the fixed pay rates bands can earn. Venues choose from these tiers when posting gigs.
      </p>

      {/* Existing tiers */}
      <div className="space-y-3 mb-10">
        {tiers.length === 0 ? (
          <div className="card text-center py-8 text-gray-400">No tiers yet. Create one below.</div>
        ) : (
          tiers.map((tier) => (
            <div key={tier.id} className="card flex items-center justify-between">
              <div>
                <div className="font-semibold">{tier.name}</div>
                {tier.platformFeePercent > 0 && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    {tier.platformFeePercent}% platform fee
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-bold text-green-700">{formatAmount(tier.amount)}</span>
                <DeleteTierButton tierId={tier.id} tierName={tier.name} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create new tier */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Add a Tier</h2>
        <CreateTierForm />
      </div>
    </div>
  );
}
