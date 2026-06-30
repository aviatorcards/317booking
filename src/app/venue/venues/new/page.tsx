"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewVenuePage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        address: form.get("address"),
        capacity: Number(form.get("capacity")),
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.push("/venue/dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/venue/dashboard" className="text-sm text-brand-400 hover:text-brand-600 font-semibold">
          ← Back to dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-brand-900 font-heading mb-6">Add a Venue</h1>
      <div className="card bg-white border border-brand-200">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Venue Name</label>
            <input name="name" type="text" required className="input" placeholder="The Vogue" />
          </div>
          <div>
            <label className="label">Address</label>
            <input name="address" type="text" required className="input" placeholder="6259 N College Ave, Indianapolis, IN" />
          </div>
          <div>
            <label className="label">Capacity</label>
            <input name="capacity" type="number" required min={1} className="input" placeholder="500" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating…" : "Create Venue"}
          </button>
        </form>
      </div>
    </div>
  );
}
