"use strict";

const { PrismaClient } = require("@prisma/client");
const { createHmac } = require("crypto");

const prisma = new PrismaClient();

const MAX_ATTEMPTS = 5;
// Exponential backoff: 30s, 2m, 10m, 1h, 1h
const BACKOFF_MS = [30_000, 120_000, 600_000, 3_600_000, 3_600_000];

async function drain() {
  const jobs = await prisma.webhookOutbox.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  for (const job of jobs) {
    const body = JSON.stringify(job.payload);
    const secret = process.env.STUDIOSYNC_WEBHOOK_SECRET || "";
    const headers = {
      "Content-Type": "application/json",
      ...(secret && {
        "x-317booking-signature": `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`,
      }),
    };

    try {
      const res = await fetch(job.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      await prisma.webhookOutbox.update({
        where: { id: job.id },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });
      console.log(`[outbox] delivered ${job.id} → ${job.url}`);
    } catch (err) {
      const attempts = job.attempts + 1;
      const failed = attempts >= MAX_ATTEMPTS;
      const delayMs = BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)];

      await prisma.webhookOutbox.update({
        where: { id: job.id },
        data: {
          attempts,
          status: failed ? "FAILED" : "PENDING",
          nextAttemptAt: new Date(Date.now() + delayMs),
          lastError: String(err),
        },
      });

      const label = failed ? "FAILED (giving up)" : `retry in ${delayMs / 1000}s`;
      console.error(`[outbox] attempt ${attempts}/${MAX_ATTEMPTS} ${label} — ${job.id}: ${err}`);
    }
  }
}

async function main() {
  console.log("[outbox] worker started");
  for (;;) {
    try {
      await drain();
    } catch (err) {
      console.error("[outbox] drain error:", err);
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
