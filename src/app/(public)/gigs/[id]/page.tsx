import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";
import { StatusBadge } from "@/components/StatusBadge";
import { ClaimButton } from "./ClaimButton";
import { WithdrawClaimButton } from "@/app/band/WithdrawClaimButton";
import { ConfirmBandButton } from "@/app/venue/gigs/[id]/ConfirmBandButton";
import { formatShowDate, showDay, showMonthKey } from "@/lib/timezone";

export default async function GigDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();

  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: {
      venue: true,
      payTier: true,
      claims: {
        include: {
          band: {
            select: {
              id: true, name: true, genre: true, bio: true,
              ratings: { select: { rating: true } },
            },
          },
        },
        orderBy: { claimedAt: "asc" },
      },
    },
  });

  if (!gig) notFound();

  // Check if current band already claimed
  let alreadyClaimed = false;
  let hasPendingClaim = false;
  let isAvailable = false;

  if (session?.user.role === "BAND") {
    const band = await prisma.band.findUnique({ where: { userId: session.user.id } });
    if (band) {
      const myClaim = gig.claims.find((c) => c.bandId === band.id);
      alreadyClaimed = !!myClaim;
      hasPendingClaim = myClaim?.status === "PENDING";
      const month = showMonthKey(gig.date);
      const day = showDay(gig.date);
      const avail = await prisma.availability.findUnique({
        where: { bandId_month: { bandId: band.id, month } },
      });
      isAvailable = avail?.availableDates.includes(day) ?? false;
    }
  }

  // Is this venue's gig?
  const isOwner =
    session?.user.role === "VENUE" && gig.venue.userId === session.user.id;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <Link href={`/venues/${gig.venueId}`} className="hover:text-brand-500 transition-colors">
              <h1 className="text-2xl font-bold">{gig.venue.name}</h1>
            </Link>
            <p className="text-gray-500 text-sm">{gig.venue.address}</p>
          </div>
          <StatusBadge status={gig.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-gray-100 my-4">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Date</div>
            <div className="font-medium">
              {formatShowDate(new Date(gig.date))}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Pay</div>
            <div className="font-bold text-2xl text-green-700">{formatAmount(gig.payTier.amount)}</div>
            <div className="text-xs text-gray-400">{gig.payTier.name}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Booking Type</div>
            <div className="font-medium text-sm">
              {gig.claimMode === "AUTO_ASSIGN" ? "First-come, first-served" : "Venue selects from claimants"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Venue Capacity</div>
            <div className="font-medium">{gig.venue.capacity.toLocaleString()}</div>
          </div>
        </div>

        {gig.description && (
          <p className="text-gray-600 text-sm">{gig.description}</p>
        )}
      </div>

      {/* Band: claim section */}
      {session?.user.role === "BAND" && (gig.status === "OPEN" || gig.status === "PENDING" || hasPendingClaim) && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-3">Claim this gig</h2>
          {hasPendingClaim ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Your claim is pending venue review.</p>
              <WithdrawClaimButton gigId={gig.id} />
            </div>
          ) : alreadyClaimed ? (
            <p className="text-sm text-gray-500">You&apos;ve already claimed this gig.</p>
          ) : !isAvailable ? (
            <div>
              <p className="text-sm text-amber-700 mb-3">
                You haven&apos;t marked yourself available on this date.
              </p>
              <a href="/band/availability" className="btn-secondary text-sm">
                Update availability →
              </a>
            </div>
          ) : (
            <ClaimButton gigId={gig.id} />
          )}
        </div>
      )}

      {/* Venue: claimants section */}
      {isOwner && gig.claims.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Claimants ({gig.claims.length})</h2>
          <div className="space-y-3">
            {gig.claims.map((claim) => {
              const bandRatings = claim.band.ratings;
              const avg = bandRatings.length > 0
                ? bandRatings.reduce((s, r) => s + r.rating, 0) / bandRatings.length
                : null;
              return (
                <div key={claim.id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/bands/${claim.bandId}`} className="font-medium hover:text-brand-500 transition-colors">
                        {claim.band.name}
                      </Link>
                      {avg !== null && (
                        <span className="text-xs text-amber-500 font-medium">
                          {"★".repeat(Math.round(avg))} {avg.toFixed(1)}
                          <span className="text-gray-400 font-normal ml-0.5">({bandRatings.length})</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{claim.band.genre}</div>
                    {claim.band.bio && (
                      <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{claim.band.bio}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={claim.status} />
                    {claim.status === "PENDING" && gig.status !== "CONFIRMED" && (
                      <ConfirmBandButton gigId={gig.id} bandId={claim.bandId} bandName={claim.band.name} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isOwner && gig.claims.length === 0 && gig.status === "OPEN" && (
        <div className="card text-center py-8 text-gray-400 text-sm">
          No claims yet. Share this gig with bands!
        </div>
      )}
    </div>
  );
}
