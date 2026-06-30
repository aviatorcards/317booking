import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveVenue } from "@/lib/activeVenue";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (session?.user.role === "VENUE") {
    const [venues, active] = await Promise.all([
      prisma.venue.findMany({ where: { userId: session.user.id }, orderBy: { name: "asc" } }),
      getActiveVenue(session.user.id),
    ]);
    return (
      <div className="flex min-h-screen bg-brand-50">
        <DashboardSidebar
          role="VENUE"
          userName={active?.name ?? "My Venue"}
          userEmail={session.user.email ?? ""}
          venues={venues}
          activeVenueId={active?.id}
        />
        <main className="flex-1 min-w-0 overflow-auto pt-14 lg:pt-0">{children}</main>
      </div>
    );
  }

  if (session?.user.role === "BAND") {
    const band = await prisma.band.findUnique({
      where: { userId: session.user.id },
      select: { name: true },
    });
    return (
      <div className="flex min-h-screen bg-brand-50">
        <DashboardSidebar
          role="BAND"
          userName={band?.name ?? "My Band"}
          userEmail={session.user.email ?? ""}
        />
        <main className="flex-1 min-w-0 overflow-auto pt-14 lg:pt-0">{children}</main>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
