"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClaimButton({ gigId }: { gigId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function claim() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/gigs/${gigId}/claim`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to claim gig");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div>
      <button onClick={claim} disabled={loading} className="btn-primary">
        {loading ? "Claiming…" : "Claim this gig"}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
