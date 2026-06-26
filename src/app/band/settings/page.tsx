import { Suspense } from "react";
import { AccountSettings } from "@/components/AccountSettings";
import { StripeConnectSection } from "@/components/StripeConnectSection";

export default function BandSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-brand-400 text-sm mt-1">Manage your payouts and account details.</p>
      </div>
      <Suspense fallback={<div className="card h-20 animate-pulse bg-brand-50" />}>
        <StripeConnectSection />
      </Suspense>
      <AccountSettings />
    </div>
  );
}
