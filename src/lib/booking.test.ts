import { beforeEach, describe, expect, it } from "vitest";
import { cancelGig, claimGig, confirmGigClaim, withdrawClaim } from "./booking";
import { parseShowDateTime } from "./timezone";

const TZ = "America/Indiana/Indianapolis";

type Claim = {
  id: string;
  gigId: string;
  bandId: string;
  status: string;
  band: { id: string; name: string; studiosyncId: string | null; user: { email: string } };
};

type Gig = {
  id: string;
  venueId: string;
  status: string;
  date: Date;
  claimMode: "AUTO_ASSIGN" | "VENUE_REVIEW";
  description: string;
  venue: { id: string; name: string; address: string; userId: string; user: { email: string } };
  payTier: { amount: number };
  payment: { id: string; status: string; releasedAt: Date | null } | null;
};

type State = {
  users: { id: string; role: string; emailVerified: Date | null }[];
  bands: { id: string; userId: string; name: string; genre: string; studiosyncId: string | null; email: string }[];
  availability: { bandId: string; month: string; availableDates: number[] }[];
  gigs: Gig[];
  claims: Claim[];
  seq: number;
};

function match(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  for (const [key, expected] of Object.entries(where)) {
    if (expected && typeof expected === "object" && !Array.isArray(expected) && !(expected instanceof Date)) {
      const spec = expected as Record<string, unknown>;
      if ("in" in spec) {
        if (!(spec.in as unknown[]).includes(row[key])) return false;
        continue;
      }
      if ("not" in spec) {
        if (row[key] === spec.not) return false;
        continue;
      }
      if ("gte" in spec || "lt" in spec) {
        const value = new Date(row[key] as string | Date).getTime();
        if ("gte" in spec && value < new Date(spec.gte as string).getTime()) return false;
        if ("lt" in spec && value >= new Date(spec.lt as string).getTime()) return false;
        continue;
      }
      const child = row[key];
      if (!child || typeof child !== "object") return false;
      if (!match(child as Record<string, unknown>, spec)) return false;
      continue;
    }
    if (row[key] !== expected) return false;
  }
  return true;
}

function createDb(initial: State) {
  const state = initial;
  let tail = Promise.resolve();

  function snapshot(): State {
    return structuredClone(state);
  }
  function restore(snap: State) {
    state.users = snap.users;
    state.bands = snap.bands;
    state.availability = snap.availability;
    state.gigs = snap.gigs;
    state.claims = snap.claims;
    state.seq = snap.seq;
  }

  function gigView(gig: Gig) {
    return {
      ...gig,
      claims: state.claims.filter((c) => c.gigId === gig.id),
    };
  }

  const tx = {
    $queryRaw: async () => [],
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => state.users.find((u) => u.id === where.id) ?? null,
    },
    band: {
      findUnique: async ({ where }: { where: { userId: string } }) => {
        const band = state.bands.find((b) => b.userId === where.userId);
        if (!band) return null;
        return { ...band, user: { email: band.email } };
      },
    },
    availability: {
      findUnique: async ({ where }: { where: { bandId_month: { bandId: string; month: string } } }) =>
        state.availability.find(
          (a) => a.bandId === where.bandId_month.bandId && a.month === where.bandId_month.month
        ) ?? null,
    },
    gig: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const gig = state.gigs.find((g) => g.id === where.id);
        return gig ? gigView(gig) : null;
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        state.gigs.find((g) => match(g as unknown as Record<string, unknown>, where)) ?? null,
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const hits = state.gigs.filter((g) => match(g as unknown as Record<string, unknown>, where));
        for (const gig of hits) Object.assign(gig, data);
        return { count: hits.length };
      },
    },
    gigClaim: {
      findUnique: async ({ where }: { where: { gigId_bandId: { gigId: string; bandId: string } } }) =>
        state.claims.find((c) => c.gigId === where.gigId_bandId.gigId && c.bandId === where.gigId_bandId.bandId) ?? null,
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        return (
          state.claims.find((claim) => {
            const gig = state.gigs.find((g) => g.id === claim.gigId);
            return match({ ...claim, gig }, where);
          }) ?? null
        );
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const hits = state.claims.filter((claim) => {
          const gig = state.gigs.find((g) => g.id === claim.gigId);
          return match({ ...claim, gig }, where);
        });
        for (const claim of hits) Object.assign(claim, data);
        return { count: hits.length };
      },
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        const before = state.claims.length;
        state.claims = state.claims.filter((claim) => {
          const gig = state.gigs.find((g) => g.id === claim.gigId);
          return !match({ ...claim, gig }, where);
        });
        return { count: before - state.claims.length };
      },
      count: async ({ where }: { where: Record<string, unknown> }) =>
        state.claims.filter((claim) => match(claim as unknown as Record<string, unknown>, where)).length,
      create: async ({ data }: { data: { gigId: string; bandId: string; status: string } }) => {
        const band = state.bands.find((b) => b.id === data.bandId);
        const claim: Claim = {
          id: `claim_${++state.seq}`,
          ...data,
          band: {
            id: data.bandId,
            name: band?.name ?? "Band",
            studiosyncId: band?.studiosyncId ?? null,
            user: { email: band?.email ?? "band@example.com" },
          },
        };
        state.claims.push(claim);
        return claim;
      },
    },
    payment: {
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        for (const gig of state.gigs) {
          if (gig.payment?.id === where.id) Object.assign(gig.payment, data);
        }
      },
    },
    webhookOutbox: { create: async () => ({ id: "out" }) },
  };

  const db = {
    user: tx.user,
    band: tx.band,
    $transaction: (fn: (client: typeof tx) => Promise<unknown>) => {
      const run = tail.then(async () => {
        const snap = snapshot();
        try {
          return await fn(tx);
        } catch (err) {
          restore(snap);
          throw err;
        }
      });
      tail = run.then(() => undefined, () => undefined);
      return run;
    },
    state,
  };
  return db;
}

