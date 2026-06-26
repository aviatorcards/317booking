import { Hr, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, text, button, divider, colors } from "./layout";

export interface GigClaimedEmailProps {
  venueName: string;
  bandName: string;
  bandGenre: string;
  gigDate: string;
  reviewUrl: string;
}

export function GigClaimedEmail({
  venueName,
  bandName,
  bandGenre,
  gigDate,
  reviewUrl,
}: GigClaimedEmailProps) {
  return (
    <EmailLayout preview={`${bandName} has claimed your gig on ${gigDate}`}>
      <Text style={text.h1}>New claim on your gig</Text>
      <Text style={text.body}>
        Hi {venueName}, a band has claimed your upcoming gig.
      </Text>

      <Hr style={divider} />

      <Section>
        <Text style={text.label}>Band</Text>
        <Text style={text.value}>{bandName}</Text>

        <Text style={{ ...text.label, marginTop: "16px" }}>Genre</Text>
        <Text style={text.value}>{bandGenre}</Text>

        <Text style={{ ...text.label, marginTop: "16px" }}>Gig Date</Text>
        <Text style={text.value}>{gigDate}</Text>
      </Section>

      <Hr style={divider} />

      <Text style={text.muted}>
        Head to your dashboard to review the claim and confirm or pass.
      </Text>

      <Link href={reviewUrl} style={button.primary}>
        Review claim →
      </Link>
    </EmailLayout>
  );
}

export default GigClaimedEmail;
