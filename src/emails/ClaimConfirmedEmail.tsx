import { Hr, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, text, button, divider, colors } from "./layout";

export interface ClaimConfirmedEmailProps {
  bandName: string;
  venueName: string;
  venueAddress: string;
  gigDate: string;
  payAmount: string;
  dashboardUrl: string;
}

export function ClaimConfirmedEmail({
  bandName,
  venueName,
  venueAddress,
  gigDate,
  payAmount,
  dashboardUrl,
}: ClaimConfirmedEmailProps) {
  return (
    <EmailLayout preview={`You're confirmed for ${venueName} on ${gigDate}`}>
      <Text style={text.h1}>You&apos;re booked!</Text>
      <Text style={text.body}>
        Hi {bandName}, you&apos;ve been confirmed for a gig. Here are the
        details:
      </Text>

      <Hr style={divider} />

      <Section
        style={{
          backgroundColor: "#faf7f2",
          borderRadius: "8px",
          padding: "20px 24px",
          border: `1px solid ${colors.border}`,
        }}
      >
        <Text style={text.label}>Venue</Text>
        <Text style={text.value}>{venueName}</Text>

        <Text style={{ ...text.label, marginTop: "16px" }}>Address</Text>
        <Text style={text.value}>{venueAddress}</Text>

        <Text style={{ ...text.label, marginTop: "16px" }}>Date</Text>
        <Text style={text.value}>{gigDate}</Text>

        <Text style={{ ...text.label, marginTop: "16px" }}>Pay</Text>
        <Text
          style={{
            ...text.value,
            color: "#16a34a",
            fontSize: "18px",
          }}
        >
          {payAmount}
        </Text>
      </Section>

      <Hr style={divider} />

      <Text style={text.muted}>
        Make sure your Stripe payout account is connected in Settings so you
        can receive payment after the gig.
      </Text>

      <Link href={dashboardUrl} style={button.primary}>
        View dashboard →
      </Link>
    </EmailLayout>
  );
}

export default ClaimConfirmedEmail;
