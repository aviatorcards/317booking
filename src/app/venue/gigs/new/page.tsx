"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatAmount } from "@/lib/stripe";

type PayTier = { id: string; name: string; amount: number };

export default function NewGigPage() {
  const router = useRouter();
  const [tiers, setTiers] = useState<PayTier[]>([]);
  const [date, setDate] = useState("");
  const [payTierId, setPayTierId] = useState("");
  const [description, setDescription] = useState("");
  const [claimMode, setClaimMode] = useState<"VENUE_REVIEW" | "AUTO_ASSIGN">("VENUE_REVIEW");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/tiers").then((r) => r.json()).then(setTiers);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/gigs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: new Date(date).toISOString(),
        payTierId,
        description,
        claimMode,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create gig");
      setLoading(false);
      return;
    }

    const gig = await res.json();
    router.push(`/venue/gigs/${gig.id}`);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Post a New Gig</h1>

      {tiers.length === 0 ? (
        <div className="card text-center py-8 text-gray-500">
          <p className="mb-3">No pay tiers set up yet.</p>
          <p className="text-sm text-gray-400">An admin needs to create pay tiers before you can post gigs.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label className="label">Gig Date</label>
            <input
              type="datetime-local"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Pay Tier</label>
            <div className="space-y-2">
              {tiers.map((tier) => (
                <label
                  key={tier.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    payTierId === tier.id ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="tier"
                    value={tier.id}
                    checked={payTierId === tier.id}
                    onChange={() => setPayTierId(tier.id)}
                    className="accent-indigo-600"
                  />
                  <span className="font-medium">{tier.name}</span>
                  <span className="ml-auto font-bold text-green-700">{formatAmount(tier.amount)}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Booking Type</label>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                claimMode === "VENUE_REVIEW" ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-200"
              }`}>
                <input
                  type="radio"
                  name="claimMode"
                  value="VENUE_REVIEW"
                  checked={claimMode === "VENUE_REVIEW"}
                  onChange={() => setClaimMode("VENUE_REVIEW")}
                  className="mt-0.5 accent-indigo-600"
                />
                <div>
                  <div className="font-medium">You pick the band</div>
                  <div className="text-xs text-gray-500">Bands submit claims, you review and confirm one</div>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                claimMode === "AUTO_ASSIGN" ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-200"
              }`}>
                <input
                  type="radio"
                  name="claimMode"
                  value="AUTO_ASSIGN"
                  checked={claimMode === "AUTO_ASSIGN"}
                  onChange={() => setClaimMode("AUTO_ASSIGN")}
                  className="mt-0.5 accent-indigo-600"
                />
                <div>
                  <div className="font-medium">First-come, first-served</div>
                  <div className="text-xs text-gray-500">First band to claim is automatically confirmed</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="label">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              className="input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Genre preferences, set length, load-in time, etc."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading || !payTierId}>
            {loading ? "Posting…" : "Post Gig"}
          </button>
        </form>
      )}
    </div>
  );
}
