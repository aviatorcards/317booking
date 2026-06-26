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

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const FROM = process.env.EMAIL_FROM ?? "317 Booking <noreply@317booking.com>";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return (_transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
        : undefined,
  }));
}

function gigDateStr(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

async function send(to: string, subject: string, element: React.ReactElement) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("Email not sent — SMTP_HOST is not configured");
    return;
  }
  const html = await render(element);
  await transporter.sendMail({ from: FROM, to, subject, html });
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
