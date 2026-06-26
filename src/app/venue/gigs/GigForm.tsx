"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatAmount } from "@/lib/stripe";

type PayTier = { id: string; name: string; amount: number };

export interface GigFormValues {
  date: string;
  payTierId: string;
  description: string;
  claimMode: "VENUE_REVIEW" | "AUTO_ASSIGN";
}

interface GigFormProps {
  tiers: PayTier[];
  initialValues?: Partial<GigFormValues>;
  /** Fields the user cannot change (e.g. date/tier after bands have claimed) */
  lockedFields?: ("date" | "payTierId" | "claimMode")[];
  onSubmit: (values: GigFormValues) => Promise<{ error?: string }>;
  submitLabel: string;
  cancelHref: string;
}

export function GigForm({
  tiers,
  initialValues = {},
  lockedFields = [],
  onSubmit,
  submitLabel,
  cancelHref,
}: GigFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(initialValues.date ?? "");
  const [payTierId, setPayTierId] = useState(initialValues.payTierId ?? "");
  const [description, setDescription] = useState(initialValues.description ?? "");
  const [claimMode, setClaimMode] = useState<"VENUE_REVIEW" | "AUTO_ASSIGN">(
    initialValues.claimMode ?? "VENUE_REVIEW"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const locked = new Set(lockedFields);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await onSubmit({ date, payTierId, description, claimMode });
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <div>
        <label className="label">Gig Date</label>
        <input
          type="datetime-local"
          className={`input ${locked.has("date") ? "opacity-50 cursor-not-allowed" : ""}`}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={locked.has("date")}
          required
        />
        {locked.has("date") && (
          <p className="text-xs text-amber-600 mt-1">Date cannot be changed after bands have claimed.</p>
        )}
      </div>

      <div>
        <label className="label">Pay Tier</label>
        {locked.has("payTierId") ? (
          <div className="opacity-50 space-y-2">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${payTierId === tier.id ? "border-indigo-500 bg-indigo-50" : "border-gray-200"}`}
              >
                <input type="radio" checked={payTierId === tier.id} readOnly className="accent-indigo-600" />
                <span className="font-medium">{tier.name}</span>
                <span className="ml-auto font-bold text-green-700">{formatAmount(tier.amount)}</span>
              </div>
            ))}
            <p className="text-xs text-amber-600">Pay tier cannot be changed after bands have claimed.</p>
          </div>
        ) : (
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
        )}
      </div>

      <div>
        <label className="label">Booking Type</label>
        <div className={`space-y-2 ${locked.has("claimMode") ? "opacity-50 pointer-events-none" : ""}`}>
          {(["VENUE_REVIEW", "AUTO_ASSIGN"] as const).map((mode) => (
            <label
              key={mode}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                claimMode === mode ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-200"
              }`}
            >
              <input
                type="radio"
                name="claimMode"
                value={mode}
                checked={claimMode === mode}
                onChange={() => setClaimMode(mode)}
                className="mt-0.5 accent-indigo-600"
              />
              <div>
                <div className="font-medium">
                  {mode === "VENUE_REVIEW" ? "You pick the band" : "First-come, first-served"}
                </div>
                <div className="text-xs text-gray-500">
                  {mode === "VENUE_REVIEW"
                    ? "Bands submit claims, you review and confirm one"
                    : "First band to claim is automatically confirmed"}
                </div>
              </div>
            </label>
          ))}
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

      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1" disabled={loading || !payTierId}>
          {loading ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={() => router.push(cancelHref)} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
