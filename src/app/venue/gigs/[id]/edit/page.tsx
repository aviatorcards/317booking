import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditGigClient } from "./EditGigClient";

export default async function EditGigPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") redirect("/login");

  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: {
      venue: { select: { userId: true } },
      _count: { select: { claims: true } },
    },
  });

  if (!gig || gig.venue.userId !== session.user.id) notFound();

  // Can't edit completed or cancelled gigs
  if (gig.status === "COMPLETED" || gig.status === "CANCELLED") {
    redirect(`/venue/gigs/${params.id}`);
  }

  const tiers = await prisma.payTier.findMany({ orderBy: { amount: "asc" } });

  // Lock date/tier/claimMode if bands have already claimed
  const hasClaims = gig._count.claims > 0;
  const lockedFields: ("date" | "payTierId" | "claimMode")[] = hasClaims
    ? ["date", "payTierId", "claimMode"]
    : [];

  function toDatetimeLocal(date: Date) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href={`/venue/gigs/${params.id}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to gig
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">Edit Gig</h1>
      <EditGigClient
        gigId={params.id}
        tiers={tiers}
        initialValues={{
          date: toDatetimeLocal(gig.date),
          payTierId: gig.payTierId,
          description: gig.description,
          claimMode: gig.claimMode,
        }}
        lockedFields={lockedFields}
      />
    </div>
  );
}
