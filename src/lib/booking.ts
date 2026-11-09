import { Prisma, PrismaClient } from "@prisma/client";
import { showDay, showMonthKey, zonedDayRange } from "./timezone";
import { writeOutbox } from "./studiosync";

export class BookingError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type ActionResult<T> = ({ ok: true } & T) | { ok: false; status: number; error: string };

type Db = PrismaClient;

function fail(status: number, error: string): ActionResult<never> {
  return { ok: false, status, error };
}

async function verifiedUser(db: Db, userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, emailVerified: true, role: true },
  });
}

async function lockDate(tx: Prisma.TransactionClient, kind: "band" | "venue", id: string, dayKey: string) {
  const key = `${kind}:${id}:${dayKey}`;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}

async function doubleBookMessage(
  tx: Prisma.TransactionClient,
  args: { gigId: string; bandId: string; venueId: string; date: Date }
): Promise<string | null> {
  const { gte, lt } = zonedDayRange(args.date);
  const bandHit = await tx.gigClaim.findFirst({
    where: {
      bandId: args.bandId,
      status: "CONFIRMED",
      gigId: { not: args.gigId },
      gig: { status: { in: ["CONFIRMED", "COMPLETED"] }, date: { gte, lt } },
    },
    select: { id: true },
  });
  if (bandHit) return "That band is already booked on this date";
  const venueHit = await tx.gig.findFirst({
    where: {
      id: { not: args.gigId },
      venueId: args.venueId,
      status: { in: ["CONFIRMED", "COMPLETED"] },
      date: { gte, lt },
    },
    select: { id: true },
  });
  if (venueHit) return "This venue already has a confirmed gig on this date";
  return null;
}

export async function claimGig(db: Db, args: { gigId: string; userId: string }): Promise<ActionResult<{
  claimId: string;
  status: "PENDING" | "CONFIRMED";
  venueEmail: string | null;
  venueName: string;
  bandName: string;
  bandGenre: string;
  gigDate: Date;
  autoAssigned: boolean;
  bandEmail: string | null;
  venueAddress: string;
  payAmount: number;
}>> {
  const user = await verifiedUser(db, args.userId);
  if (!user || user.role !== "BAND") return fail(401, "Unauthorized");
  if (!user.emailVerified) return fail(403, "Verify your email before claiming a gig");

  const band = await db.band.findUnique({
    where: { userId: args.userId },
    select: { id: true, name: true, genre: true, studiosyncId: true, user: { select: { email: true } } },
  });
  if (!band) return fail(404, "Band not found");

  try {
    return await db.$transaction(async (tx) => {
      const gig = await tx.gig.findUnique({
        where: { id: args.gigId },
        include: {
          venue: { select: { id: true, name: true, address: true, user: { select: { email: true } } } },
          payTier: { select: { amount: true } },
        },
      });
      if (!gig) throw new BookingError(404, "Gig not found");
      if (gig.status !== "OPEN" && gig.status !== "PENDING") {
        throw new BookingError(409, "Gig is not open for claims");
      }
      if (gig.claimMode === "AUTO_ASSIGN" && gig.status !== "OPEN") {
        throw new BookingError(409, "Gig is not open for claims");
      }

      const month = showMonthKey(gig.date);
      const day = showDay(gig.date);
      const avail = await tx.availability.findUnique({
        where: { bandId_month: { bandId: band.id, month } },
      });
      if (!avail || !avail.availableDates.includes(day)) {
        throw new BookingError(400, "You haven't marked yourself available on this date");
      }

      const existing = await tx.gigClaim.findUnique({
        where: { gigId_bandId: { gigId: gig.id, bandId: band.id } },
      });
      if (existing) throw new BookingError(409, "Already claimed");

      if (gig.claimMode === "AUTO_ASSIGN") {
        const dayKey = `${month}-${String(day).padStart(2, "0")}`;
        await lockDate(tx, "band", band.id, dayKey);
        await lockDate(tx, "venue", gig.venueId, dayKey);
        const won = await tx.gig.updateMany({
          where: { id: gig.id, status: "OPEN" },
          data: { status: "CONFIRMED" },
        });
        if (won.count === 0) throw new BookingError(409, "Gig is not open for claims");
        const conflict = await doubleBookMessage(tx, {
          gigId: gig.id,
          bandId: band.id,
          venueId: gig.venueId,
          date: gig.date,
        });
        if (conflict) throw new BookingError(409, conflict);
        const claim = await tx.gigClaim.create({
          data: { gigId: gig.id, bandId: band.id, status: "CONFIRMED" },
        });
        if (band.studiosyncId) {
          await writeOutbox(tx, {
            event: "gig.confirmed",
            gig: {
              id: gig.id,
              date: gig.date.toISOString(),
              studiosync_band_id: band.studiosyncId,
              venue_name: gig.venue.name,
              venue_address: gig.venue.address,
              description: gig.description,
            },
          });
        }
        return {
          ok: true as const,
          claimId: claim.id,
          status: "CONFIRMED" as const,
          venueEmail: gig.venue.user.email,
          venueName: gig.venue.name,
          bandName: band.name,
          bandGenre: band.genre,
          gigDate: gig.date,
          autoAssigned: true,
          bandEmail: band.user.email,
          venueAddress: gig.venue.address,
          payAmount: gig.payTier.amount,
        };
      }

      const opened = await tx.gig.updateMany({
        where: { id: gig.id, status: { in: ["OPEN", "PENDING"] } },
        data: { status: "PENDING" },
      });
      if (opened.count === 0) throw new BookingError(409, "Gig is not open for claims");
      const claim = await tx.gigClaim.create({
        data: { gigId: gig.id, bandId: band.id, status: "PENDING" },
      });
      return {
        ok: true as const,
        claimId: claim.id,
        status: "PENDING" as const,
        venueEmail: gig.venue.user.email,
        venueName: gig.venue.name,
        bandName: band.name,
        bandGenre: band.genre,
        gigDate: gig.date,
        autoAssigned: false,
        bandEmail: band.user.email,
        venueAddress: gig.venue.address,
        payAmount: gig.payTier.amount,
      };
    });
  } catch (err) {
    if (err instanceof BookingError) return fail(err.status, err.message);
    throw err;
  }
}