function venueGig(overrides: Partial<Gig> = {}): Gig {
  return {
    id: "gig_1",
    venueId: "venue_1",
    status: "PENDING",
    date: parseShowDateTime("2026-07-15T21:00", TZ),
    claimMode: "VENUE_REVIEW",
    description: "",
    venue: {
      id: "venue_1",
      name: "Hi-Fi",
      address: "1043 Virginia Ave",
      userId: "user_venue",
      user: { email: "venue@example.com" },
    },
    payTier: { amount: 20000 },
    payment: null,
    ...overrides,
  };
}

function claim(partial: Partial<Claim> & Pick<Claim, "id" | "gigId" | "bandId">): Claim {
  return {
    status: "PENDING",
    band: {
      id: partial.bandId,
      name: partial.bandId,
      studiosyncId: null,
      user: { email: `${partial.bandId}@example.com` },
    },
    ...partial,
  };
}

let db: ReturnType<typeof createDb>;

beforeEach(() => {
  process.env.APP_TIMEZONE = TZ;
  db = createDb({
    users: [
      { id: "user_venue", role: "VENUE", emailVerified: new Date() },
      { id: "user_a", role: "BAND", emailVerified: new Date() },
      { id: "user_b", role: "BAND", emailVerified: new Date() },
    ],
    bands: [
      { id: "band_a", userId: "user_a", name: "Band A", genre: "Rock", studiosyncId: null, email: "a@example.com" },
      { id: "band_b", userId: "user_b", name: "Band B", genre: "Soul", studiosyncId: null, email: "b@example.com" },
    ],
    availability: [
      { bandId: "band_a", month: "2026-07", availableDates: [15, 16] },
      { bandId: "band_b", month: "2026-07", availableDates: [15, 16] },
    ],
    gigs: [venueGig()],
    claims: [
      claim({ id: "c_a", gigId: "gig_1", bandId: "band_a" }),
      claim({ id: "c_b", gigId: "gig_1", bandId: "band_b" }),
    ],
    seq: 2,
  });
});

