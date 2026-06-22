import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const [gigCounts, bandCount, venueCount, tierCount] = await Promise.all([
    prisma.gig.groupBy({ by: ["status"], _count: true }),
    prisma.band.count(),
    prisma.venue.count(),
    prisma.payTier.count(),
  ]);

  const countByStatus = Object.fromEntries(gigCounts.map((g) => [g.status, g._count]));

  const recentGigs = await prisma.gig.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { venue: { select: { name: true } }, payTier: true },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-8">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-3xl font-bold text-gray-800">{bandCount}</div>
          <div className="text-sm text-gray-500 mt-1">Bands</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-gray-800">{venueCount}</div>
          <div className="text-sm text-gray-500 mt-1">Venues</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-700">{countByStatus["OPEN"] ?? 0}</div>
          <div className="text-sm text-gray-500 mt-1">Open Gigs</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-indigo-600">{countByStatus["CONFIRMED"] ?? 0}</div>
          <div className="text-sm text-gray-500 mt-1">Confirmed Gigs</div>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href="/admin/bands" className="btn-secondary">
          Bands ({bandCount})
        </Link>
        <Link href="/admin/venues" className="btn-secondary">
          Venues ({venueCount})
        </Link>
        <Link href="/admin/payments" className="btn-secondary">
          Payment Audit
        </Link>
        <Link href="/admin/tiers" className="btn-primary">
          Manage Pay Tiers ({tierCount})
        </Link>
        <Link href="/gigs" className="btn-secondary">View All Gigs</Link>
      </div>

      {/* Recent gigs */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Gigs</h2>
        <div className="space-y-3">
          {recentGigs.map((gig) => (
            <div key={gig.id} className="card flex items-center justify-between">
              <div>
                <div className="font-medium">{gig.venue.name}</div>
                <div className="text-sm text-gray-500">
                  {new Date(gig.date).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                  {" · "}
                  {formatAmount(gig.payTier.amount)}
                </div>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                gig.status === "OPEN" ? "bg-green-100 text-green-800" :
                gig.status === "CONFIRMED" ? "bg-blue-100 text-blue-800" :
                gig.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                "bg-gray-100 text-gray-600"
              }`}>{gig.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
