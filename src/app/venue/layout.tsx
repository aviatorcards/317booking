import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveVenue } from "@/lib/activeVenue";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default async function VenueLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") redirect("/login");

  const [venues, activeVenue] = await Promise.all([
    prisma.venue.findMany({ where: { userId: session.user.id }, orderBy: { name: "asc" } }),
    getActiveVenue(session.user.id),
  ]);

  return (
    <div className="flex min-h-screen bg-brand-50">
      <DashboardSidebar
        role="VENUE"
        userName={activeVenue?.name ?? "My Venue"}
        userEmail={session.user.email ?? ""}
        venues={venues}
        activeVenueId={activeVenue?.id}
      />
      <main className="flex-1 min-w-0 overflow-auto pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
