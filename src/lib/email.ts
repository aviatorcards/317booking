import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import * as React from "react";

import { GigClaimedEmail } from "@/emails/GigClaimedEmail";
import { ClaimConfirmedEmail } from "@/emails/ClaimConfirmedEmail";
import { ClaimRejectedEmail } from "@/emails/ClaimRejectedEmail";
import { GigCancelledEmail } from "@/emails/GigCancelledEmail";
import { PaymentReleasedEmail } from "@/emails/PaymentReleasedEmail";
import { PasswordResetEmail } from "@/emails/PasswordResetEmail";
import { formatAmount } from "@/lib/stripe";
import { formatShowDate } from "@/lib/timezone";
import { VerifyEmail } from "@/emails/VerifyEmail";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
import { prisma } from "@/lib/prisma";

async function getTransporterConfig() {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"] } }
  });
  const map = new Map(settings.map((s: any) => [s.key, s.value]));
  
  return {
    host: map.get("SMTP_HOST") || process.env.SMTP_HOST,
    port: Number(map.get("SMTP_PORT") || process.env.SMTP_PORT || 587),
    secure: (map.get("SMTP_SECURE") || process.env.SMTP_SECURE) === "true",
    user: map.get("SMTP_USER") || process.env.SMTP_USER,
    pass: map.get("SMTP_PASS") || process.env.SMTP_PASS || "",
    from: map.get("EMAIL_FROM") || process.env.EMAIL_FROM || "317 Booking <noreply@317booking.com>",
  };
}

async function getTransporter() {
  const conf = await getTransporterConfig();
  if (!conf.host) return null;
  
  return nodemailer.createTransport({
    host: conf.host as string,
    port: conf.port as number,
    secure: conf.secure as boolean,
    auth: conf.user ? { user: conf.user as string, pass: conf.pass as string } : undefined,
  } as any);
}

function gigDateStr(date: Date) {
  return formatShowDate(date);
}

export async function sendVerificationEmail({
  to,
  name,
  verificationUrl,
}: {
  to: string;
  name: string;
  verificationUrl: string;
}): Promise<boolean> {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn(`Email not sent — verification link for ${to}: ${verificationUrl}`);
    return false;
  }
  await send(to, "Confirm your email", React.createElement(VerifyEmail, { name, verificationUrl }));
  return true;
}

async function send(to: string, subject: string, element: React.ReactElement) {
  const transporter = await getTransporter();
  const conf = await getTransporterConfig();
  if (!transporter) {
    console.warn("Email not sent — SMTP_HOST is not configured");
    return;
  }
  const html = await render(element);
  await transporter.sendMail({ from: conf.from as string, to, subject, html });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendGigClaimedEmail({
  to,
  venueName,
  bandName,
  bandGenre,
  gigDate,
  gigId,
}: {
  to: string;
  venueName: string;
  bandName: string;
  bandGenre: string;
  gigDate: Date;
  gigId: string;
}) {
  await send(
    to,
    `New claim on your gig — ${bandName}`,
    React.createElement(GigClaimedEmail, {
      venueName,
      bandName,
      bandGenre,
      gigDate: gigDateStr(gigDate),
      reviewUrl: `${APP_URL}/venue/gigs/${gigId}`,
    })
  );
}

export async function sendClaimConfirmedEmail({
  to,
  bandName,
  venueName,
  venueAddress,
  gigDate,
  payAmount,
}: {
  to: string;
  bandName: string;
  venueName: string;
  venueAddress: string;
  gigDate: Date;
  payAmount: number;
}) {
  await send(
    to,
    `You're confirmed for ${venueName} — ${gigDateStr(gigDate)}`,
    React.createElement(ClaimConfirmedEmail, {
      bandName,
      venueName,
      venueAddress,
      gigDate: gigDateStr(gigDate),
      payAmount: formatAmount(payAmount),
      dashboardUrl: `${APP_URL}/band/dashboard`,
    })
  );
}

export async function sendClaimRejectedEmail({
  to,
  bandName,
  venueName,
  gigDate,
}: {
  to: string;
  bandName: string;
  venueName: string;
  gigDate: Date;
}) {
  await send(
    to,
    `Your claim was not selected — ${venueName}`,
    React.createElement(ClaimRejectedEmail, {
      bandName,
      venueName,
      gigDate: gigDateStr(gigDate),
      browseUrl: `${APP_URL}/gigs`,
    })
  );
}

export async function sendGigCancelledEmail({
  to,
  bandName,
  venueName,
  gigDate,
}: {
  to: string;
  bandName: string;
  venueName: string;
  gigDate: Date;
}) {
  await send(
    to,
    `Gig cancelled — ${venueName} on ${gigDateStr(gigDate)}`,
    React.createElement(GigCancelledEmail, {
      bandName,
      venueName,
      gigDate: gigDateStr(gigDate),
      browseUrl: `${APP_URL}/gigs`,
    })
  );
}

export async function sendPaymentReleasedEmail({
  to,
  bandName,
  venueName,
  gigDate,
  payAmount,
}: {
  to: string;
  bandName: string;
  venueName: string;
  gigDate: Date;
  payAmount: number;
}) {
  await send(
    to,
    `Payment of ${formatAmount(payAmount)} transferred — ${venueName}`,
    React.createElement(PaymentReleasedEmail, {
      bandName,
      venueName,
      gigDate: gigDateStr(gigDate),
      payAmount: formatAmount(payAmount),
      dashboardUrl: `${APP_URL}/band/dashboard`,
    })
  );
}

export async function sendPasswordResetEmail({
  to,
  name,
  token,
  isNewAccount = false,
}: {
  to: string;
  name: string;
  token: string;
  isNewAccount?: boolean;
}) {
  const expiresIn = isNewAccount ? "7 days" : "24 hours";
  await send(
    to,
    isNewAccount ? "Set your 317 Booking password" : "Reset your 317 Booking password",
    React.createElement(PasswordResetEmail, {
      name,
      resetUrl: `${APP_URL}/reset-password?token=${token}`,
      expiresIn,
      isNewAccount,
    })
  );
}
