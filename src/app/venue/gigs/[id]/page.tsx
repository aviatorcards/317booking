import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmBandButton } from "./ConfirmBandButton";
import { CancelGigButton } from "./CancelGigButton";
import { PayGigButton } from "./PayGigButton";
import { RateGigForm } from "./RateGigForm";
import { formatShowDate } from "@/lib/timezone";

export default async function VenueGigPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") redirect("/login");

  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: {
      venue: { select: { userId: true } },
      payTier: true,
      payment: true,
      rating: true,
      claims: {
        include: {
          band: {
            select: {
              id: true, name: true, genre: true, bio: true,
              stripeAccountId: true,
              ratings: { select: { rating: true } },
            },
          },
        },
        orderBy: { claimedAt: "asc" },
      },
    },
  });

  if (!gig || gig.venue.userId !== session.user.id) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <Link href="/venue/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← Dashboard</Link>
        <div className="flex gap-2">
          {(gig.status === "OPEN" || gig.status === "PENDING") && (
            <Link href={`/venue/gigs/${gig.id}/edit`} className="btn-secondary text-sm">
              Edit
            </Link>
          )}
          <Link href={`/venue/gigs/new?from=${gig.id}`} className="btn-secondary text-sm">
            Duplicate
          </Link>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">
              {formatShowDate(new Date(gig.date))}
            </h1>
            <div className="text-sm text-gray-500 mt-1">
              {formatAmount(gig.payTier.amount)} · {gig.payTier.name}
            </div>
          </div>
          <StatusBadge status={gig.status} />
        </div>

        <div className="text-sm text-gray-500 mb-4">
          {gig.claimMode === "AUTO_ASSIGN" ? "Auto-assign (first-come)" : "Venue review"}
        </div>

        {gig.description && <p className="text-sm text-gray-600">{gig.description}</p>}

        {(gig.status === "OPEN" || gig.status === "PENDING" || (gig.status === "CONFIRMED" && gig.payment?.status !== "PAID" && !gig.payment?.releasedAt)) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <CancelGigButton gigId={gig.id} />
          </div>
        )}

        {gig.status === "CONFIRMED" && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {gig.payment ? (
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                  gig.payment.releasedAt
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {gig.payment.releasedAt ? "Payment released" : "Payment pending"}
                </span>
                <span className="text-sm text-gray-500">{formatAmount(gig.payment.amount)}</span>
              </div>
            ) : (() => {
              const confirmedBand = gig.claims.find((c) => c.status === "CONFIRMED")?.band;
              return confirmedBand && !confirmedBand.stripeAccountId ? (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Payment is unavailable — the band hasn&apos;t connected their Stripe account yet.
                </p>
              ) : (
                <PayGigButton gigId={gig.id} />
              );
            })()}
          </div>
        )}

        {gig.status === "COMPLETED" && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h2 className="text-sm font-semibold mb-3">
              {gig.rating ? "Your rating" : "Rate this show"}
            </h2>
            <RateGigForm gigId={gig.id} existingRating={gig.rating} />
          </div>
        )}
      </div>

      {/* Claims */}
      <div className="card">
        <h2 className="font-semibold mb-4">
          Claimants{" "}
          <span className="text-gray-400 font-normal text-sm">({gig.claims.length})</span>
        </h2>

        {gig.claims.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No claims yet.</p>
        ) : (
          <div className="space-y-3">
            {gig.claims.map((claim) => {
              const bandRatings = claim.band.ratings;
              const avg = bandRatings.length > 0
                ? bandRatings.reduce((s, r) => s + r.rating, 0) / bandRatings.length
                : null;
              return (
                <div key={claim.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/bands/${claim.bandId}`} className="font-bold text-brand-900 hover:text-brand-500 transition-colors">
                        {claim.band.name}
                      </Link>
                      {avg !== null && (
                        <span className="text-xs text-amber-500 font-medium">
                          {"★".repeat(Math.round(avg))} {avg.toFixed(1)}
                          <span className="text-gray-400 font-normal ml-0.5">({bandRatings.length})</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{claim.band.genre}</div>
                    {claim.band.bio && (
                      <div className="text-xs text-gray-400 mt-1 line-clamp-2">{claim.band.bio}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <StatusBadge status={claim.status} />
                    {claim.status === "PENDING" && gig.status !== "CONFIRMED" && (
                      <ConfirmBandButton gigId={gig.id} bandId={claim.bandId} bandName={claim.band.name} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
