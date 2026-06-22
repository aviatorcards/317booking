import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";
import { StatusBadge } from "@/components/StatusBadge";
import { ClaimButton } from "./ClaimButton";

export default async function GigDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();

  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: {
      venue: true,
      payTier: true,
      claims: {
        include: { band: { select: { id: true, name: true, genre: true, bio: true } } },
        orderBy: { claimedAt: "asc" },
      },
    },
  });

  if (!gig) notFound();

  // Check if current band already claimed
  let bandId: string | null = null;
  let alreadyClaimed = false;
  let isAvailable = false;

  if (session?.user.role === "BAND") {
    const band = await prisma.band.findUnique({ where: { userId: session.user.id } });
    if (band) {
      bandId = band.id;
      alreadyClaimed = gig.claims.some((c) => c.bandId === band.id);
      const month = gig.date.toISOString().slice(0, 7);
      const day = gig.date.getUTCDate();
      const avail = await prisma.availability.findUnique({
        where: { bandId_month: { bandId: band.id, month } },
      });
      isAvailable = avail?.availableDates.includes(day) ?? false;
    }
  }

  // Is this venue's gig?
  let isOwner = false;
  if (session?.user.role === "VENUE") {
    const venue = await prisma.venue.findUnique({ where: { userId: session.user.id } });
    isOwner = venue?.id === gig.venueId;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{gig.venue.name}</h1>
            <p className="text-gray-500 text-sm">{gig.venue.address}</p>
          </div>
          <StatusBadge status={gig.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-gray-100 my-4">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Date</div>
            <div className="font-medium">
              {new Date(gig.date).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
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
      {session?.user.role === "BAND" && gig.status === "OPEN" && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-3">Claim this gig</h2>
          {alreadyClaimed ? (
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
            {gig.claims.map((claim) => (
              <div key={claim.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{claim.band.name}</div>
                  <div className="text-xs text-gray-500">{claim.band.genre}</div>
                  {claim.band.bio && (
                    <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{claim.band.bio}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={claim.status} />
                  {claim.status === "PENDING" && gig.status !== "CONFIRMED" && (
                    <form action={`/api/gigs/${gig.id}/confirm/${claim.bandId}`} method="POST">
                      <button type="submit" className="btn-primary text-xs px-3 py-1.5">
                        Confirm
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
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
