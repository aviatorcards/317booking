import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default async function VenueLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") redirect("/login");

  const venue = await prisma.venue.findUnique({
    where: { userId: session.user.id },
    select: { name: true },
  });

  return (
    <div className="flex min-h-screen bg-brand-50">
      <DashboardSidebar
        role="VENUE"
        userName={venue?.name ?? "My Venue"}
        userEmail={session.user.email ?? ""}
      />
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
