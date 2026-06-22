"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateTierForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [dollars, setDollars] = useState("");
  const [feePercent, setFeePercent] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/admin/tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        amount: Math.round(parseFloat(dollars) * 100), // convert to cents
        platformFeePercent: parseFloat(feePercent),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create tier");
      setLoading(false);
      return;
    }

    setName("");
    setDollars("");
    setFeePercent("0");
    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <label className="label">Tier Name</label>
        <input
          type="text"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Club Night, Headliner, Support Act"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Pay Amount ($)</label>
          <input
            type="number"
            className="input"
            value={dollars}
            onChange={(e) => setDollars(e.target.value)}
            placeholder="400"
            min="1"
            step="0.01"
            required
          />
        </div>
        <div>
          <label className="label">
            Platform Fee % <span className="text-gray-400 font-normal">(0 = free)</span>
          </label>
          <input
            type="number"
            className="input"
            value={feePercent}
            onChange={(e) => setFeePercent(e.target.value)}
            min="0"
            max="100"
            step="0.1"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Creating…" : "Create Tier"}
      </button>
    </form>
  );
}
