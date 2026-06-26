import { Hr, Link, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, text, button, divider } from "./layout";

export interface GigCancelledEmailProps {
  bandName: string;
  venueName: string;
  gigDate: string;
  browseUrl: string;
}

export function GigCancelledEmail({
  bandName,
  venueName,
  gigDate,
  browseUrl,
}: GigCancelledEmailProps) {
  return (
    <EmailLayout preview={`Gig cancelled — ${venueName} on ${gigDate}`}>
      <Text style={text.h1}>Gig cancelled</Text>
      <Text style={text.body}>
        Hi {bandName}, we&apos;re sorry to let you know that the gig at{" "}
        <strong>{venueName}</strong> on <strong>{gigDate}</strong> has been
        cancelled by the venue.
      </Text>

      <Hr style={divider} />

      <Text style={text.muted}>
        We know this is disappointing. There are plenty of other openings —
        keep your availability up to date and we&apos;ll match you with the
        next one.
      </Text>

      <Link href={browseUrl} style={button.primary}>
        Browse open gigs →
      </Link>
    </EmailLayout>
  );
}

export default GigCancelledEmail;
