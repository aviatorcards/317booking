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

export default async function AdminBandDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const band = await prisma.band.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { email: true, createdAt: true } },
      claims: {
        orderBy: { claimedAt: "desc" },
        include: {
          gig: {
            include: {
              venue: { select: { name: true } },
              payTier: { select: { name: true, amount: true } },
            },
          },
        },
      },
      availability: {
        orderBy: { month: "desc" },
        take: 3,
      },
    },
  });

  if (!band) notFound();

  const confirmedGigs = band.claims.filter(
    (c) => c.status === "CONFIRMED" && (c.gig.status === "CONFIRMED" || c.gig.status === "COMPLETED")
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/bands" className="text-sm text-gray-500 hover:text-gray-700">← Bands</Link>
        <h1 className="text-2xl font-bold">{band.name}</h1>
        {band.stripeAccountId && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            Stripe Connected
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Profile */}
        <div className="card md:col-span-2 space-y-3">
          <h2 className="font-semibold text-gray-700">Profile</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <span className="text-gray-500">Genre</span>
            <span>{band.genre}</span>
            <span className="text-gray-500">Email</span>
            <span>{band.user.email}</span>
            <span className="text-gray-500">Joined</span>
            <span>{new Date(band.user.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            {band.studiosyncId && (
              <>
                <span className="text-gray-500">StudioSync ID</span>
                <span className="font-mono text-xs">{band.studiosyncId}</span>
              </>
            )}
          </div>
          {band.bio && (
            <p className="text-sm text-gray-600 pt-2 border-t border-gray-100">{band.bio}</p>
          )}
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-700">{confirmedGigs.length}</div>
            <div className="text-xs text-gray-500 mt-1">Confirmed Gigs</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-700">{band.claims.length}</div>
            <div className="text-xs text-gray-500 mt-1">Total Claims</div>
          </div>
        </div>
      </div>

      {/* Availability */}
      {band.availability.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Recent Availability</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {band.availability.map((a) => (
              <div key={a.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{a.month}</span>
                  {a.lockedAt && <span className="text-xs text-gray-400">Locked</span>}
                </div>
                <div className="text-sm text-gray-600">
                  {a.availableDates.length > 0
                    ? `${a.availableDates.length} day${a.availableDates.length !== 1 ? "s" : ""}: ${a.availableDates.sort((x, y) => x - y).join(", ")}`
                    : "No availability set"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gig history */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Gig Claims ({band.claims.length})</h2>
        {band.claims.length === 0 ? (
          <p className="text-gray-400 text-sm">No claims yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Venue</th>
                  <th className="pb-3 pr-4 font-medium">Tier</th>
                  <th className="pb-3 pr-4 font-medium text-right">Pay</th>
                  <th className="pb-3 pr-4 font-medium text-center">Claim</th>
                  <th className="pb-3 font-medium text-center">Gig</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {band.claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 whitespace-nowrap text-gray-600">
                      {formatShowDay(new Date(claim.gig.date))}
                    </td>
                    <td className="py-3 pr-4 font-medium">{claim.gig.venue.name}</td>
                    <td className="py-3 pr-4 text-gray-500">{claim.gig.payTier.name}</td>
                    <td className="py-3 pr-4 text-right">{formatAmount(claim.gig.payTier.amount)}</td>
                    <td className="py-3 pr-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        claim.status === "CONFIRMED" ? "bg-blue-100 text-blue-800" :
                        claim.status === "REJECTED" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>{claim.status}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[claim.gig.status] ?? ""}`}>
                        {claim.gig.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
