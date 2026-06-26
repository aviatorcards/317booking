import { Hr, Link, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, text, button, divider } from "./layout";

export interface ClaimRejectedEmailProps {
  bandName: string;
  venueName: string;
  gigDate: string;
  browseUrl: string;
}

export function ClaimRejectedEmail({
  bandName,
  venueName,
  gigDate,
  browseUrl,
}: ClaimRejectedEmailProps) {
  return (
    <EmailLayout
      preview={`Update on your claim for ${venueName} on ${gigDate}`}
    >
      <Text style={text.h1}>Claim update</Text>
      <Text style={text.body}>
        Hi {bandName}, the venue <strong>{venueName}</strong> has selected
        another band for the gig on <strong>{gigDate}</strong>.
      </Text>

      <Hr style={divider} />

      <Text style={text.muted}>
        There are always more gigs coming up. Keep your availability up to date
        and you&apos;ll be the first to see new openings that match.
      </Text>

      <Link href={browseUrl} style={button.primary}>
        Browse open gigs →
      </Link>
    </EmailLayout>
  );
}

export default ClaimRejectedEmail;
