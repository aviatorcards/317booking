import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";
import { formatShowDate } from "@/lib/timezone";

export default async function BandGigsPage() {
  const session = await getSession();
  if (!session || session.user.role !== "BAND") redirect("/login");

  const band = await prisma.band.findUnique({
    where: { userId: session.user.id },
    include: {
      availability: true,
      claims: { select: { gigId: true } },
    },
  });
  if (!band) redirect("/login");

  // Build a set of already-claimed gig IDs
  const claimedGigIds = new Set(band.claims.map((c) => c.gigId));

  // Build a map of month → available day numbers from the band's stored availability
  const availMap = new Map<string, Set<number>>();
  for (const a of band.availability) {
    availMap.set(a.month, new Set(a.availableDates));
  }

  const openGigs = await prisma.gig.findMany({
    where: {
      status: "OPEN",
      date: { gte: new Date() },
    },
    include: {
      venue: { select: { id: true, name: true, address: true } },
      payTier: true,
      _count: { select: { claims: true } },
    },
    orderBy: { date: "asc" },
  });

  // Filter to only gigs where the band has marked themselves available
  const matchingGigs = openGigs.filter((gig) => {
    const month = gig.date.toISOString().slice(0, 7);
    const day = gig.date.getUTCDate();
    const days = availMap.get(month);
    return days?.has(day) ?? false;
  });

  const otherGigs = openGigs.filter((gig) => {
    const month = gig.date.toISOString().slice(0, 7);
    const day = gig.date.getUTCDate();
    const days = availMap.get(month);
    return !(days?.has(day) ?? false);
  });

  function GigRow({
    gig,
    available,
  }: {
    gig: (typeof openGigs)[0];
    available: boolean;
  }) {
    const alreadyClaimed = claimedGigIds.has(gig.id);
    return (
      <Link
        href={`/gigs/${gig.id}`}
        className={`card flex items-center justify-between hover:border-indigo-300 transition-colors ${
          alreadyClaimed ? "opacity-60" : ""
        }`}
      >
        <div>
          <div className="font-semibold text-brand-900">{gig.venue.name}</div>
          <div className="text-sm text-gray-500">
            {formatShowDate(new Date(gig.date))}
            {" · "}
            {gig.venue.address}
          </div>
          {gig._count.claims > 0 && (
            <div className="text-xs text-gray-400 mt-0.5">
              {gig._count.claims} claimant{gig._count.claims !== 1 ? "s" : ""}
            </div>
          )}
        </div>
        <div className="text-right shrink-0 ml-4">
          <div className="font-semibold text-green-700">{formatAmount(gig.payTier.amount)}</div>
          {alreadyClaimed && (
            <span className="text-xs text-indigo-500 font-medium">Claimed</span>
          )}
          {available && !alreadyClaimed && (
            <span className="text-xs text-green-600 font-medium">Available</span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Open Gigs</h1>
      <p className="text-gray-500 text-sm mb-8">
        Gigs matched to your availability are shown first.{" "}
        <Link href="/band/availability" className="text-indigo-600 hover:underline">
          Update availability →
        </Link>
      </p>

      {matchingGigs.length > 0 ? (
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Matches your availability ({matchingGigs.length})
          </h2>
          <div className="space-y-3">
            {matchingGigs.map((gig) => (
              <GigRow key={gig.id} gig={gig} available />
            ))}
          </div>
        </div>
      ) : (
        <div className="card text-center py-10 text-gray-400 mb-10">
          No open gigs match your current availability.{" "}
          <Link href="/band/availability" className="text-indigo-600 hover:underline">
            Update availability →
          </Link>
        </div>
      )}

      {otherGigs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Other open gigs ({otherGigs.length})
          </h2>
          <div className="space-y-3">
            {otherGigs.map((gig) => (
              <GigRow key={gig.id} gig={gig} available={false} />
            ))}
          </div>
        </div>
      )}

      {openGigs.length === 0 && (
        <div className="card text-center py-12 text-gray-400">
          No open gigs right now. Check back soon.
        </div>
      )}
    </div>
  );
}
