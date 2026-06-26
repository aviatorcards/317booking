"use client";

import { useState, useEffect } from "react";

export default function BandProfilePage() {
  const [name, setName] = useState("");
  const [genre, setGenre] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/bands/me/profile")
      .then((r) => r.json())
      .then((data) => {
        setName(data.name ?? "");
        setGenre(data.genre ?? "");
        setBio(data.bio ?? "");
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSaved(false);

    const res = await fetch("/api/bands/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, genre, bio }),
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
        <h1 className="text-2xl font-bold">Band Profile</h1>
        <p className="text-brand-400 text-sm mt-1">
          This info is shown to venues when you claim a gig.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-5">
          <div>
            <label className="label">Band Name</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Midnight"
              required
            />
          </div>

          <div>
            <label className="label">Genre</label>
            <input
              type="text"
              className="input"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="Indie rock, jazz, country, …"
            />
          </div>

          <div>
            <label className="label">
              Bio{" "}
              <span className="text-brand-300 font-normal">({bio.length}/1000)</span>
            </label>
            <textarea
              className="input resize-none"
              rows={5}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={1000}
              placeholder="Tell venues a bit about your act — style, experience, what kind of shows you play best…"
            />
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
