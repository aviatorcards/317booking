import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminBandsPage() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  const bands = await prisma.band.findMany({
    orderBy: { name: "asc" },
    include: {
      user: { select: { email: true, createdAt: true } },
      claims: {
        include: { gig: { select: { status: true } } },
      },
      availability: {
        where: { month: currentMonth },
        select: { availableDates: true, lockedAt: true, updatedAt: true },
      },
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Admin</Link>
        <h1 className="text-2xl font-bold">Bands ({bands.length})</h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4 font-medium">Band</th>
              <th className="pb-3 pr-4 font-medium">Genre</th>
              <th className="pb-3 pr-4 font-medium">Email</th>
              <th className="pb-3 pr-4 font-medium text-center">Confirmed Gigs</th>
              <th className="pb-3 pr-4 font-medium text-center">Total Claims</th>
              <th className="pb-3 pr-4 font-medium text-center">{currentMonth} Availability</th>
              <th className="pb-3 pr-4 font-medium text-center">Stripe</th>
              <th className="pb-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bands.map((band) => {
              const confirmedGigs = band.claims.filter(
                (c) => c.status === "CONFIRMED" && (c.gig.status === "CONFIRMED" || c.gig.status === "COMPLETED")
              ).length;
              const avail = band.availability[0];
              const availLabel = avail
                ? `${avail.availableDates.length} days${avail.lockedAt ? " 🔒" : ""}`
                : "—";

              return (
                <tr key={band.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium">
                    <Link href={`/bands/${band.id}`} className="text-brand-500 hover:underline">
                      {band.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{band.genre}</td>
                  <td className="py-3 pr-4 text-gray-600">{band.user.email}</td>
                  <td className="py-3 pr-4 text-center">
                    <span className={confirmedGigs > 0 ? "text-green-700 font-medium" : "text-gray-400"}>
                      {confirmedGigs}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-center text-gray-600">{band.claims.length}</td>
                  <td className="py-3 pr-4 text-center">
                    <span className={avail ? "text-indigo-700 font-medium" : "text-gray-400"}>
                      {availLabel}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-center">
                    {band.stripeAccountId ? (
                      <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">Connected</span>
                    ) : (
                      <span className="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">None</span>
                    )}
                  </td>
                  <td className="py-3 text-gray-500">
                    {new Date(band.user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {bands.length === 0 && (
          <p className="text-center text-gray-400 py-12">No bands registered yet.</p>
        )}
      </div>
    </div>
  );
}
