"use client";

import { useState } from "react";

export function PayGigButton({ gigId }: { gigId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/stripe/checkout/${gigId}`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }
    const { url } = await res.json();
    window.location.href = url;
  }

  return (
    <div>
      <button onClick={handlePay} disabled={loading} className="btn-primary">
        {loading ? "Redirecting…" : "Pay band via Stripe"}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
