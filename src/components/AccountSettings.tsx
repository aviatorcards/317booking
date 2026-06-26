"use client";

import { useState, useEffect } from "react";

export function AccountSettings() {
  const [currentEmail, setCurrentEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const [emailForm, setEmailForm] = useState({ currentPassword: "", email: "" });
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((d) => {
        setCurrentEmail(d.email ?? "");
        setEmailForm((prev) => ({ ...prev, email: d.email ?? "" }));
        setLoading(false);
      });
  }, []);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    setEmailSaving(true);
    const res = await fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: emailForm.currentPassword, email: emailForm.email }),
    });
    const data = await res.json();
    if (res.ok) {
      setCurrentEmail(emailForm.email);
      setEmailForm((prev) => ({ ...prev, currentPassword: "" }));
      setEmailMsg({ ok: true, text: "Email updated." });
    } else {
      setEmailMsg({ ok: false, text: data.error ?? "Failed to update email" });
    }
    setEmailSaving(false);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwMsg({ ok: false, text: "New passwords do not match" });
      return;
    }
    setPwSaving(true);
    const res = await fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
      setPwMsg({ ok: true, text: "Password updated." });
    } else {
      setPwMsg({ ok: false, text: data.error ?? "Failed to update password" });
    }
    setPwSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="card space-y-4">
            <div className="h-6 bg-brand-100 rounded-xl w-40 animate-pulse" />
            {[1, 2].map((j) => (
              <div key={j} className="h-10 bg-brand-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-brand-400 text-sm mt-1">Manage your login email and password.</p>
      </div>

      {/* Email */}
      <form onSubmit={handleEmailSubmit} className="space-y-5">
        <div className="card space-y-5">
          <h2 className="text-base font-semibold text-brand-900">Email address</h2>
          <p className="text-xs text-brand-400 -mt-3">Currently: {currentEmail}</p>

          <div>
            <label className="label">New email</label>
            <input
              type="email"
              className="input"
              value={emailForm.email}
              onChange={(e) => setEmailForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Current password</label>
            <input
              type="password"
              className="input"
              value={emailForm.currentPassword}
              onChange={(e) => setEmailForm((p) => ({ ...p, currentPassword: e.target.value }))}
              placeholder="Confirm your password to save"
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" className="btn-primary" disabled={emailSaving}>
            {emailSaving ? "Saving…" : "Update email"}
          </button>
          {emailMsg && (
            <span className={`text-sm font-medium ${emailMsg.ok ? "text-green-700" : "text-red-600"}`}>
              {emailMsg.text}
            </span>
          )}
        </div>
      </form>

      {/* Password */}
      <form onSubmit={handlePasswordSubmit} className="space-y-5">
        <div className="card space-y-5">
          <h2 className="text-base font-semibold text-brand-900">Change password</h2>

          <div>
            <label className="label">Current password</label>
            <input
              type="password"
              className="input"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">New password</label>
            <input
              type="password"
              className="input"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
              minLength={8}
              placeholder="At least 8 characters"
              required
            />
          </div>

          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              className="input"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" className="btn-primary" disabled={pwSaving}>
            {pwSaving ? "Saving…" : "Update password"}
          </button>
          {pwMsg && (
            <span className={`text-sm font-medium ${pwMsg.ok ? "text-green-700" : "text-red-600"}`}>
              {pwMsg.text}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
