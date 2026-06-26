"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

type ConnectStatus = { connected: boolean; chargesEnabled: boolean };

export function StripeConnectSection() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    fetch("/api/stripe/connect")
      .then((r) => r.json())
      .then((d: ConnectStatus) => {
        setStatus(d);
        setLoading(false);
        // Stripe sent them back because the link expired — get a fresh one
        if (searchParams.get("stripe") === "refresh") {
          handleSetup();
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSetup() {
    setRedirecting(true);
    const res = await fetch("/api/stripe/connect", { method: "POST" });
    const data = await res.json();
    window.location.href = data.url;
  }

  if (loading) {
    return <div className="card h-20 animate-pulse bg-brand-50" />;
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-brand-900">Payouts</h2>
          <p className="text-sm text-brand-400 mt-0.5">
            {status?.chargesEnabled
              ? "Your Stripe account is connected. You'll receive payouts automatically when gigs complete."
              : status?.connected
              ? "Your Stripe account is connected but setup isn't complete yet."
              : "Connect a Stripe account to receive payouts when gigs are completed."}
          </p>
        </div>
        <div className="shrink-0">
          {status?.chargesEnabled ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Connected
            </span>
          ) : (
            <button
              onClick={handleSetup}
              disabled={redirecting}
              className="btn-primary text-sm"
            >
              {redirecting
                ? "Redirecting…"
                : status?.connected
                ? "Complete setup"
                : "Set up payouts"}
            </button>
          )}
        </div>
      </div>

      {searchParams.get("stripe") === "success" && !status?.chargesEnabled && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          Setup received — Stripe may take a moment to verify your details. Refresh to check your status.
        </p>
      )}
    </div>
  );
}
