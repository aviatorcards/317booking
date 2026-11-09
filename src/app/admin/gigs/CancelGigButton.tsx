"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelGigButton({ gigId }: { gigId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCancel() {
    if (!confirm("Cancel this gig? This cannot be undone.")) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/gigs/${gigId}`, {
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
    <span>
      <button onClick={handleCancel} disabled={loading} className="text-sm text-red-500 hover:text-red-700 transition-colors">
        {loading ? "Cancelling…" : "Cancel"}
      </button>
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </span>
  );
}
