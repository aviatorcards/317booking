"use client";

import { useRouter } from "next/navigation";
import { GigForm, GigFormValues } from "../GigForm";

type PayTier = { id: string; name: string; amount: number };

export function NewGigClient({
  tiers,
  initialValues,
}: {
  tiers: PayTier[];
  initialValues?: Partial<GigFormValues>;
}) {
  const router = useRouter();

  async function handleSubmit(values: GigFormValues) {
    const res = await fetch("/api/gigs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: `${values.date}:00.000Z`,
        payTierId: values.payTierId,
        description: values.description,
        claimMode: values.claimMode,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { error: data.error ?? "Failed to create gig" };
    }

    const gig = await res.json();
    router.push(`/venue/gigs/${gig.id}`);
    return {};
  }

  return (
    <GigForm
      tiers={tiers}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      submitLabel="Post Gig"
      cancelHref="/venue/dashboard"
    />
  );
}
