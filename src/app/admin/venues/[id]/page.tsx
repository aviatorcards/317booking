import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";
import { formatShowDay } from "@/lib/timezone";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-indigo-100 text-indigo-800",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default async function AdminVenueDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const venue = await prisma.venue.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { email: true, createdAt: true } },
      gigs: {
        orderBy: { date: "desc" },
        include: {
          payTier: { select: { name: true, amount: true } },
          claims: {
            where: { status: "CONFIRMED" },
            include: { band: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!venue) notFound();

  const byStatus = (s: string) => venue.gigs.filter((g) => g.status === s).length;
  const totalPaid = venue.gigs
    .filter((g) => g.status === "COMPLETED")
    .reduce((sum, g) => sum + g.payTier.amount, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/venues" className="text-sm text-gray-500 hover:text-gray-700">← Venues</Link>
        <h1 className="text-2xl font-bold">{venue.name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Profile */}
        <div className="card md:col-span-2 space-y-3">
          <h2 className="font-semibold text-gray-700">Profile</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <span className="text-gray-500">Address</span>
            <span>{venue.address}</span>
            <span className="text-gray-500">Capacity</span>
            <span>{venue.capacity.toLocaleString()}</span>
            <span className="text-gray-500">Email</span>
            <span>{venue.user.email}</span>
            <span className="text-gray-500">Joined</span>
            <span>{new Date(venue.user.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-700">{venue.gigs.length}</div>
            <div className="text-xs text-gray-500 mt-1">Total Gigs</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-700">{formatAmount(totalPaid)}</div>
            <div className="text-xs text-gray-500 mt-1">Total Paid Out</div>
          </div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {(["OPEN", "PENDING", "CONFIRMED", "COMPLETED"] as const).map((s) => (
          <div key={s} className="card text-center py-3">
            <div className={`text-xl font-bold ${byStatus(s) > 0 ? "" : "text-gray-300"}`}>{byStatus(s)}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.charAt(0) + s.slice(1).toLowerCase()}</div>
          </div>
        ))}
      </div>

      {/* Gig list */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Gigs ({venue.gigs.length})</h2>
        {venue.gigs.length === 0 ? (
          <p className="text-gray-400 text-sm">No gigs posted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Tier</th>
                  <th className="pb-3 pr-4 font-medium text-right">Pay</th>
                  <th className="pb-3 pr-4 font-medium">Band</th>
                  <th className="pb-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {venue.gigs.map((gig) => {
                  const confirmedBand = gig.claims[0]?.band;
                  return (
                    <tr key={gig.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 whitespace-nowrap text-gray-600">
                        {formatShowDay(new Date(gig.date))}
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{gig.payTier.name}</td>
                      <td className="py-3 pr-4 text-right font-medium">{formatAmount(gig.payTier.amount)}</td>
                      <td className="py-3 pr-4 text-gray-700">
                        {confirmedBand ? (
                          <Link href={`/admin/bands/${confirmedBand.id}`} className="text-brand-500 hover:underline">
                            {confirmedBand.name}
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[gig.status] ?? ""}`}>
                          {gig.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
