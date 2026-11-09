import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";
import { formatShowDate, formatShowDay } from "@/lib/timezone";
import { StatusBadge } from "@/components/StatusBadge";
import { WithdrawClaimButton } from "../WithdrawClaimButton";
import { ExportRecords } from "@/components/ExportRecords";

export default async function BandDashboard() {
  const session = await getSession();
  if (!session || session.user.role !== "BAND") redirect("/login");

  const band = await prisma.band.findUnique({
    where: { userId: session.user.id },
    include: {
      claims: {
        include: {
          gig: {
            include: { venue: { select: { id: true, name: true } }, payTier: true },
          },
        },
        orderBy: { claimedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!band) redirect("/login");

  const upcomingGigs = band.claims.filter(
    (c) => c.status === "CONFIRMED" && new Date(c.gig.date) >= new Date()
  );
  const pendingClaims = band.claims.filter((c) => c.status === "PENDING");

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{band.name}</h1>
        <p className="text-gray-500 text-sm mt-1">{band.genre}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-3xl font-bold text-indigo-600">{upcomingGigs.length}</div>
          <div className="text-sm text-gray-500 mt-1">Upcoming Gigs</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-yellow-600">{pendingClaims.length}</div>
          <div className="text-sm text-gray-500 mt-1">Pending Claims</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-gray-800">{band.claims.length}</div>
          <div className="text-sm text-gray-500 mt-1">Total Claims</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-8">
        <Link href="/band/availability" className="btn-primary">Set Availability</Link>
        <Link href="/gigs" className="btn-secondary">Browse Open Gigs</Link>
      </div>

      {/* Upcoming confirmed */}
      {upcomingGigs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Upcoming Gigs</h2>
          <div className="space-y-3">
            {upcomingGigs.map((claim) => (
              <div key={claim.id} className="card flex items-center justify-between">
                <div>
                  <Link href={`/venues/${claim.gig.venue.id}`} className="font-bold text-brand-900 hover:text-brand-500 transition-colors">
                    {claim.gig.venue.name}
                  </Link>
                  <div className="text-sm text-gray-500">
                    {formatShowDate(new Date(claim.gig.date))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-700">{formatAmount(claim.gig.payTier.amount)}</div>
                  <StatusBadge status={claim.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent claims */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Claims</h2>
        {band.claims.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">
            No claims yet. <Link href="/gigs" className="text-indigo-600 hover:underline">Browse open gigs →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {band.claims.map((claim) => (
              <div key={claim.id} className="card flex items-center justify-between">
                <div>
                  <Link href={`/venues/${claim.gig.venue.id}`} className="font-bold text-brand-900 hover:text-brand-500 transition-colors">
                    {claim.gig.venue.name}
                  </Link>
                  <div className="text-sm text-gray-500">
                    {formatShowDay(new Date(claim.gig.date))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">{formatAmount(claim.gig.payTier.amount)}</span>
                  <StatusBadge status={claim.status} />
                  {claim.status === "PENDING" && (
                    <WithdrawClaimButton gigId={claim.gig.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <ExportRecords endpoint="/api/bands/me/export" />
      </div>
    </div>
  );
}