describe("confirm, withdraw, and cancel", () => {
  it("lets only one confirm win when two bands are confirmed together", async () => {
    const [first, second] = await Promise.all([
      confirmGigClaim(db as never, { gigId: "gig_1", bandId: "band_a", actorUserId: "user_venue" }),
      confirmGigClaim(db as never, { gigId: "gig_1", bandId: "band_b", actorUserId: "user_venue" }),
    ]);
    const wins = [first, second].filter((result) => result.ok);
    expect(wins).toHaveLength(1);
    expect(db.state.gigs[0]?.status).toBe("CONFIRMED");
    expect(db.state.claims.filter((c) => c.status === "CONFIRMED")).toHaveLength(1);
  });

  it("does not reopen a confirmed gig when withdraw races confirm", async () => {
    const [confirmed, withdrawn] = await Promise.all([
      confirmGigClaim(db as never, { gigId: "gig_1", bandId: "band_a", actorUserId: "user_venue" }),
      withdrawClaim(db as never, { gigId: "gig_1", userId: "user_a" }),
    ]);
    expect([confirmed.ok, withdrawn.ok].filter(Boolean)).toHaveLength(1);
    if (confirmed.ok) {
      expect(db.state.gigs[0]?.status).toBe("CONFIRMED");
      expect(db.state.claims.find((c) => c.bandId === "band_a")?.status).toBe("CONFIRMED");
    } else {
      expect(db.state.gigs[0]?.status).toBe("PENDING");
      expect(db.state.claims.find((c) => c.bandId === "band_a")).toBeUndefined();
    }
  });

  it("keeps a cancelled gig cancelled when the band withdraws", async () => {
    const cancelled = await cancelGig(db as never, { gigId: "gig_1", actorUserId: "user_venue", asAdmin: false });
    expect(cancelled.ok).toBe(true);
    const withdrawn = await withdrawClaim(db as never, { gigId: "gig_1", userId: "user_a" });
    expect(withdrawn.ok).toBe(false);
    expect(db.state.gigs[0]?.status).toBe("CANCELLED");
    expect(db.state.claims.every((c) => c.status === "REJECTED")).toBe(true);
  });

  it("rejects a second booking for the same band on the same local date", async () => {
    db.state.gigs.push(venueGig({
      id: "gig_2",
      status: "CONFIRMED",
      date: parseShowDateTime("2026-07-15T18:00", TZ),
    }));
    db.state.claims.push(claim({ id: "c_existing", gigId: "gig_2", bandId: "band_a", status: "CONFIRMED" }));

    const result = await confirmGigClaim(db as never, { gigId: "gig_1", bandId: "band_a", actorUserId: "user_venue" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already booked/);
    expect(db.state.gigs.find((g) => g.id === "gig_1")?.status).toBe("PENDING");
    expect(db.state.claims.find((c) => c.id === "c_a")?.status).toBe("PENDING");
  });

  it("rejects a second confirmed gig at the same venue on that date", async () => {
    db.state.gigs.push(venueGig({
      id: "gig_2",
      status: "CONFIRMED",
      date: parseShowDateTime("2026-07-15T18:00", TZ),
    }));
    db.state.claims.push(claim({ id: "c_other", gigId: "gig_2", bandId: "band_b", status: "CONFIRMED" }));
    const result = await confirmGigClaim(db as never, { gigId: "gig_1", bandId: "band_a", actorUserId: "user_venue" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/venue already has/);
    expect(db.state.gigs.find((g) => g.id === "gig_1")?.status).toBe("PENDING");
  });

  it("allows two bands to claim a venue-review gig", async () => {
    db.state.gigs = [venueGig({ id: "gig_open", status: "OPEN" })];
    db.state.claims = [];
    const [a, b] = await Promise.all([
      claimGig(db as never, { gigId: "gig_open", userId: "user_a" }),
      claimGig(db as never, { gigId: "gig_open", userId: "user_b" }),
    ]);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(db.state.gigs[0]?.status).toBe("PENDING");
    expect(db.state.claims).toHaveLength(2);
  });

  it("blocks cancel after the charge exists", async () => {
    db.state.gigs[0]!.status = "CONFIRMED";
    db.state.gigs[0]!.payment = { id: "pay_1", status: "PAID", releasedAt: new Date() };
    const result = await cancelGig(db as never, { gigId: "gig_1", actorUserId: "user_venue", asAdmin: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
    expect(db.state.gigs[0]?.status).toBe("CONFIRMED");
  });
});
