import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 30;

interface SearchParams {
  q?: string;
  genre?: string;
}

export default async function BandsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = searchParams.q || "";
  const selectedGenre = searchParams.genre || "";

  // Query bands
  const where: any = {};
  if (q) {
    where.name = { contains: q, mode: "insensitive" };
  }
  if (selectedGenre) {
    where.genre = { contains: selectedGenre, mode: "insensitive" };
  }

  const bands = await prisma.band.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      claims: {
        where: {
          status: "CONFIRMED",
          gig: { status: { in: ["CONFIRMED", "COMPLETED"] } }
        },
        select: { id: true },
      },
    },
  });

  // Extract all unique genres for the filter dropdown
  const allBands = await prisma.band.findMany({ select: { genre: true } });
  const uniqueGenres = Array.from(
    new Set(
      allBands
        .map((b) => b.genre.split(","))
        .flat()
        .map((g) => g.trim())
        .filter(Boolean)
    )
  ).sort();

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-4xl font-extrabold tracking-tight text-brand-900 font-heading">
          Musician Directory
        </h1>
        <p className="text-brand-400 mt-2 text-lg">
          Browse and connect with local bands, musicians, and artists in the 317 area.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="card mb-8 bg-white border border-brand-200 p-5 rounded-2xl shadow-sm">
        <form method="GET" action="/bands" className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="label">Search Artists</label>
            <div className="relative">
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search by band name..."
                className="input pr-10"
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-brand-300">
                🔍
              </span>
            </div>
          </div>

          <div className="w-full md:w-64">
            <label className="label">Filter by Genre</label>
            <select
              name="genre"
              defaultValue={selectedGenre}
              className="input appearance-none bg-brand-50"
              onChange={(e) => {
                e.target.form?.submit();
              }}
            >
              <option value="">All Genres</option>
              {uniqueGenres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button type="submit" className="btn-primary w-full md:w-auto h-[42px] px-6">
              Filter
            </button>
            {(q || selectedGenre) && (
              <Link href="/bands" className="btn-secondary h-[42px] flex items-center justify-center">
                Clear
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Band Grid */}
      {bands.length === 0 ? (
        <div className="card text-center py-20 bg-white border-brand-200">
          <div className="text-5xl mb-4">🎸</div>
          <h3 className="text-xl font-bold text-brand-900 mb-2 font-heading">No Musicians Found</h3>
          <p className="text-brand-400 max-w-md mx-auto">
            Try adjusting your search query or genre filter to find registered artists.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bands.map((band) => {
            const confirmedCount = band.claims.length;
            const genres = band.genre.split(",").map((g) => g.trim()).filter(Boolean);

            return (
              <div
                key={band.id}
                className="card flex flex-col justify-between hover:border-brand-300 hover:shadow-md transition-all duration-300 bg-white border border-brand-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h2 className="text-xl font-bold text-brand-900 font-heading tracking-tight line-clamp-1">
                      {band.name}
                    </h2>
                    {band.studiosyncId && (
                      <span
                        title="Linked to StudioSync management"
                        className="bg-brand-100 text-brand-600 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      >
                        StudioSync
                      </span>
                    )}
                  </div>

                  {/* Genres */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {genres.slice(0, 3).map((g) => (
                      <span
                        key={g}
                        className="text-xs bg-brand-50 text-brand-400 font-semibold px-2.5 py-0.5 rounded-lg border border-brand-100"
                      >
                        {g}
                      </span>
                    ))}
                    {genres.length > 3 && (
                      <span className="text-xs text-brand-300 px-1 py-0.5 font-medium">
                        +{genres.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Bio */}
                  <p className="text-brand-400 text-sm line-clamp-3 mb-6">
                    {band.bio || "No biography provided yet."}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-brand-100 pt-4 mt-auto">
                  <span className="text-xs text-brand-300 font-medium">
                    {confirmedCount > 0 ? (
                      <span className="text-green-700 font-semibold">✓ {confirmedCount} Gigs Booked</span>
                    ) : (
                      "Newcomer"
                    )}
                  </span>
                  <Link
                    href={`/bands/${band.id}`}
                    className="text-sm font-semibold text-brand-500 hover:text-brand-600 flex items-center gap-1 group"
                  >
                    View Profile
                    <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
