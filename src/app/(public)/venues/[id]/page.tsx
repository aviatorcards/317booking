import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";
import { formatShowDate, formatShowDay } from "@/lib/timezone";
import { StatusBadge } from "@/components/StatusBadge";

export const revalidate = 10;

export default async function VenueDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();

  const venue = await prisma.venue.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { email: true } },
      gigs: {
        include: {
          payTier: true,
          claims: {
            where: { status: "CONFIRMED" },
            include: { band: { select: { id: true, name: true, genre: true } } },
          },
        },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!venue) notFound();

  const now = new Date();
  const upcomingGigs = venue.gigs.filter((g) => new Date(g.date) >= now);
  const pastGigs = venue.gigs.filter((g) => new Date(g.date) < now).reverse();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/venues" className="text-sm text-brand-400 hover:text-brand-600 flex items-center gap-1 font-semibold">
          ← Back to Venue Directory
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Venue Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card bg-white border border-brand-200">
            <div className="text-center pb-6 border-b border-brand-100">
              {venue.logoUrl ? (
                <div className="w-24 h-24 mx-auto mb-4 border-2 border-brand-200 rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center">
                  <img src={venue.logoUrl} alt={`${venue.name} logo`} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center text-brand-500 font-bold text-3xl mx-auto mb-4 border-2 border-brand-200">
                  🏟
                </div>
              )}
              <h1 className="text-2xl font-bold text-brand-900 font-heading tracking-tight">
                {venue.name}
              </h1>
              <p className="text-brand-400 text-xs mt-1.5 font-semibold">📍 {venue.address}</p>
            </div>

            <div className="py-6 space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-brand-300 uppercase tracking-wider mb-1">
                  Capacity
                </h3>
                <p className="text-sm font-semibold text-brand-900">
                  {venue.capacity.toLocaleString()} Max Attendees
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-brand-300 uppercase tracking-wider mb-1">
                  Venue Size
                </h3>
                <p className="text-sm font-semibold text-brand-900">
                  {venue.capacity < 150
                    ? "Intimate Performance Space"
                    : venue.capacity <= 500
                    ? "Club or Music Hall"
                    : "Amphitheater / Theater"}
                </p>
              </div>

              {session && (
                <div>
                  <h3 className="text-xs font-semibold text-brand-300 uppercase tracking-wider mb-1">
                    Contact Email
                  </h3>
                  <p className="text-sm text-brand-900 font-medium">{venue.user.email}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Gigs */}
        <div className="lg:col-span-2 space-y-8">
          {/* Upcoming Gigs Card */}
          <div className="card bg-white border border-brand-200">
            <h2 className="text-xl font-bold text-brand-900 font-heading mb-4 border-b border-brand-50 pb-2">
              Upcoming Shows ({upcomingGigs.length})
            </h2>

            {upcomingGigs.length === 0 ? (
              <p className="text-brand-300 text-sm text-center py-6">No upcoming shows scheduled.</p>
            ) : (
              <div className="space-y-4">
                {upcomingGigs.map((gig) => {
                  const confirmedClaim = gig.claims[0];
                  return (
                    <div
                      key={gig.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-brand-50 rounded-xl border border-brand-100"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/gigs/${gig.id}`}
                            className="font-bold text-brand-900 hover:text-brand-500 transition-colors text-base"
                          >
                            Gig Details
                          </Link>
                          <StatusBadge status={gig.status} />
                        </div>
                        <p className="text-xs text-brand-400 font-medium">
                          {formatShowDate(new Date(gig.date))}
                        </p>
                        {confirmedClaim && (
                          <p className="text-xs text-brand-400 mt-2">
                            Featuring:{" "}
                            <Link
                              href={`/bands/${confirmedClaim.band.id}`}
                              className="font-semibold text-brand-500 hover:underline"
                            >
                              {confirmedClaim.band.name}
                            </Link>{" "}
                            ({confirmedClaim.band.genre})
                          </p>
                        )}
                      </div>

                      <div className="mt-3 sm:mt-0 text-left sm:text-right shrink-0">
                        <div className="font-bold text-green-700">{formatAmount(gig.payTier.amount)}</div>
                        <div className="text-[10px] text-brand-300">{gig.payTier.name}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Gigs Card */}
          <div className="card bg-white border border-brand-200">
            <h2 className="text-xl font-bold text-brand-900 font-heading mb-4 border-b border-brand-50 pb-2">
              Show Archive ({pastGigs.length})
            </h2>

            {pastGigs.length === 0 ? (
              <p className="text-brand-300 text-sm text-center py-6">No past shows recorded.</p>
            ) : (
              <div className="space-y-3">
                {pastGigs.map((gig) => {
                  const confirmedClaim = gig.claims[0];
                  return (
                    <div
                      key={gig.id}
                      className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-brand-150 text-sm"
                    >
                      <div>
                        <div className="font-semibold text-brand-900">
                          {formatShowDay(new Date(gig.date))}
                        </div>
                        {confirmedClaim ? (
                          <p className="text-xs text-brand-300 mt-0.5">
                            Performed by:{" "}
                            <Link
                              href={`/bands/${confirmedClaim.band.id}`}
                              className="font-medium text-brand-400 hover:underline"
                            >
                              {confirmedClaim.band.name}
                            </Link>
                          </p>
                        ) : (
                          <p className="text-xs text-brand-300 mt-0.5">No artist confirmed</p>
                        )}
                      </div>
                      <span className="text-xs font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                        Completed
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
