import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";

const EVENT_STYLES: Record<string, { label: string; classes: string }> = {
  "gig.cancelled":   { label: "Gig Cancelled",     classes: "bg-red-100 text-red-800" },
  "claim.confirmed": { label: "Claim Confirmed",    classes: "bg-blue-100 text-blue-800" },
  "payment.received":{ label: "Payment Received",   classes: "bg-green-100 text-green-800" },
  "payment.released":{ label: "Payment Released",   classes: "bg-indigo-100 text-indigo-800" },
  "user.deleted":    { label: "User Deleted",       classes: "bg-orange-100 text-orange-800" },
};

export default async function AdminAuditPage() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Admin</Link>
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">High-risk events — most recent 200</p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">No audit events recorded yet.</div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const style = EVENT_STYLES[log.event] ?? { label: log.event, classes: "bg-gray-100 text-gray-700" };
            const meta = log.meta as Record<string, unknown>;

            return (
              <div key={log.id} className="card flex items-start gap-4">
                {/* Timestamp */}
                <div className="shrink-0 text-xs text-gray-400 w-36 pt-0.5">
                  {new Date(log.createdAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                  <div>
                    {new Date(log.createdAt).toLocaleTimeString("en-US", {
                      hour: "numeric", minute: "2-digit",
                    })}
                  </div>
                </div>

                {/* Event badge */}
                <div className="shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.classes}`}>
                    {style.label}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 text-sm">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
                    {log.gigId && (
                      <span>
                        Gig:{" "}
                        <Link href={`/admin/gigs`} className="text-brand-500 hover:underline font-mono text-xs">
                          {log.gigId.slice(-8)}
                        </Link>
                      </span>
                    )}
                    {log.bandId && (
                      <span>
                        Band:{" "}
                        <Link href={`/admin/bands/${log.bandId}`} className="text-brand-500 hover:underline font-mono text-xs">
                          {log.bandId.slice(-8)}
                        </Link>
                      </span>
                    )}
                    {log.venueId && (
                      <span>
                        Venue:{" "}
                        <Link href={`/admin/venues/${log.venueId}`} className="text-brand-500 hover:underline font-mono text-xs">
                          {log.venueId.slice(-8)}
                        </Link>
                      </span>
                    )}
                    {log.actorId && (
                      <span className="text-gray-400">
                        by <span className="font-mono text-xs">{log.actorId.slice(-8)}</span>
                      </span>
                    )}
                  </div>

                  {/* Key meta fields rendered inline */}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                    {typeof meta.previousStatus === "string" && (
                      <span>was {meta.previousStatus}</span>
                    )}
                    {typeof meta.gigDate === "string" && (
                      <span>
                        {new Date(meta.gigDate).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                    )}
                    {typeof meta.payAmount === "number" && (
                      <span className="font-medium text-gray-700">{formatAmount(meta.payAmount)}</span>
                    )}
                    {typeof meta.amount === "number" && (
                      <span className="font-medium text-gray-700">{formatAmount(meta.amount)}</span>
                    )}
                    {typeof meta.confirmedBandName === "string" && meta.confirmedBandName && (
                      <span>band: {meta.confirmedBandName}</span>
                    )}
                    {typeof meta.totalClaimants === "number" && (
                      <span>{meta.totalClaimants} claimant{meta.totalClaimants !== 1 ? "s" : ""}</span>
                    )}
                    {typeof meta.email === "string" && (
                      <span>{meta.email}</span>
                    )}
                    {typeof meta.role === "string" && (
                      <span>{meta.role}</span>
                    )}
                    {typeof meta.entityName === "string" && meta.entityName && (
                      <span>{meta.entityName}</span>
                    )}
                    {meta.cancelledByAdmin === true && (
                      <span className="text-orange-600 font-medium">admin override</span>
                    )}
                    {typeof meta.stripePaymentIntentId === "string" && (
                      <span className="font-mono">{meta.stripePaymentIntentId}</span>
                    )}
                    {typeof meta.stripeTransferId === "string" && (
                      <span className="font-mono">{meta.stripeTransferId}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
