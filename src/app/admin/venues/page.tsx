import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteUserButton } from "../users/DeleteUserButton";

export default async function AdminVenuesPage() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const venues = await prisma.venue.findMany({
    orderBy: { name: "asc" },
    include: {
      user: { select: { id: true, email: true, createdAt: true } },
      gigs: { select: { status: true } },
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Admin</Link>
        <h1 className="text-2xl font-bold">Venues ({venues.length})</h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4 font-medium">Venue</th>
              <th className="pb-3 pr-4 font-medium">Address</th>
              <th className="pb-3 pr-4 font-medium">Email</th>
              <th className="pb-3 pr-4 font-medium text-center">Capacity</th>
              <th className="pb-3 pr-4 font-medium text-center">Open</th>
              <th className="pb-3 pr-4 font-medium text-center">Confirmed</th>
              <th className="pb-3 pr-4 font-medium text-center">Completed</th>
              <th className="pb-3 pr-4 font-medium text-center">Cancelled</th>
              <th className="pb-3 pr-4 font-medium">Joined</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {venues.map((venue) => {
              const byStatus = (s: string) => venue.gigs.filter((g) => g.status === s).length;

              return (
                <tr key={venue.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium">
                    <Link href={`/venues/${venue.id}`} className="text-brand-500 hover:underline">
                      {venue.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{venue.address}</td>
                  <td className="py-3 pr-4 text-gray-600">{venue.user.email}</td>
                  <td className="py-3 pr-4 text-center text-gray-600">{venue.capacity.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-center">
                    <span className={byStatus("OPEN") > 0 ? "text-green-700 font-medium" : "text-gray-400"}>
                      {byStatus("OPEN")}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <span className={byStatus("CONFIRMED") > 0 ? "text-blue-700 font-medium" : "text-gray-400"}>
                      {byStatus("CONFIRMED")}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <span className={byStatus("COMPLETED") > 0 ? "text-indigo-700 font-medium" : "text-gray-400"}>
                      {byStatus("COMPLETED")}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <span className={byStatus("CANCELLED") > 0 ? "text-red-600 font-medium" : "text-gray-400"}>
                      {byStatus("CANCELLED")}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-500">
                    {new Date(venue.user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="py-3 text-right">
                    <DeleteUserButton userId={venue.user.id} userEmail={venue.user.email} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {venues.length === 0 && (
          <p className="text-center text-gray-400 py-12">No venues registered yet.</p>
        )}
      </div>
    </div>
  );
}
