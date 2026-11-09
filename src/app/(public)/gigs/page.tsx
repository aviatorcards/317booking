import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";
import { StatusBadge } from "@/components/StatusBadge";
import { formatShowDate, showDay, showMonthKey, upcomingMonthOptions, zonedMonthRange } from "@/lib/timezone";

export const revalidate = 60;

export default async function GigsPage({
  searchParams,
}: {
  searchParams: { month?: string; page?: string };
}) {
  const session = await getSession();
  const month = searchParams.month;

  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 24;
  const where: Record<string, unknown> = { status: { in: ["OPEN", "PENDING"] } };
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    where.date = zonedMonthRange(month);
  } else {
    where.date = { gte: new Date() };
  }

  const gigs = await prisma.gig.findMany({
    where,
    include: {
      venue: { select: { name: true, address: true } },
      payTier: true,
      _count: { select: { claims: true } },
    },
    orderBy: { date: "asc" },
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  });
  const hasMore = gigs.length > pageSize;
  if (hasMore) gigs.pop();

  // If band, load their availability to show which gigs they can claim
  let availMap: Record<string, number[]> = {};
  if (session?.user.role === "BAND") {
    const band = await prisma.band.findUnique({ where: { userId: session.user.id } });
    if (band) {
      const avails = await prisma.availability.findMany({ where: { bandId: band.id } });
      availMap = Object.fromEntries(avails.map((a) => [a.month, a.availableDates]));
    }
  }

  function isAvailableForGig(gigDate: Date) {
    return availMap[showMonthKey(gigDate)]?.includes(showDay(gigDate)) ?? false;
  }

  const monthOptions = upcomingMonthOptions();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Open Gigs</h1>
          <p className="text-sm text-gray-500 mt-1">Indianapolis · All venues</p>
        </div>
        {session?.user.role === "BAND" && (
          <Link href="/band/availability" className="btn-secondary text-sm">
            Update Availability
          </Link>
        )}
      </div>

      {/* Month filter */}
      <div className="flex gap-2 mb-8 flex-wrap">
        <Link
          href="/gigs"
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            !month
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-600 border-gray-200 hover:border-indigo-400"
          }`}
        >
          All upcoming
        </Link>
        {monthOptions.map((opt) => (
          <Link
            key={opt.value}
            href={`/gigs?month=${opt.value}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              month === opt.value
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-indigo-400"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {gigs.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          No open gigs right now. Check back soon.
        </div>
      ) : (
        <div className="space-y-4">
          {gigs.map((gig) => {
            const canClaim = session?.user.role === "BAND" && isAvailableForGig(gig.date);
            return (
              <Link
                key={gig.id}
                href={`/gigs/${gig.id}`}
                className="card flex flex-col sm:flex-row sm:items-center sm:justify-between hover:border-indigo-300 transition-colors group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-gray-900 group-hover:text-indigo-700">
                      {gig.venue.name}
                    </span>
                    <StatusBadge status={gig.status} />
                    {gig.claimMode === "AUTO_ASSIGN" && (
                      <span className="text-xs text-gray-400">First-come</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatShowDate(new Date(gig.date))}
                    {" · "}
                    {gig.venue.address}
                  </div>
                  {gig.description && (
                    <div className="text-sm text-gray-400 mt-1 line-clamp-1">{gig.description}</div>
                  )}
                </div>
                <div className="sm:text-right sm:ml-6 mt-3 sm:mt-0 shrink-0">
                  <div className="text-xl font-bold text-gray-900">{formatAmount(gig.payTier.amount)}</div>
                  <div className="text-xs text-gray-400">{gig.payTier.name}</div>
                  {session?.user.role === "BAND" && (
                    <div className={`text-xs mt-1 font-medium ${canClaim ? "text-green-600" : "text-gray-300"}`}>
                      {canClaim ? "✓ You're available" : "Not available"}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {(page > 1 || hasMore) && (
        <div className="flex gap-3 mt-6">
          {page > 1 && (
            <Link className="btn-secondary text-sm" href={`/gigs?${new URLSearchParams({ ...(month ? { month } : {}), page: String(page - 1) })}`}>
              Previous
            </Link>
          )}
          {hasMore && (
            <Link className="btn-secondary text-sm" href={`/gigs?${new URLSearchParams({ ...(month ? { month } : {}), page: String(page + 1) })}`}>
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
