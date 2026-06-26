import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";
import { toCSV, toXLSX } from "@/lib/export";
import { renderPDF } from "@/lib/pdf";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "BAND") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "csv";
  const month = searchParams.get("month"); // YYYY-MM or null for all time

  const band = await prisma.band.findUnique({ where: { userId: session.user.id } });
  if (!band) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dateFilter = month
    ? (() => {
        const [y, m] = month.split("-").map(Number);
        return { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
      })()
    : undefined;

  const claims = await prisma.gigClaim.findMany({
    where: {
      bandId: band.id,
      status: { in: ["CONFIRMED", "REJECTED"] },
      ...(dateFilter && { gig: { date: dateFilter } }),
    },
    include: {
      gig: {
        include: {
          venue: { select: { name: true, address: true } },
          payTier: true,
          payment: true,
        },
      },
    },
    orderBy: { gig: { date: "asc" } },
  });

  const colKeys = ["Date", "Venue", "Address", "Pay Tier", "Gross Amount", "Platform Fee", "Your Payout", "Status", "Paid"];
  const rows = claims.map((claim) => {
    const payment = claim.gig.payment;
    const gross = claim.gig.payTier.amount;
    const fee = payment?.platformFee ?? Math.round(gross * (claim.gig.payTier.platformFeePercent ?? 0) / 100);
    const net = gross - fee;
    return {
      "Date": new Date(claim.gig.date).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
      }),
      "Venue": claim.gig.venue.name,
      "Address": claim.gig.venue.address,
      "Pay Tier": claim.gig.payTier.name,
      "Gross Amount": formatAmount(gross),
      "Platform Fee": formatAmount(fee),
      "Your Payout": formatAmount(net),
      "Status": claim.gig.status,
      "Paid": payment?.releasedAt ? "Yes" : "No",
    };
  });

  const periodLabel = month
    ? new Date(Number(month.split("-")[0]), Number(month.split("-")[1]) - 1, 1)
        .toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "All Time";
  const filename = `317booking-${band.name.replace(/\s+/g, "-").toLowerCase()}-${month ?? "all"}`;

  if (format === "xlsx") {
    const buffer = toXLSX(rows, "Gig Records");
    return new NextResponse(buffer.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const buffer = await renderPDF({
      title: `Gig Records — ${band.name}`,
      subtitle: `Period: ${periodLabel} · ${rows.length} show${rows.length !== 1 ? "s" : ""}`,
      columns: colKeys,
      colKeys,
      rows,
    });
    return new NextResponse(buffer.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  }

  // Default: CSV
  const csv = toCSV(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
