"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "ok" | "error">(token ? "idle" : "error");
  const [message, setMessage] = useState(token ? "" : "Missing verification link.");
  const [devUrl, setDevUrl] = useState("");

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setMessage(data.error ?? "Invalid or expired link");
      return;
    }
    setStatus("ok");
    setMessage("Email confirmed. You can claim and post gigs.");
  }

  async function resend() {
    const res = await fetch("/api/auth/verify-email/resend", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "Could not resend");
      return;
    }
    setDevUrl(data.devVerificationUrl ?? "");
    setMessage(data.alreadyVerified ? "This account is already verified." : "A new link is on its way.");
    setStatus("ok");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="card space-y-4">
        <h1 className="text-xl font-bold">Verify email</h1>
        {message && <p className="text-sm text-gray-600">{message}</p>}
        {devUrl && <a className="text-sm text-indigo-600 break-all" href={devUrl}>{devUrl}</a>}
        {token && status !== "ok" && (
          <form onSubmit={verify}>
            <button className="btn-primary w-full" type="submit">Confirm email</button>
          </form>
        )}
        <button type="button" className="btn-secondary w-full" onClick={resend}>Resend link</button>
        <Link href="/login" className="block text-center text-sm text-indigo-600">Back to sign in</Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
