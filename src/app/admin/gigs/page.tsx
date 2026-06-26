import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";
import { CancelGigButton } from "./CancelGigButton";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-indigo-100 text-indigo-800",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default async function AdminGigsPage() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const gigs = await prisma.gig.findMany({
    orderBy: { date: "desc" },
    include: {
      venue: { select: { id: true, name: true } },
      payTier: { select: { name: true, amount: true } },
      claims: {
        where: { status: "CONFIRMED" },
        include: { band: { select: { id: true, name: true } } },
      },
    },
  });

  const cancellable = (status: string) => status !== "COMPLETED" && status !== "CANCELLED";

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-8">Gigs ({gigs.length})</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4 font-medium">Date</th>
              <th className="pb-3 pr-4 font-medium">Venue</th>
              <th className="pb-3 pr-4 font-medium">Band</th>
              <th className="pb-3 pr-4 font-medium">Tier</th>
              <th className="pb-3 pr-4 font-medium text-right">Pay</th>
              <th className="pb-3 pr-4 font-medium text-center">Mode</th>
              <th className="pb-3 pr-4 font-medium text-center">Status</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {gigs.map((gig) => {
              const confirmedBand = gig.claims[0]?.band;

              return (
                <tr key={gig.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 whitespace-nowrap text-gray-600">
                    {new Date(gig.date).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>
                  <td className="py-3 pr-4 font-medium">
                    <Link href={`/admin/venues/${gig.venue.id}`} className="text-brand-500 hover:underline">
                      {gig.venue.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-gray-700">
                    {confirmedBand ? (
                      <Link href={`/admin/bands/${confirmedBand.id}`} className="text-brand-500 hover:underline">
                        {confirmedBand.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-500">{gig.payTier.name}</td>
                  <td className="py-3 pr-4 text-right font-medium">{formatAmount(gig.payTier.amount)}</td>
                  <td className="py-3 pr-4 text-center">
                    <span className="text-xs text-gray-500">
                      {gig.claimMode === "AUTO_ASSIGN" ? "Auto" : "Review"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[gig.status] ?? ""}`}>
                      {gig.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {cancellable(gig.status) && <CancelGigButton gigId={gig.id} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {gigs.length === 0 && (
          <p className="text-center text-gray-400 py-12">No gigs yet.</p>
        )}
      </div>
    </div>
  );
}
