import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveVenue } from "@/lib/activeVenue";
import { NewGigClient } from "./NewGigClient";

export default async function NewGigPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") redirect("/login");

  const tiers = await prisma.payTier.findMany({ orderBy: { amount: "asc" } });

  // Pre-fill from an existing gig if ?from= is provided
  let sourceGig: { date: Date; payTierId: string; description: string; claimMode: "VENUE_REVIEW" | "AUTO_ASSIGN" } | null = null;
  if (searchParams.from) {
    const venue = await getActiveVenue(session.user.id);
    if (venue) {
      const gig = await prisma.gig.findFirst({
        where: { id: searchParams.from, venueId: venue.id },
        select: { date: true, payTierId: true, description: true, claimMode: true },
      });
      sourceGig = gig;
    }
  }

  if (tiers.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-6">Post a New Gig</h1>
        <div className="card text-center py-8 text-gray-500">
          <p className="mb-3">No pay tiers set up yet.</p>
          <p className="text-sm text-gray-400">An admin needs to create pay tiers before you can post gigs.</p>
        </div>
      </div>
    );
  }

  // Format date for datetime-local input
  function toDatetimeLocal(date: Date) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  const initialValues = sourceGig
    ? {
        date: toDatetimeLocal(sourceGig.date),
        payTierId: sourceGig.payTierId,
        description: sourceGig.description,
        claimMode: sourceGig.claimMode,
      }
    : undefined;

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1">
        {sourceGig ? "Duplicate Gig" : "Post a New Gig"}
      </h1>
      {sourceGig && (
        <p className="text-sm text-gray-500 mb-6">Pre-filled from an existing gig — update the date and post.</p>
      )}
      {!sourceGig && <div className="mb-6" />}
      <NewGigClient tiers={tiers} initialValues={initialValues} />
    </div>
  );
}
