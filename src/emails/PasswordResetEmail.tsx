import { Hr, Link, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, text, button, divider } from "./layout";

export interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
  expiresIn: string;
  isNewAccount?: boolean;
}

export function PasswordResetEmail({
  name,
  resetUrl,
  expiresIn,
  isNewAccount = false,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout
      preview={
        isNewAccount
          ? "Set your 317 Booking password to get started"
          : "Reset your 317 Booking password"
      }
    >
      <Text style={text.h1}>
        {isNewAccount ? "Welcome to 317 Booking" : "Reset your password"}
      </Text>
      <Text style={text.body}>
        Hi {name},{" "}
        {isNewAccount
          ? "your account has been created. Click the button below to set your password and log in."
          : "we received a request to reset your password. Click the button below to choose a new one."}
      </Text>

      <Link href={resetUrl} style={button.primary}>
        {isNewAccount ? "Set password →" : "Reset password →"}
      </Link>

      <Hr style={divider} />

      <Text style={text.muted}>
        This link expires in {expiresIn}. If you didn&apos;t request this, you
        can safely ignore this email — your account will not be affected.
      </Text>
    </EmailLayout>
  );
}

export default PasswordResetEmail;
