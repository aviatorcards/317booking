import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmBandButton } from "./ConfirmBandButton";
import { CancelGigButton } from "./CancelGigButton";

export default async function VenueGigPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") redirect("/login");

  const venue = await prisma.venue.findUnique({ where: { userId: session.user.id } });
  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: {
      payTier: true,
      claims: {
        include: { band: { select: { id: true, name: true, genre: true, bio: true } } },
        orderBy: { claimedAt: "asc" },
      },
    },
  });

  if (!gig || !venue || gig.venueId !== venue.id) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/venue/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← Dashboard</Link>
      </div>

      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">
              {new Date(gig.date).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
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

        {gig.status === "OPEN" || gig.status === "PENDING" ? (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <CancelGigButton gigId={gig.id} />
          </div>
        ) : null}
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
            {gig.claims.map((claim) => (
              <div key={claim.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{claim.band.name}</div>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
