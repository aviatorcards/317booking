import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";

export default async function AdminPaymentsPage() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      gig: {
        include: {
          venue: { select: { name: true } },
          payTier: { select: { name: true, platformFeePercent: true } },
          claims: {
            where: { status: "CONFIRMED" },
            include: { band: { select: { name: true } } },
          },
        },
      },
    },
  });

  const totalRevenue = payments.reduce((sum, p) => sum + p.platformFee, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const released = payments.filter((p) => p.releasedAt);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Admin</Link>
        <h1 className="text-2xl font-bold">Payment Audit</h1>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-800">{payments.length}</div>
          <div className="text-sm text-gray-500 mt-1">Total Payments</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-700">{formatAmount(totalRevenue)}</div>
          <div className="text-sm text-gray-500 mt-1">Platform Revenue</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-indigo-600">{formatAmount(totalPaid)}</div>
          <div className="text-sm text-gray-500 mt-1">Total Processed</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4 font-medium">Date</th>
              <th className="pb-3 pr-4 font-medium">Venue</th>
              <th className="pb-3 pr-4 font-medium">Band</th>
              <th className="pb-3 pr-4 font-medium">Tier</th>
              <th className="pb-3 pr-4 font-medium text-right">Amount</th>
              <th className="pb-3 pr-4 font-medium text-right">Platform Fee</th>
              <th className="pb-3 pr-4 font-medium text-right">Band Payout</th>
              <th className="pb-3 pr-4 font-medium text-center">Status</th>
              <th className="pb-3 font-medium">Stripe PI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((payment) => {
              const confirmedBand = payment.gig.claims[0]?.band?.name ?? "—";
              const bandPayout = payment.amount - payment.platformFee;

              return (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                    {new Date(payment.gig.date).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>
                  <td className="py-3 pr-4 font-medium">{payment.gig.venue.name}</td>
                  <td className="py-3 pr-4 text-gray-700">{confirmedBand}</td>
                  <td className="py-3 pr-4 text-gray-500">{payment.gig.payTier.name}</td>
                  <td className="py-3 pr-4 text-right font-medium">{formatAmount(payment.amount)}</td>
                  <td className="py-3 pr-4 text-right text-indigo-700">
                    {formatAmount(payment.platformFee)}
                    {payment.gig.payTier.platformFeePercent > 0 && (
                      <span className="text-xs text-gray-400 ml-1">
                        ({payment.gig.payTier.platformFeePercent}%)
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right text-green-700">{formatAmount(bandPayout)}</td>
                  <td className="py-3 pr-4 text-center">
                    {payment.releasedAt ? (
                      <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">Released</span>
                    ) : (
                      <span className="inline-block bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">Pending</span>
                    )}
                  </td>
                  <td className="py-3 text-gray-400 font-mono text-xs truncate max-w-[140px]">
                    {payment.stripePaymentIntentId ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {payments.length === 0 && (
          <p className="text-center text-gray-400 py-12">No payments recorded yet.</p>
        )}
      </div>
    </div>
  );
}
