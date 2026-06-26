"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RateGigForm({ gigId, existingRating }: { gigId: string; existingRating?: { rating: number; note: string } | null }) {
  const router = useRouter();
  const [rating, setRating] = useState(existingRating?.rating ?? 0);
  const [hovered, setHovered] = useState(0);
  const [note, setNote] = useState(existingRating?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existingRating);

  async function submit() {
    if (!rating) return;
    setSaving(true);
    await fetch(`/api/gigs/${gigId}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, note }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  const display = hovered || rating;

  return (
    <div>
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => { setRating(star); setSaved(false); }}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="text-3xl leading-none transition-colors focus:outline-none"
            aria-label={`${star} star`}
          >
            <span className={display >= star ? "text-amber-400" : "text-gray-200"}>★</span>
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm text-gray-500">
            {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
          </span>
        )}
      </div>

      <textarea
        value={note}
        onChange={(e) => { setNote(e.target.value); setSaved(false); }}
        placeholder="Optional note — visible on the band's public profile"
        rows={2}
        maxLength={500}
        className="input text-sm w-full mb-3 resize-none"
      />

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={!rating || saving}
          className="btn-primary text-sm"
        >
          {saving ? "Saving…" : existingRating ? "Update rating" : "Submit rating"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
      </div>
    </div>
  );
}
