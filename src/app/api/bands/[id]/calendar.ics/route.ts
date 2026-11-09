import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppTimeZone, zonedParts } from "@/lib/timezone";

function foldLine(line: string): string {
  // RFC 5545 §3.1: lines longer than 75 octets must be folded
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const chunks: string[] = [];
  let offset = 0;
  let first = true;
  while (offset < bytes.length) {
    const limit = first ? 75 : 74; // continuation lines start with a space (1 byte)
    chunks.push(bytes.slice(offset, offset + limit).toString("utf8"));
    offset += limit;
    first = false;
  }
  return chunks.join("\r\n ");
}

function icsDate(date: Date): string {
  const p = zonedParts(date, getAppTimeZone());
  const m = String(p.month).padStart(2, "0");
  const d = String(p.day).padStart(2, "0");
  return `${p.year}${m}${d}`;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const band = await prisma.band.findUnique({
    where: { id: params.id },
    select: { id: true, name: true },
  });

  if (!band) {
    return new NextResponse("Band not found", { status: 404 });
  }

  // Confirmed gigs where this band's claim was confirmed
  const claims = await prisma.gigClaim.findMany({
    where: {
      bandId: band.id,
      status: "CONFIRMED",
      gig: { status: { in: ["CONFIRMED", "COMPLETED"] } },
    },
    include: {
      gig: {
        include: {
          venue: { select: { name: true, address: true } },
          payTier: { select: { name: true, amount: true } },
        },
      },
    },
  });

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//317booking//Band Calendar//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(band.name)} Gigs`,
    `X-WR-TIMEZONE:${getAppTimeZone()}`,
  ];

  for (const claim of claims) {
    const gig = claim.gig;
    const gigDate = new Date(gig.date);
    // All-day event: DTEND is the next day per RFC 5545
    const p = zonedParts(gigDate, getAppTimeZone());
    const next = new Date(Date.UTC(p.year, p.month - 1, p.day));
    next.setUTCDate(next.getUTCDate() + 1);

    const summary = `Gig @ ${gig.venue.name}`;
    const description = [
      gig.description,
      `Pay tier: ${gig.payTier.name} ($${(gig.payTier.amount / 100).toFixed(2)})`,
      `Status: ${gig.status}`,
    ]
      .filter(Boolean)
      .join("\\n");

    lines.push("BEGIN:VEVENT");
    lines.push(foldLine(`UID:gig-${gig.id}@317booking`));
    lines.push(foldLine(`SUMMARY:${escapeText(summary)}`));
    lines.push(foldLine(`DESCRIPTION:${escapeText(description)}`));
    lines.push(foldLine(`LOCATION:${escapeText(gig.venue.address)}`));
    lines.push(`DTSTART;VALUE=DATE:${icsDate(gigDate)}`);
    lines.push(`DTEND;VALUE=DATE:${next.getUTCFullYear()}${String(next.getUTCMonth() + 1).padStart(2, "0")}${String(next.getUTCDate()).padStart(2, "0")}`);
    lines.push(`STATUS:${gig.status === "COMPLETED" ? "COMPLETED" : "CONFIRMED"}`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const body = lines.map(foldLine).join("\r\n") + "\r\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${band.id}.ics"`,
      "Cache-Control": "no-cache",
    },
  });
}
