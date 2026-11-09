import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/stripe";
import { formatShowDate, formatMonthLabel, zonedMonthRange } from "@/lib/timezone";
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

  const dateFilter = month && /^\d{4}-\d{2}$/.test(month) ? zonedMonthRange(month) : undefined;

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
      "Date": formatShowDate(claim.gig.date),
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

  const periodLabel = month && /^\d{4}-\d{2}$/.test(month) ? formatMonthLabel(month) : "All Time";
  const safeName = band.name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "band";
  const filename = `317booking-${safeName}-${month && /^\d{4}-\d{2}$/.test(month) ? month : "all"}`;

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