export async function withdrawClaim(db: Db, args: { gigId: string; userId: string }): Promise<ActionResult<{ gigId: string }>> {
  const band = await db.band.findUnique({ where: { userId: args.userId }, select: { id: true } });
  if (!band) return fail(401, "Unauthorized");

  try {
    return await db.$transaction(async (tx) => {
      const removed = await tx.gigClaim.deleteMany({
        where: { gigId: args.gigId, bandId: band.id, status: "PENDING" },
      });
      if (removed.count === 0) throw new BookingError(409, "Only pending claims can be withdrawn");
      const remaining = await tx.gigClaim.count({
        where: { gigId: args.gigId, status: "PENDING" },
      });
      if (remaining === 0) {
        await tx.gig.updateMany({
          where: { id: args.gigId, status: "PENDING" },
          data: { status: "OPEN" },
        });
      }
      return { ok: true as const, gigId: args.gigId };
    });
  } catch (err) {
    if (err instanceof BookingError) return fail(err.status, err.message);
    throw err;
  }
}

export async function confirmGigClaim(
  db: Db,
  args: { gigId: string; bandId: string; actorUserId: string }
): Promise<ActionResult<{
  gigId: string;
  bandId: string;
  venueId: string;
  gigDate: Date;
  payAmount: number;
  totalClaimants: number;
  confirmed: { email: string; bandName: string; venueName: string; venueAddress: string };
  rejected: { email: string; bandName: string }[];
}>> {
  try {
    return await db.$transaction(async (tx) => {
      const gig = await tx.gig.findUnique({
        where: { id: args.gigId },
        include: {
          venue: { select: { id: true, name: true, address: true, userId: true } },
          payTier: { select: { amount: true } },
          claims: {
            include: { band: { select: { id: true, name: true, studiosyncId: true, user: { select: { email: true } } } } },
          },
        },
      });
      if (!gig || gig.venue.userId !== args.actorUserId) throw new BookingError(403, "Forbidden");
      if (gig.status !== "OPEN" && gig.status !== "PENDING") {
        throw new BookingError(409, "Gig cannot be confirmed");
      }
      const chosen = gig.claims.find((c) => c.bandId === args.bandId && c.status === "PENDING");
      if (!chosen) throw new BookingError(409, "That band does not have a pending claim");

      const month = showMonthKey(gig.date);
      const day = showDay(gig.date);
      const dayKey = `${month}-${String(day).padStart(2, "0")}`;
      await lockDate(tx, "band", args.bandId, dayKey);
      await lockDate(tx, "venue", gig.venueId, dayKey);

      const won = await tx.gig.updateMany({
        where: { id: gig.id, status: { in: ["OPEN", "PENDING"] } },
        data: { status: "CONFIRMED" },
      });
      if (won.count === 0) throw new BookingError(409, "Gig cannot be confirmed");

      const confirmed = await tx.gigClaim.updateMany({
        where: { gigId: gig.id, bandId: args.bandId, status: "PENDING" },
        data: { status: "CONFIRMED" },
      });
      if (confirmed.count === 0) throw new BookingError(409, "That band does not have a pending claim");

      const conflict = await doubleBookMessage(tx, {
        gigId: gig.id,
        bandId: args.bandId,
        venueId: gig.venueId,
        date: gig.date,
      });
      if (conflict) throw new BookingError(409, conflict);

      await tx.gigClaim.updateMany({
        where: { gigId: gig.id, bandId: { not: args.bandId }, status: "PENDING" },
        data: { status: "REJECTED" },
      });

      if (chosen.band.studiosyncId) {
        await writeOutbox(tx, {
          event: "gig.confirmed",
          gig: {
            id: gig.id,
            date: gig.date.toISOString(),
            studiosync_band_id: chosen.band.studiosyncId,
            venue_name: gig.venue.name,
            venue_address: gig.venue.address,
            description: gig.description,
          },
        });
      }

      return {
        ok: true as const,
        gigId: gig.id,
        bandId: args.bandId,
        venueId: gig.venue.id,
        gigDate: gig.date,
        payAmount: gig.payTier.amount,
        totalClaimants: gig.claims.length,
        confirmed: {
          email: chosen.band.user.email,
          bandName: chosen.band.name,
          venueName: gig.venue.name,
          venueAddress: gig.venue.address,
        },
        rejected: gig.claims
          .filter((c) => c.bandId !== args.bandId && c.status === "PENDING")
          .map((c) => ({ email: c.band.user.email, bandName: c.band.name })),
      };
    });
  } catch (err) {
    if (err instanceof BookingError) return fail(err.status, err.message);
    throw err;
  }
}

