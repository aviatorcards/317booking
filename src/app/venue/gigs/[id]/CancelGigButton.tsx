"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelGigButton({ gigId }: { gigId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    if (!window.confirm("Cancel this gig? This cannot be undone.")) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/gigs/${gigId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not cancel");
      setLoading(false);
      return;
    }
    router.refresh();
    setLoading(false);
  }

  return (
    <div>
      <button onClick={cancel} disabled={loading} className="btn-danger text-xs">
        {loading ? "Cancelling…" : "Cancel Gig"}
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
