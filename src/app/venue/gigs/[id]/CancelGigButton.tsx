"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelGigButton({ gigId }: { gigId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cancel() {
    if (!window.confirm("Cancel this gig? This cannot be undone.")) return;
    setLoading(true);
    await fetch(`/api/gigs/${gigId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button onClick={cancel} disabled={loading} className="btn-danger text-xs">
      {loading ? "Cancelling…" : "Cancel Gig"}
    </button>
  );
}
