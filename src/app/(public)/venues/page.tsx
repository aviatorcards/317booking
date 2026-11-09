import Link from "next/link";
import { prisma } from "@/lib/prisma";
import VenueFilterForm from "./VenueFilterForm";

export const revalidate = 30;

interface SearchParams {
  q?: string;
  capacity?: string;
  page?: string;
}

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = searchParams.q || "";
  const capacityPreset = searchParams.capacity || "";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 24;

  // Query venues
  const where: any = {};
  if (q) {
    where.name = { contains: q, mode: "insensitive" };
  }
  if (capacityPreset) {
    if (capacityPreset === "small") {
      where.capacity = { lt: 150 };
    } else if (capacityPreset === "medium") {
      where.capacity = { gte: 150, lte: 500 };
    } else if (capacityPreset === "large") {
      where.capacity = { gt: 500 };
    }
  }

  const venues = await prisma.venue.findMany({
    where,
    orderBy: { name: "asc" },
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
    include: {
      gigs: {
        where: { status: { in: ["OPEN", "PENDING", "CONFIRMED", "COMPLETED"] } },
        select: { status: true },
      },
    },
  });
  const hasMore = venues.length > pageSize;
  const pageVenues = hasMore ? venues.slice(0, pageSize) : venues;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-4xl font-extrabold tracking-tight text-brand-900 font-heading">
          Venue Directory
        </h1>
        <p className="text-brand-400 mt-2 text-lg">
          Explore local venues and performance spaces booking artists in Indianapolis.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="card mb-8 bg-white border border-brand-200 p-5 rounded-2xl shadow-sm">
        <VenueFilterForm q={q} capacityPreset={capacityPreset} />
      </div>

      {/* Venue Grid */}
      {pageVenues.length === 0 ? (
        <div className="card text-center py-20 bg-white border-brand-200">
          <div className="text-5xl mb-4">🏟</div>
          <h3 className="text-xl font-bold text-brand-900 mb-2 font-heading">No Venues Found</h3>
          <p className="text-brand-400 max-w-md mx-auto">
            Try adjusting your search criteria or size filter to locate registered spaces.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pageVenues.map((venue) => {
            const hostedGigsCount = venue.gigs.filter(
              (g) => g.status === "CONFIRMED" || g.status === "COMPLETED"
            ).length;
            const openGigsCount = venue.gigs.filter((g) => g.status === "OPEN" || g.status === "PENDING").length;

            return (
              <div
                key={venue.id}
                className="card flex flex-col justify-between hover:border-brand-300 hover:shadow-md transition-all duration-300 bg-white border border-brand-200"
              >
                <div>
                  <h2 className="text-xl font-bold text-brand-900 font-heading tracking-tight mb-2 line-clamp-1">
                    {venue.name}
                  </h2>
                  <p className="text-brand-400 text-xs mb-4 line-clamp-1">📍 {venue.address}</p>

                  <div className="grid grid-cols-2 gap-2 my-4 border-t border-b border-brand-50 py-3 text-sm">
                    <div>
                      <span className="block text-xs text-brand-300 uppercase tracking-wider font-semibold">
                        Capacity
                      </span>
                      <span className="font-bold text-brand-900">
                        {venue.capacity.toLocaleString()} max
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-brand-300 uppercase tracking-wider font-semibold">
                        Size Type
                      </span>
                      <span className="font-semibold text-brand-900">
                        {venue.capacity < 150
                          ? "Intimate / Small"
                          : venue.capacity <= 500
                          ? "Club / Medium"
                          : "Theater / Large"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 mt-auto">
                  <span className="text-xs text-brand-300 font-medium">
                    {openGigsCount > 0 ? (
                      <span className="text-green-700 font-semibold">{openGigsCount} Open Gig{openGigsCount !== 1 ? "s" : ""}</span>
                    ) : hostedGigsCount > 0 ? (
                      `${hostedGigsCount} shows hosted`
                    ) : (
                      "No upcoming shows"
                    )}
                  </span>
                  <Link
                    href={`/venues/${venue.id}`}
                    className="text-sm font-semibold text-brand-500 hover:text-brand-600 flex items-center gap-1 group"
                  >
                    View Details
                    <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {(page > 1 || hasMore) && (
        <div className="flex gap-3 mt-6">
          {page > 1 && (
            <Link className="btn-secondary text-sm" href={`/venues?${new URLSearchParams({ ...(q ? { q } : {}), ...(capacityPreset ? { capacity: capacityPreset } : {}), page: String(page - 1) })}`}>Previous</Link>
          )}
          {hasMore && (
            <Link className="btn-secondary text-sm" href={`/venues?${new URLSearchParams({ ...(q ? { q } : {}), ...(capacityPreset ? { capacity: capacityPreset } : {}), page: String(page + 1) })}`}>Next</Link>
          )}
        </div>
      )}
    </div>
  );
}
