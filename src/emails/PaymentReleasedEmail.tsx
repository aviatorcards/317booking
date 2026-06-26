import { Hr, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, text, button, divider, colors } from "./layout";

export interface PaymentReleasedEmailProps {
  bandName: string;
  venueName: string;
  gigDate: string;
  payAmount: string;
  dashboardUrl: string;
}

export function PaymentReleasedEmail({
  bandName,
  venueName,
  gigDate,
  payAmount,
  dashboardUrl,
}: PaymentReleasedEmailProps) {
  return (
    <EmailLayout preview={`Payment of ${payAmount} transferred — ${venueName}`}>
      <Text style={text.h1}>You&apos;ve been paid!</Text>
      <Text style={text.body}>
        Hi {bandName}, your payment for the gig at{" "}
        <strong>{venueName}</strong> on <strong>{gigDate}</strong> has been
        transferred to your Stripe account.
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

        <Text style={{ ...text.label, marginTop: "16px" }}>Date</Text>
        <Text style={text.value}>{gigDate}</Text>

        <Text style={{ ...text.label, marginTop: "16px" }}>Amount transferred</Text>
        <Text
          style={{
            ...text.value,
            color: "#16a34a",
            fontSize: "20px",
          }}
        >
          {payAmount}
        </Text>
      </Section>

      <Hr style={divider} />

      <Text style={text.muted}>
        Funds typically arrive in your bank account within 2 business days
        depending on your Stripe payout schedule.
      </Text>

      <Link href={dashboardUrl} style={button.primary}>
        View your dashboard →
      </Link>
    </EmailLayout>
  );
}

export default PaymentReleasedEmail;
