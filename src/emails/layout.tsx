import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

const colors = {
  bg: "#faf7f2",
  card: "#ffffff",
  border: "#e3d4bc",
  brand: "#c17c2e",
  text: "#1c1309",
  muted: "#7a6145",
  faint: "#b09870",
};

const styles = {
  body: {
    backgroundColor: colors.bg,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: "0",
    padding: "0",
  } as React.CSSProperties,

  container: {
    maxWidth: "560px",
    margin: "0 auto",
    padding: "40px 20px",
  } as React.CSSProperties,

  logo: {
    fontSize: "18px",
    fontWeight: "700" as const,
    color: colors.brand,
    letterSpacing: "-0.3px",
    margin: "0 0 28px 0",
  } as React.CSSProperties,

  card: {
    backgroundColor: colors.card,
    borderRadius: "10px",
    padding: "32px",
    border: `1px solid ${colors.border}`,
  } as React.CSSProperties,

  footer: {
    fontSize: "12px",
    color: colors.faint,
    textAlign: "center" as const,
    margin: "24px 0 0 0",
    lineHeight: "1.6",
  } as React.CSSProperties,
};

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.logo}>317 Booking</Text>
          <Section style={styles.card}>{children}</Section>
          <Text style={styles.footer}>
            317 Booking · You received this because you have an account.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export { colors };

export const text = {
  h1: {
    fontSize: "22px",
    fontWeight: "700" as const,
    color: colors.text,
    margin: "0 0 8px 0",
    lineHeight: "1.3",
  } as React.CSSProperties,

  body: {
    fontSize: "15px",
    color: colors.text,
    lineHeight: "1.6",
    margin: "16px 0",
  } as React.CSSProperties,

  muted: {
    fontSize: "14px",
    color: colors.muted,
    lineHeight: "1.6",
    margin: "8px 0",
  } as React.CSSProperties,

  label: {
    fontSize: "11px",
    fontWeight: "600" as const,
    color: colors.muted,
    textTransform: "uppercase" as const,
    letterSpacing: "0.6px",
    margin: "0",
  } as React.CSSProperties,

  value: {
    fontSize: "15px",
    fontWeight: "600" as const,
    color: colors.text,
    margin: "2px 0 0 0",
  } as React.CSSProperties,
};

export const button = {
  primary: {
    backgroundColor: colors.brand,
    borderRadius: "7px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "600" as const,
    padding: "12px 24px",
    textDecoration: "none",
    marginTop: "24px",
  } as React.CSSProperties,
};

export const divider = {
  border: "none",
  borderTop: `1px solid ${colors.border}`,
  margin: "24px 0",
} as React.CSSProperties;