export async function cancelGig(
  db: Db,
  args: { gigId: string; actorUserId: string; asAdmin: boolean }
): Promise<ActionResult<{
  gigId: string;
  venueId: string;
  previousStatus: string;
  gigDate: Date;
  payAmount: number;
  confirmedBandId: string | null;
  confirmedBandName: string | null;
  recipients: { email: string; bandName: string }[];
}>> {
  try {
    return await db.$transaction(async (tx) => {
      const gig = await tx.gig.findUnique({
        where: { id: args.gigId },
        include: {
          payTier: { select: { amount: true } },
          venue: { select: { id: true, name: true, userId: true } },
          payment: true,
          claims: {
            where: { status: { in: ["PENDING", "CONFIRMED"] } },
            include: { band: { select: { id: true, name: true, studiosyncId: true, user: { select: { email: true } } } } },
          },
        },
      });
      if (!gig) throw new BookingError(404, "Not found");
      if (!args.asAdmin && gig.venue.userId !== args.actorUserId) throw new BookingError(403, "Forbidden");
      if (gig.status === "COMPLETED" || gig.status === "CANCELLED") {
        throw new BookingError(409, "Gig cannot be cancelled");
      }
      if (gig.payment && (gig.payment.status === "PAID" || gig.payment.releasedAt)) {
        throw new BookingError(409, "This gig has been paid. Refund the charge in Stripe before cancelling.");
      }

      const updated = await tx.gig.updateMany({
        where: { id: gig.id, status: { in: ["OPEN", "PENDING", "CONFIRMED"] } },
        data: { status: "CANCELLED" },
      });
      if (updated.count === 0) throw new BookingError(409, "Gig cannot be cancelled");

      await tx.gigClaim.updateMany({
        where: { gigId: gig.id, status: { in: ["PENDING", "CONFIRMED"] } },
        data: { status: "REJECTED" },
      });

      if (gig.payment && gig.payment.status === "PENDING") {
        await tx.payment.update({
          where: { id: gig.payment.id },
          data: { status: "CANCELLED" },
        });
      }

      const confirmed = gig.claims.find((c) => c.status === "CONFIRMED");
      if (confirmed?.band.studiosyncId) {
        await writeOutbox(tx, { event: "gig.cancelled", gig: { id: gig.id } });
      }

      return {
        ok: true as const,
        gigId: gig.id,
        venueId: gig.venue.id,
        previousStatus: gig.status,
        gigDate: gig.date,
        payAmount: gig.payTier.amount,
        confirmedBandId: confirmed?.band.id ?? null,
        confirmedBandName: confirmed?.band.name ?? null,
        recipients: gig.claims.map((c) => ({ email: c.band.user.email, bandName: c.band.name })),
      };
    });
  } catch (err) {
    if (err instanceof BookingError) return fail(err.status, err.message);
    throw err;
  }
}
