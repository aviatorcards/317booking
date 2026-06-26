"use client";

import { useState, useEffect } from "react";

export default function VenueProfilePage() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [capacity, setCapacity] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/venues/me/profile")
      .then((r) => r.json())
      .then((data) => {
        setName(data.name ?? "");
        setAddress(data.address ?? "");
        setCapacity(String(data.capacity ?? ""));
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSaved(false);

    const res = await fetch("/api/venues/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, capacity: Number(capacity) }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
    } else {
      setSaved(true);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="h-8 bg-brand-100 rounded-xl w-32 animate-pulse mb-6" />
        <div className="card space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-brand-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Venue Profile</h1>
        <p className="text-brand-400 text-sm mt-1">
          Bands see this info on every gig you post.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-5">
          <div>
            <label className="label">Venue Name</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Vogue Theatre"
              required
            />
          </div>

          <div>
            <label className="label">Address</label>
            <input
              type="text"
              className="input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="6259 N College Ave, Indianapolis, IN 46220"
              required
            />
          </div>

          <div>
            <label className="label">Capacity</label>
            <input
              type="number"
              className="input"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              min={1}
              max={100000}
              placeholder="500"
              required
            />
            <p className="text-xs text-brand-300 mt-1.5">
              Maximum number of attendees for your venue.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && (
            <span className="text-sm text-green-700 font-medium">Changes saved.</span>
          )}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
    </div>
  );
}
