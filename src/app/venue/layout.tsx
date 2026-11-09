import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveVenue } from "@/lib/activeVenue";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default async function VenueLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") redirect("/login");

  const [venues, activeVenue, account] = await Promise.all([
    prisma.venue.findMany({ where: { userId: session.user.id }, orderBy: { name: "asc" } }),
    getActiveVenue(session.user.id),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { emailVerified: true } }),
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
      <main className="flex-1 min-w-0 overflow-auto pt-14 lg:pt-0">
        {!account?.emailVerified && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-2">
            Verify your email before posting a gig. <a className="underline" href="/verify-email">Resend the link</a>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
