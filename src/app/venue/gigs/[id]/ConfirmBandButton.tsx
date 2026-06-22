"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConfirmBandButton({
  gigId,
  bandId,
  bandName,
}: {
  gigId: string;
  bandId: string;
  bandName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!window.confirm(`Confirm ${bandName} for this gig? All other claims will be rejected.`)) return;
    setLoading(true);
    await fetch(`/api/gigs/${gigId}/confirm/${bandId}`, { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button onClick={handleConfirm} disabled={loading} className="btn-primary text-xs px-3 py-1.5">
      {loading ? "Confirming…" : "Confirm"}
    </button>
  );
}
