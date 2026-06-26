import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type AuditEvent =
  | "gig.cancelled"
  | "gig.rated"
  | "claim.confirmed"
  | "payment.received"
  | "payment.released"
  | "user.deleted";

interface AuditParams {
  event: AuditEvent;
  actorId?: string;
  gigId?: string;
  bandId?: string;
  venueId?: string;
  meta?: Record<string, unknown>;
}

export async function logAuditEvent(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      event: params.event,
      actorId: params.actorId ?? null,
      gigId: params.gigId ?? null,
      bandId: params.bandId ?? null,
      venueId: params.venueId ?? null,
      meta: (params.meta ?? {}) as Prisma.InputJsonValue,
    },
  });
}
