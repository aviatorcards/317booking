import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";
import { formatShowDate, formatShowDay } from "@/lib/timezone";

export const revalidate = 10;

export default async function BandDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();

  const band = await prisma.band.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { email: true } },
      ratings: { select: { gigId: true, rating: true, note: true, venue: { select: { name: true } } } },
      claims: {
        where: { status: "CONFIRMED", gig: { status: { in: ["CONFIRMED", "COMPLETED"] } } },
        include: {
          gig: {
            include: {
              venue: true,
              payTier: true,
            },
          },
        },
      },
    },
  });

  if (!band) notFound();

  // Sort claims by gig date
  const sortedClaims = [...band.claims].sort(
    (a, b) => new Date(a.gig.date).getTime() - new Date(b.gig.date).getTime()
  );

  const now = new Date();
  const upcomingGigs = sortedClaims.filter((c) => new Date(c.gig.date) >= now);
  const pastGigs = sortedClaims.filter((c) => new Date(c.gig.date) < now).reverse();

  // Check if viewer is owner of this band account or admin
  const isOwner = session?.user.id === band.userId || session?.user.role === "ADMIN";
  let venueCanContact = false;
  if (!isOwner && session?.user?.role === "VENUE" && session.user.id) {
    const venues = await prisma.venue.findMany({ where: { userId: session.user.id }, select: { id: true } });
    if (venues.length > 0) {
      const live = await prisma.gigClaim.findFirst({
        where: {
          bandId: band.id,
          status: { in: ["PENDING", "CONFIRMED"] },
          gig: {
            venueId: { in: venues.map((v) => v.id) },
            status: { in: ["OPEN", "PENDING", "CONFIRMED"] },
          },
        },
        select: { id: true },
      });
      venueCanContact = !!live;
    }
  }
  const canSeeEmail = isOwner || venueCanContact;

  // Rating stats
  const ratingMap = Object.fromEntries(band.ratings.map((r) => [r.gigId, r]));
  const avgRating =
    band.ratings.length > 0
      ? band.ratings.reduce((sum, r) => sum + r.rating, 0) / band.ratings.length
      : null;

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const icalUrl = `${appUrl}/api/bands/${band.id}/calendar.ics`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/bands" className="text-sm text-brand-400 hover:text-brand-600 flex items-center gap-1 font-semibold">
          ← Back to Artist Directory
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Band Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card bg-white border border-brand-200">
            <div className="text-center pb-6 border-b border-brand-100">
              <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center text-brand-500 font-bold text-3xl mx-auto mb-4 border-2 border-brand-200">
                🎸
              </div>
              <h1 className="text-2xl font-bold text-brand-900 font-heading tracking-tight">
                {band.name}
              </h1>
              <p className="text-brand-400 text-sm mt-1 font-medium">{band.genre}</p>
            </div>

            <div className="py-6 space-y-4 border-b border-brand-100">
              <div>
                <h3 className="text-xs font-semibold text-brand-300 uppercase tracking-wider mb-1">
                  Experience
                </h3>
                <p className="text-sm font-semibold text-brand-900">
                  {sortedClaims.length} Show{sortedClaims.length !== 1 ? "s" : ""} Booked
                </p>
              </div>

              {avgRating !== null && (
                <div>
                  <h3 className="text-xs font-semibold text-brand-300 uppercase tracking-wider mb-1">
                    Venue Rating
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-lg leading-none">
                      {"★".repeat(Math.round(avgRating))}
                      <span className="text-gray-200">{"★".repeat(5 - Math.round(avgRating))}</span>
                    </span>
                    <span className="text-sm font-semibold text-brand-900">
                      {avgRating.toFixed(1)}
                    </span>
                    <span className="text-xs text-brand-300">
                      ({band.ratings.length} review{band.ratings.length !== 1 ? "s" : ""})
                    </span>
                  </div>
                </div>
              )}

              {canSeeEmail && (
                <div>
                  <h3 className="text-xs font-semibold text-brand-300 uppercase tracking-wider mb-1">
                    Contact Email
                  </h3>
                  <p className="text-sm text-brand-900 font-medium">{band.user.email}</p>
                </div>
              )}

              {band.studiosyncId && (
                <div>
                  <h3 className="text-xs font-semibold text-brand-300 uppercase tracking-wider mb-1.5">
                    Integrations
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-600 border border-brand-200">
                    🔗 StudioSync Managed
                  </span>
                </div>
              )}
            </div>

            {/* iCal Feed Block for owner */}
            {isOwner && (
              <div className="pt-6">
                <h3 className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-2">
                  Calendar Sync (iCal)
                </h3>
                <p className="text-xs text-brand-300 mb-3 leading-relaxed">
                  Use this feed to automatically sync your confirmed gigs to StudioSync, Google Calendar, or Apple Calendar.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={icalUrl}
                    className="input text-xs font-mono select-all bg-brand-50"
                  />
                </div>
                <p className="text-[10px] text-brand-300 mt-1.5 italic">
                  Tip: Copy & paste this URL into your calendar software.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Bio and Gig Listings */}
        <div className="lg:col-span-2 space-y-8">
          {/* Bio Card */}
          <div className="card bg-white border border-brand-200">
            <h2 className="text-xl font-bold text-brand-900 font-heading mb-4 border-b border-brand-50 pb-2">
              About the Artist
            </h2>
            <div className="text-brand-400 text-sm leading-relaxed whitespace-pre-wrap">
              {band.bio || "No biography provided. Check back soon for more details about this artist!"}
            </div>
          </div>

          {/* Upcoming Gigs Card */}
          <div className="card bg-white border border-brand-200">
            <h2 className="text-xl font-bold text-brand-900 font-heading mb-4 border-b border-brand-50 pb-2">
              Upcoming Gigs ({upcomingGigs.length})
            </h2>

            {upcomingGigs.length === 0 ? (
              <p className="text-brand-300 text-sm text-center py-6">No upcoming confirmed gigs.</p>
            ) : (
              <div className="space-y-4">
                {upcomingGigs.map((claim) => (
                  <div
                    key={claim.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-brand-50 rounded-xl border border-brand-100"
                  >
                    <div>
                      <Link
                        href={`/venues/${claim.gig.venueId}`}
                        className="font-bold text-brand-900 hover:text-brand-500 transition-colors text-base"
                      >
                        {claim.gig.venue.name}
                      </Link>
                      <p className="text-xs text-brand-300 mt-0.5">{claim.gig.venue.address}</p>
                      <p className="text-xs text-brand-400 mt-2 font-medium">
                        {formatShowDate(new Date(claim.gig.date))}
                      </p>
                    </div>
                    <div className="mt-3 sm:mt-0 text-left sm:text-right shrink-0">
                      <div className="font-bold text-green-700">{formatAmount(claim.gig.payTier.amount)}</div>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        Confirmed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Gigs Card */}
          <div className="card bg-white border border-brand-200">
            <h2 className="text-xl font-bold text-brand-900 font-heading mb-4 border-b border-brand-50 pb-2">
              Performance History ({pastGigs.length})
            </h2>

            {pastGigs.length === 0 ? (
              <p className="text-brand-300 text-sm text-center py-6">No past performances recorded.</p>
            ) : (
              <div className="space-y-3">
                {pastGigs.map((claim) => {
                  const review = ratingMap[claim.gig.id];
                  return (
                    <div
                      key={claim.id}
                      className="p-3.5 bg-white rounded-xl border border-brand-150 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <Link
                            href={`/venues/${claim.gig.venueId}`}
                            className="font-semibold text-brand-900 hover:text-brand-500 transition-colors"
                          >
                            {claim.gig.venue.name}
                          </Link>
                          <p className="text-xs text-brand-300 mt-0.5">
                            {formatShowDay(new Date(claim.gig.date))}
                          </p>
                        </div>
                        <div className="text-right">
                          {review ? (
                            <span className="text-amber-400 text-base leading-none">
                              {"★".repeat(review.rating)}
                              <span className="text-gray-200">{"★".repeat(5 - review.rating)}</span>
                            </span>
                          ) : (
                            <span className="text-xs font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                      {review?.note && (
                        <p className="text-xs text-brand-400 mt-2 italic border-t border-brand-50 pt-2">
                          &ldquo;{review.note}&rdquo;
                          <span className="not-italic text-brand-300 ml-1">— {review.venue.name}</span>
                        </p>
                      )}
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
