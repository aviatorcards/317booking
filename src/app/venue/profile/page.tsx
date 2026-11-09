"use client";

import { useState, useEffect } from "react";

export default function VenueProfilePage() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [capacity, setCapacity] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setLogoUrl(data.url);
      } else {
        setError(data.error ?? "Upload failed");
      }
    } catch (err) {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    fetch("/api/venues/me/profile")
      .then((r) => r.json())
      .then((data) => {
        setName(data.name ?? "");
        setAddress(data.address ?? "");
        setCapacity(String(data.capacity ?? ""));
        setLogoUrl(data.logoUrl ?? "");
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
      body: JSON.stringify({ name, address, capacity: Number(capacity), logoUrl }),
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

          <div>
            <label className="label">Logo Image</label>
            <div className="flex gap-4 items-center">
              {logoUrl && (
                <div className="w-16 h-16 border rounded-lg bg-white shrink-0 overflow-hidden flex items-center justify-center">
                  <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 mb-3"
                />
                <input
                  type="url"
                  className="input"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Or paste an image URL here..."
                />
                {uploading && <p className="text-xs text-brand-500 mt-1 font-medium">Uploading image...</p>}
                <p className="text-xs text-brand-300 mt-1.5">
                  Upload an image file or provide a direct link to your venue&apos;s logo.
                </p>
              </div>
            </div>
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
