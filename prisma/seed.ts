import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// Credentials printed at the end so you know how to log in
const DEMO_PASSWORD = "demo1234";

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed while NODE_ENV=production.");
    process.exit(1);
  }
  console.log("Seeding demo data…");

  const pw = await hash(DEMO_PASSWORD, 12);

  // ── Admin ────────────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@317booking.com" },
    update: {},
    create: { email: "admin@317booking.com", passwordHash: pw, role: "ADMIN", emailVerified: new Date() },
  });
  console.log("  admin:", adminUser.email);

  // ── Pay Tiers ────────────────────────────────────────────────────────────────
  const tierOpener = await prisma.payTier.upsert({
    where: { id: "seed-tier-opener" },
    update: {},
    create: { id: "seed-tier-opener", name: "Opener", amount: 15000, platformFeePercent: 5 },
  });
  const tierSupport = await prisma.payTier.upsert({
    where: { id: "seed-tier-support" },
    update: {},
    create: { id: "seed-tier-support", name: "Support", amount: 30000, platformFeePercent: 5 },
  });
  const tierHeadliner = await prisma.payTier.upsert({
    where: { id: "seed-tier-headliner" },
    update: {},
    create: { id: "seed-tier-headliner", name: "Headliner", amount: 50000, platformFeePercent: 5 },
  });
  console.log("  pay tiers: Opener $150, Support $300, Headliner $500");

  // ── Venues ───────────────────────────────────────────────────────────────────
  const venueAccounts = [
    {
      email: "vogue@317booking.com",
      name: "The Vogue Theatre",
      address: "6259 N College Ave, Indianapolis, IN 46220",
      capacity: 950,
      userId: "seed-user-vogue",
      venueId: "seed-venue-vogue",
    },
    {
      email: "hifi@317booking.com",
      name: "Hi-Fi",
      address: "1043 Virginia Ave, Indianapolis, IN 46203",
      capacity: 600,
      userId: "seed-user-hifi",
      venueId: "seed-venue-hifi",
    },
    {
      email: "deluxe@317booking.com",
      name: "Deluxe at Old National Centre",
      address: "502 N New Jersey St, Indianapolis, IN 46204",
      capacity: 1200,
      userId: "seed-user-deluxe",
      venueId: "seed-venue-deluxe",
    },
  ];

  for (const v of venueAccounts) {
    const user = await prisma.user.upsert({
      where: { email: v.email },
      update: {},
      create: { id: v.userId, email: v.email, passwordHash: pw, role: "VENUE", emailVerified: new Date() },
    });
    await prisma.venue.upsert({
      where: { id: v.venueId },
      update: {},
      create: { id: v.venueId, userId: user.id, name: v.name, address: v.address, capacity: v.capacity },
    });
    console.log(`  venue: ${v.name} (${v.email})`);
  }

  // ── Bands ────────────────────────────────────────────────────────────────────
  const bandAccounts = [
    {
      email: "palms@317booking.com",
      name: "The Static Palms",
      genre: "Indie Rock",
      bio: "Four-piece indie rock band from Fountain Square. Known for layered guitar work and driving rhythms.",
      userId: "seed-user-palms",
      bandId: "seed-band-palms",
    },
    {
      email: "ghost@317booking.com",
      name: "Ghost Meridian",
      genre: "Dream Pop",
      bio: "Ambient-leaning dream pop duo. Toured regionally in 2024, currently writing their second LP.",
      userId: "seed-user-ghost",
      bandId: "seed-band-ghost",
    },
    {
      email: "copper@317booking.com",
      name: "Copper & The Rust",
      genre: "Americana / Folk",
      bio: "Roots band blending Americana, folk, and country. Strong harmonies, steel guitar, the works.",
      userId: "seed-user-copper",
      bandId: "seed-band-copper",
    },
    {
      email: "voltage@317booking.com",
      name: "Voltage Drop",
      genre: "Post-Punk",
      bio: "High-energy post-punk trio. Short sets, loud amps, no encore.",
      userId: "seed-user-voltage",
      bandId: "seed-band-voltage",
    },
  ];

  for (const b of bandAccounts) {
    const user = await prisma.user.upsert({
      where: { email: b.email },
      update: {},
      create: { id: b.userId, email: b.email, passwordHash: pw, role: "BAND", emailVerified: new Date() },
    });
    await prisma.band.upsert({
      where: { userId: user.id },
      update: {},
      create: { id: b.bandId, userId: user.id, name: b.name, genre: b.genre, bio: b.bio },
    });
    console.log(`  band: ${b.name} (${b.email})`);
  }

  // ── Availability ─────────────────────────────────────────────────────────────
  // Give each band availability for the next two months
  const now = new Date();
  for (let mo = 0; mo < 2; mo++) {
    const d = new Date(now.getFullYear(), now.getMonth() + mo, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    // Each band gets different available days so matching is interesting
    const patterns: Record<string, number[]> = {
      "seed-band-palms": Array.from({ length: daysInMonth }, (_, i) => i + 1).filter((d) => d % 2 === 0),
      "seed-band-ghost": Array.from({ length: daysInMonth }, (_, i) => i + 1).filter((d) => d % 3 !== 0),
      "seed-band-copper": [1, 5, 6, 7, 12, 13, 14, 19, 20, 21, 26, 27, 28],
      "seed-band-voltage": Array.from({ length: daysInMonth }, (_, i) => i + 1),
    };
    for (const [bandId, availableDates] of Object.entries(patterns)) {
      await prisma.availability.upsert({
        where: { bandId_month: { bandId, month } },
        update: { availableDates: availableDates.filter((d) => d <= daysInMonth) },
        create: { bandId, month, availableDates: availableDates.filter((d) => d <= daysInMonth) },
      });
    }
  }
  console.log("  availability set for all bands (next 2 months)");

  // ── Gigs ─────────────────────────────────────────────────────────────────────
  // Dates relative to today so they're always in the future
  function daysFromNow(n: number) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    d.setHours(20, 0, 0, 0); // 8pm show time
    return d;
  }

  // OPEN gig at The Vogue — bands can claim
  const gigOpen1 = await prisma.gig.upsert({
    where: { id: "seed-gig-open-1" },
    update: {},
    create: {
      id: "seed-gig-open-1",
      venueId: "seed-venue-vogue",
      payTierId: tierSupport.id,
      date: daysFromNow(12),
      claimMode: "VENUE_REVIEW",
      description: "Saturday night rock show. Looking for a high-energy support act.",
      status: "OPEN",
    },
  });

  // OPEN first-come gig at Hi-Fi
  const gigOpen2 = await prisma.gig.upsert({
    where: { id: "seed-gig-open-2" },
    update: {},
    create: {
      id: "seed-gig-open-2",
      venueId: "seed-venue-hifi",
      payTierId: tierOpener.id,
      date: daysFromNow(18),
      claimMode: "AUTO_ASSIGN",
      description: "Opener slot for a touring act. First band to claim gets it.",
      status: "OPEN",
    },
  });

  // OPEN headliner at Deluxe
  await prisma.gig.upsert({
    where: { id: "seed-gig-open-3" },
    update: {},
    create: {
      id: "seed-gig-open-3",
      venueId: "seed-venue-deluxe",
      payTierId: tierHeadliner.id,
      date: daysFromNow(25),
      claimMode: "VENUE_REVIEW",
      description: "Headliner slot for our monthly showcase. Americana and folk acts preferred.",
      status: "OPEN",
    },
  });

  console.log("  gigs: 3 OPEN");

  // PENDING gig at The Vogue — has claimants waiting for venue review
  const gigPending = await prisma.gig.upsert({
    where: { id: "seed-gig-pending" },
    update: {},
    create: {
      id: "seed-gig-pending",
      venueId: "seed-venue-vogue",
      payTierId: tierHeadliner.id,
      date: daysFromNow(20),
      claimMode: "VENUE_REVIEW",
      description: "Friday night headliner. We want someone who can fill the room.",
      status: "PENDING",
    },
  });

  // Add claims on the pending gig
  await prisma.gigClaim.upsert({
    where: { gigId_bandId: { gigId: gigPending.id, bandId: "seed-band-palms" } },
    update: {},
    create: { gigId: gigPending.id, bandId: "seed-band-palms", status: "PENDING" },
  });
  await prisma.gigClaim.upsert({
    where: { gigId_bandId: { gigId: gigPending.id, bandId: "seed-band-voltage" } },
    update: {},
    create: { gigId: gigPending.id, bandId: "seed-band-voltage", status: "PENDING" },
  });
  console.log("  gig: 1 PENDING (2 claimants awaiting venue review)");

  // CONFIRMED gig at Hi-Fi — Ghost Meridian confirmed, payment not yet made
  const gigConfirmed = await prisma.gig.upsert({
    where: { id: "seed-gig-confirmed" },
    update: {},
    create: {
      id: "seed-gig-confirmed",
      venueId: "seed-venue-hifi",
      payTierId: tierSupport.id,
      date: daysFromNow(8),
      claimMode: "VENUE_REVIEW",
      description: "Weekend show. Looking for a dream pop or ambient act.",
      status: "CONFIRMED",
    },
  });
  await prisma.gigClaim.upsert({
    where: { gigId_bandId: { gigId: gigConfirmed.id, bandId: "seed-band-ghost" } },
    update: {},
    create: { gigId: gigConfirmed.id, bandId: "seed-band-ghost", status: "CONFIRMED" },
  });
  await prisma.gigClaim.upsert({
    where: { gigId_bandId: { gigId: gigConfirmed.id, bandId: "seed-band-copper" } },
    update: {},
    create: { gigId: gigConfirmed.id, bandId: "seed-band-copper", status: "REJECTED" },
  });
  console.log("  gig: 1 CONFIRMED (Ghost Meridian booked, venue can pay)");

  // COMPLETED gig — already happened, payment released
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 5);
  pastDate.setHours(20, 0, 0, 0);
  const gigCompleted = await prisma.gig.upsert({
    where: { id: "seed-gig-completed" },
    update: {},
    create: {
      id: "seed-gig-completed",
      venueId: "seed-venue-deluxe",
      payTierId: tierHeadliner.id,
      date: pastDate,
      claimMode: "VENUE_REVIEW",
      description: "Last Friday's showcase. Great night.",
      status: "COMPLETED",
    },
  });
  await prisma.gigClaim.upsert({
    where: { gigId_bandId: { gigId: gigCompleted.id, bandId: "seed-band-copper" } },
    update: {},
    create: { gigId: gigCompleted.id, bandId: "seed-band-copper", status: "CONFIRMED" },
  });
  await prisma.payment.upsert({
    where: { gigId: gigCompleted.id },
    update: {},
    create: {
      gigId: gigCompleted.id,
      amount: 50000,
      platformFee: 2500,
      releasedAt: new Date(pastDate.getTime() + 24 * 60 * 60 * 1000),
    },
  });
  console.log("  gig: 1 COMPLETED (with payment record)");

  // Also add a claim on open gig 1 so bands have some existing activity
  await prisma.gigClaim.upsert({
    where: { gigId_bandId: { gigId: gigOpen1.id, bandId: "seed-band-copper" } },
    update: {},
    create: { gigId: gigOpen1.id, bandId: "seed-band-copper", status: "PENDING" },
  });
  await prisma.gigClaim.upsert({
    where: { gigId_bandId: { gigId: gigOpen2.id, bandId: "seed-band-voltage" } },
    update: {},
    create: { gigId: gigOpen2.id, bandId: "seed-band-voltage", status: "PENDING" },
  });

  console.log("\nDemo data ready. Log in with password: demo1234\n");
  console.log("  admin@317booking.com    — Admin");
  console.log("  vogue@317booking.com    — The Vogue Theatre (venue)");
  console.log("  hifi@317booking.com     — Hi-Fi (venue)");
  console.log("  deluxe@317booking.com   — Deluxe at Old National Centre (venue)");
  console.log("  palms@317booking.com    — The Static Palms (band)");
  console.log("  ghost@317booking.com    — Ghost Meridian (band)");
  console.log("  copper@317booking.com   — Copper & The Rust (band)");
  console.log("  voltage@317booking.com  — Voltage Drop (band)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
