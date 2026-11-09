import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveVenue } from "@/lib/activeVenue";
import { formatAmount } from "@/lib/stripe";
import { formatShowDate, formatMonthLabel, zonedMonthRange } from "@/lib/timezone";
import { toCSV, toXLSX } from "@/lib/export";
import { renderPDF } from "@/lib/pdf";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "VENUE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "csv";
  const month = searchParams.get("month");

  const venue = await getActiveVenue(session.user.id);
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dateFilter = month && /^\d{4}-\d{2}$/.test(month) ? zonedMonthRange(month) : undefined;

  const gigs = await prisma.gig.findMany({
    where: {
      venueId: venue.id,
      ...(dateFilter && { date: dateFilter }),
    },
    include: {
      payTier: true,
      payment: true,
      claims: {
        where: { status: "CONFIRMED" },
        include: { band: { select: { name: true, genre: true } } },
      },
    },
    orderBy: { date: "asc" },
  });

  const colKeys = ["Date", "Band", "Genre", "Pay Tier", "Amount", "Platform Fee", "Band Payout", "Status", "Payment Sent"];
  const rows = gigs.map((gig) => {
    const confirmedBand = gig.claims[0]?.band ?? null;
    const payment = gig.payment;
    const gross = gig.payTier.amount;
    const fee = payment?.platformFee ?? 0;
    const net = gross - fee;
    return {
      "Date": formatShowDate(gig.date),
      "Band": confirmedBand?.name ?? "—",
      "Genre": confirmedBand?.genre ?? "—",
      "Pay Tier": gig.payTier.name,
      "Amount": formatAmount(gross),
      "Platform Fee": payment ? formatAmount(fee) : "—",
      "Band Payout": payment ? formatAmount(net) : "—",
      "Status": gig.status,
      "Payment Sent": payment?.releasedAt ? "Yes" : payment ? "Pending" : "No",
    };
  });

  const periodLabel = month && /^\d{4}-\d{2}$/.test(month) ? formatMonthLabel(month) : "All Time";
  const safeName = venue.name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "venue";
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
      title: `Gig Records — ${venue.name}`,
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

  const csv = toCSV(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
