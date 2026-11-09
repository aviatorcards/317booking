import { Hr, Link, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, text, button, divider } from "./layout";

export function VerifyEmail({ name, verificationUrl }: { name: string; verificationUrl: string }) {
  return (
    <EmailLayout preview="Confirm your email to book on 317 Booking">
      <Text style={text.h1}>Confirm your email</Text>
      <Text style={text.body}>
        Hi {name}, confirm this address before you claim or post a gig.
      </Text>
      <Link href={verificationUrl} style={button.primary}>
        Verify email →
      </Link>
      <Hr style={divider} />
      <Text style={text.muted}>This link expires in 24 hours.</Text>
    </EmailLayout>
  );
}
