import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default async function BandLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.user.role !== "BAND") redirect("/login");

  const [band, account] = await Promise.all([
    prisma.band.findUnique({
      where: { userId: session.user.id },
      select: { name: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true },
    }),
  ]);

  return (
    <div className="flex min-h-screen bg-brand-50">
      <DashboardSidebar
        role="BAND"
        userName={band?.name ?? "My Band"}
        userEmail={session.user.email ?? ""}
      />
      <main className="flex-1 min-w-0 overflow-auto pt-14 lg:pt-0">
        {!account?.emailVerified && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-2">
            Verify your email before claiming a gig. <a className="underline" href="/verify-email">Resend the link</a>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
