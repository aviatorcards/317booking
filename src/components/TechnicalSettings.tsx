"use client";

import { useState, useEffect } from "react";

export function TechnicalSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [form, setForm] = useState({
    SMTP_HOST: "",
    SMTP_PORT: "",
    SMTP_SECURE: "",
    SMTP_USER: "",
    SMTP_PASS: "",
    EMAIL_FROM: "",
  });

  useEffect(() => {
    fetch("/api/admin/technical")
      .then((r) => r.json())
      .then((d) => {
        setForm({
          SMTP_HOST: d.SMTP_HOST ?? "",
          SMTP_PORT: d.SMTP_PORT ?? "",
          SMTP_SECURE: d.SMTP_SECURE ?? "",
          SMTP_USER: d.SMTP_USER ?? "",
          SMTP_PASS: d.SMTP_PASS ?? "",
          EMAIL_FROM: d.EMAIL_FROM ?? "",
        });
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    const res = await fetch("/api/admin/technical", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    
    if (res.ok) {
      setMsg({ ok: true, text: "Settings saved successfully." });
    } else {
      const data = await res.json();
      setMsg({ ok: false, text: data.error ?? "Failed to save settings." });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <div className="card space-y-4">
          <div className="h-6 bg-brand-100 rounded-xl w-40 animate-pulse" />
          <div className="h-10 bg-brand-50 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Technical Settings</h1>
        <p className="text-brand-400 text-sm mt-1">Manage server and email (SMTP) configurations.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card space-y-5">
          <h2 className="text-base font-semibold text-brand-900">SMTP Server (for Password Resets & Notifications)</h2>
          
          <div>
            <label className="label">SMTP Host</label>
            <input
              type="text"
              className="input"
              value={form.SMTP_HOST}
              onChange={(e) => setForm((p) => ({ ...p, SMTP_HOST: e.target.value }))}
              placeholder="e.g. smtp.gmail.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">SMTP Port</label>
              <input
                type="text"
                className="input"
                value={form.SMTP_PORT}
                onChange={(e) => setForm((p) => ({ ...p, SMTP_PORT: e.target.value }))}
                placeholder="e.g. 587"
              />
            </div>
            <div>
              <label className="label">Secure (TLS/SSL)</label>
              <select
                className="input"
                value={form.SMTP_SECURE}
                onChange={(e) => setForm((p) => ({ ...p, SMTP_SECURE: e.target.value }))}
              >
                <option value="">Default (STARTTLS for 587)</option>
                <option value="true">True (Implicit TLS usually port 465)</option>
                <option value="false">False</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">SMTP Username</label>
            <input
              type="text"
              className="input"
              value={form.SMTP_USER}
              onChange={(e) => setForm((p) => ({ ...p, SMTP_USER: e.target.value }))}
              placeholder="e.g. user@example.com"
            />
          </div>

          <div>
            <label className="label">SMTP Password</label>
            <input
              type="password"
              className="input"
              value={form.SMTP_PASS}
              onChange={(e) => setForm((p) => ({ ...p, SMTP_PASS: e.target.value }))}
              placeholder="Leave blank if unchanged or not required"
            />
          </div>

          <div>
            <label className="label">From Email Address</label>
            <input
              type="text"
              className="input"
              value={form.EMAIL_FROM}
              onChange={(e) => setForm((p) => ({ ...p, EMAIL_FROM: e.target.value }))}
              placeholder="e.g. 317 Booking <noreply@317booking.com>"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </button>
          {msg && (
            <span className={`text-sm font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>
              {msg.text}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
