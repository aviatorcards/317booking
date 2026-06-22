"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Role = "BAND" | "VENUE";
type Step = 1 | 2 | 3;

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState<Step>(params.get("role") ? 2 : 1);
  const [role, setRole] = useState<Role>((params.get("role") as Role) || "BAND");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Band fields
  const [bandName, setBandName] = useState("");
  const [genre, setGenre] = useState("");
  const [bio, setBio] = useState("");
  // Venue fields
  const [venueName, setVenueName] = useState("");
  const [address, setAddress] = useState("");
  const [capacity, setCapacity] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload =
      role === "BAND"
        ? { role, email, password, name: bandName, genre, bio }
        : { role, email, password, name: venueName, address, capacity: Number(capacity) };

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Registration failed");
      setLoading(false);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    router.push("/dashboard");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="card">
        {/* Step 1: Role selection */}
        {step === 1 && (
          <div>
            <h1 className="text-xl font-bold mb-2">Join 317 Booking</h1>
            <p className="text-sm text-gray-500 mb-6">Who are you?</p>
            <div className="space-y-3">
              <button
                className="w-full border-2 rounded-xl p-4 text-left hover:border-indigo-500 transition-colors"
                onClick={() => { setRole("BAND"); setStep(2); }}
              >
                <div className="text-lg font-semibold">🎸 I&apos;m a Band</div>
                <div className="text-sm text-gray-500">Submit availability and claim gigs</div>
              </button>
              <button
                className="w-full border-2 rounded-xl p-4 text-left hover:border-indigo-500 transition-colors"
                onClick={() => { setRole("VENUE"); setStep(2); }}
              >
                <div className="text-lg font-semibold">🏟 I&apos;m a Venue</div>
                <div className="text-sm text-gray-500">Post gigs and book bands directly</div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Account details */}
        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-4">
            <div>
              <button type="button" onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-gray-600 mb-3 flex items-center gap-1">
                ← Back
              </button>
              <h1 className="text-xl font-bold mb-1">Create your account</h1>
              <p className="text-sm text-gray-500 mb-4">Registering as a <strong>{role === "BAND" ? "Band" : "Venue"}</strong></p>
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="label">Password <span className="text-gray-400 font-normal">(min 8 chars)</span></label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <button type="submit" className="btn-primary w-full">Continue</button>
          </form>
        )}

        {/* Step 3: Profile details */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <button type="button" onClick={() => setStep(2)} className="text-xs text-gray-400 hover:text-gray-600 mb-1 flex items-center gap-1">
              ← Back
            </button>
            <h1 className="text-xl font-bold mb-4">{role === "BAND" ? "Band details" : "Venue details"}</h1>

            {role === "BAND" ? (
              <>
                <div>
                  <label className="label">Band name</label>
                  <input type="text" className="input" value={bandName} onChange={(e) => setBandName(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Genre</label>
                  <input type="text" className="input" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Indie Rock, Jazz, Country" required />
                </div>
                <div>
                  <label className="label">Bio <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea className="input" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label">Venue name</label>
                  <input type="text" className="input" value={venueName} onChange={(e) => setVenueName(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Address</label>
                  <input type="text" className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Mass Ave, Indianapolis, IN" required />
                </div>
                <div>
                  <label className="label">Capacity</label>
                  <input type="number" className="input" value={capacity} onChange={(e) => setCapacity(e.target.value)} min={1} required />
                </div>
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}
      </div>

      {step === 1 && (
        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-600 hover:underline">Sign in</Link>
        </p>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
