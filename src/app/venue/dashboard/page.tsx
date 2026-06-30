import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveVenue } from "@/lib/activeVenue";
import { formatAmount } from "@/lib/stripe";
import { StatusBadge } from "@/components/StatusBadge";
import { ExportRecords } from "@/components/ExportRecords";

export default async function VenueDashboard() {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") redirect("/login");

  const active = await getActiveVenue(session.user.id);
  if (!active) redirect("/login");

  const venue = await prisma.venue.findUnique({
    where: { id: active.id },
    include: {
      gigs: {
        include: {
          payTier: true,
          _count: { select: { claims: true } },
          claims: { where: { status: "PENDING" } },
        },
        orderBy: { date: "desc" },
        take: 20,
      },
    },
  })!;

  if (!venue) redirect("/login");

  const upcomingConfirmed = venue.gigs.filter(
    (g) => g.status === "CONFIRMED" && new Date(g.date) >= new Date()
  );
  const openGigs = venue.gigs.filter((g) => g.status === "OPEN");
  const pendingReview = venue.gigs.filter((g) => g.status === "PENDING");

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">{venue.name}</h1>
          <p className="text-gray-500 text-sm mt-1">{venue.address} · Capacity {venue.capacity.toLocaleString()}</p>
        </div>
        <Link href="/venue/gigs/new" className="btn-primary">+ Post a Gig</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-3xl font-bold text-indigo-600">{upcomingConfirmed.length}</div>
          <div className="text-sm text-gray-500 mt-1">Confirmed</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-yellow-600">{pendingReview.length}</div>
          <div className="text-sm text-gray-500 mt-1">Needs Review</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600">{openGigs.length}</div>
          <div className="text-sm text-gray-500 mt-1">Open</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-gray-700">{venue.gigs.length}</div>
          <div className="text-sm text-gray-500 mt-1">Total Gigs</div>
        </div>
      </div>

      {/* Needs attention */}
      {pendingReview.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            Needs Review
            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {pendingReview.length}
            </span>
          </h2>
          <div className="space-y-3">
            {pendingReview.map((gig) => (
              <Link
                key={gig.id}
                href={`/venue/gigs/${gig.id}`}
                className="card flex items-center justify-between hover:border-indigo-300 transition-colors"
              >
                <div>
                  <div className="font-medium">
                    {new Date(gig.date).toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric", year: "numeric",
                    })}
                  </div>
                  <div className="text-sm text-gray-500">
                    {gig._count.claims} claimant{gig._count.claims !== 1 ? "s" : ""} · {formatAmount(gig.payTier.amount)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={gig.status} />
                  <span className="text-indigo-600 text-sm font-medium">Review →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All gigs */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Gigs</h2>
        {venue.gigs.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            No gigs yet.{" "}
            <Link href="/venue/gigs/new" className="text-indigo-600 hover:underline">Post your first gig →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {venue.gigs.map((gig) => (
              <Link
                key={gig.id}
                href={`/venue/gigs/${gig.id}`}
                className="card flex items-center justify-between hover:border-indigo-300 transition-colors"
              >
                <div>
                  <div className="font-medium">
                    {new Date(gig.date).toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric", year: "numeric",
                    })}
                  </div>
                  <div className="text-sm text-gray-500">
                    {gig._count.claims} claim{gig._count.claims !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-700">{formatAmount(gig.payTier.amount)}</span>
                  <StatusBadge status={gig.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <ExportRecords endpoint="/api/venues/me/export" />
      </div>
    </div>
  );
}
