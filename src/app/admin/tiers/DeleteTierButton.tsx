"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteTierButton({ tierId, tierName }: { tierId: string; tierName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete tier "${tierName}"? Gigs using this tier will be unaffected.`)) return;
    setLoading(true);
    await fetch(`/api/admin/tiers?id=${tierId}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button onClick={handleDelete} disabled={loading} className="text-sm text-red-500 hover:text-red-700 transition-colors">
      {loading ? "Deleting…" : "Delete"}
    </button>
  );
}
