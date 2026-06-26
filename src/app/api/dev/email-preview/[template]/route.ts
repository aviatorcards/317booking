import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/components";
import * as React from "react";

import { GigClaimedEmail } from "@/emails/GigClaimedEmail";
import { ClaimConfirmedEmail } from "@/emails/ClaimConfirmedEmail";
import { ClaimRejectedEmail } from "@/emails/ClaimRejectedEmail";
import { GigCancelledEmail } from "@/emails/GigCancelledEmail";
import { PaymentReleasedEmail } from "@/emails/PaymentReleasedEmail";
import { PasswordResetEmail } from "@/emails/PasswordResetEmail";

// Only available in development
export async function GET(
  _req: NextRequest,
  { params }: { params: { template: string } }
) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not found", { status: 404 });
  }

  const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const templates: Record<string, React.ReactElement> = {
    "gig-claimed": React.createElement(GigClaimedEmail, {
      venueName: "The Vogue Theatre",
      bandName: "The Static Palms",
      bandGenre: "Indie Rock",
      gigDate: "Saturday, July 12, 2026",
      reviewUrl: `${APP_URL}/venue/gigs/sample-gig-id`,
    }),
    "claim-confirmed": React.createElement(ClaimConfirmedEmail, {
      bandName: "The Static Palms",
      venueName: "The Vogue Theatre",
      venueAddress: "6259 Hollywood Blvd, Los Angeles, CA",
      gigDate: "Saturday, July 12, 2026",
      payAmount: "$500.00",
      dashboardUrl: `${APP_URL}/band/dashboard`,
    }),
    "claim-rejected": React.createElement(ClaimRejectedEmail, {
      bandName: "The Static Palms",
      venueName: "The Vogue Theatre",
      gigDate: "Saturday, July 12, 2026",
      browseUrl: `${APP_URL}/gigs`,
    }),
    "gig-cancelled": React.createElement(GigCancelledEmail, {
      bandName: "The Static Palms",
      venueName: "The Vogue Theatre",
      gigDate: "Saturday, July 12, 2026",
      browseUrl: `${APP_URL}/gigs`,
    }),
    "payment-released": React.createElement(PaymentReleasedEmail, {
      bandName: "The Static Palms",
      venueName: "The Vogue Theatre",
      gigDate: "Saturday, July 12, 2026",
      payAmount: "$500.00",
      dashboardUrl: `${APP_URL}/band/dashboard`,
    }),
    "password-reset": React.createElement(PasswordResetEmail, {
      name: "The Static Palms",
      resetUrl: `${APP_URL}/reset-password?token=sample-token`,
      expiresIn: "24 hours",
      isNewAccount: false,
    }),
    "new-account": React.createElement(PasswordResetEmail, {
      name: "The Static Palms",
      resetUrl: `${APP_URL}/reset-password?token=sample-token`,
      expiresIn: "7 days",
      isNewAccount: true,
    }),
  };

  const element = templates[params.template];
  if (!element) {
    const list = Object.keys(templates).join(", ");
    return new NextResponse(`Unknown template. Available: ${list}`, { status: 404 });
  }

  const html = await render(element);
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
