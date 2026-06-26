"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WithdrawClaimButton({ gigId }: { gigId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function withdraw() {
    if (!window.confirm("Withdraw your claim on this gig?")) return;
    setLoading(true);
    await fetch(`/api/gigs/${gigId}/claim`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button onClick={withdraw} disabled={loading} className="btn-danger text-xs">
      {loading ? "Withdrawing…" : "Withdraw"}
    </button>
  );
}
