"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelGigButton({ gigId }: { gigId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm("Cancel this gig? This cannot be undone.")) return;
    setLoading(true);
    await fetch(`/api/admin/gigs/${gigId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button onClick={handleCancel} disabled={loading} className="text-sm text-red-500 hover:text-red-700 transition-colors">
      {loading ? "Cancelling…" : "Cancel"}
    </button>
  );
}
