import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default async function BandLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.user.role !== "BAND") redirect("/login");

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
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
