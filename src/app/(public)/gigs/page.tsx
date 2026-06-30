import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";
import { StatusBadge } from "@/components/StatusBadge";

export const revalidate = 60;

function getMonthOptions() {
  const options: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    options.push({ label, value });
  }
  return options;
}

export default async function GigsPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const session = await getSession();
  const month = searchParams.month;

  const where: Record<string, unknown> = { status: "OPEN" };
  if (month) {
    const [year, mon] = month.split("-").map(Number);
    where.date = { gte: new Date(year, mon - 1, 1), lt: new Date(year, mon, 1) };
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
  });

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
    const month = gigDate.toISOString().slice(0, 7);
    const day = gigDate.getUTCDate();
    return availMap[month]?.includes(day) ?? false;
  }

  const monthOptions = getMonthOptions();

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
                    {new Date(gig.date).toLocaleDateString("en-US", {
                      weekday: "long", month: "long", day: "numeric", year: "numeric",
                    })}
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
    </div>
  );
}
