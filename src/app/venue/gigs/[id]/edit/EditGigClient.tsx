"use client";

import { useRouter } from "next/navigation";
import { GigForm, GigFormValues } from "../../GigForm";

type PayTier = { id: string; name: string; amount: number };

export function EditGigClient({
  gigId,
  tiers,
  initialValues,
  lockedFields,
}: {
  gigId: string;
  tiers: PayTier[];
  initialValues: GigFormValues;
  lockedFields: ("date" | "payTierId" | "claimMode")[];
}) {
  const router = useRouter();

  async function handleSubmit(values: GigFormValues) {
    const res = await fetch(`/api/gigs/${gigId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: new Date(values.date).toISOString(),
        payTierId: values.payTierId,
        description: values.description,
        claimMode: values.claimMode,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { error: data.error ?? "Failed to update gig" };
    }

    router.push(`/venue/gigs/${gigId}`);
    router.refresh();
    return {};
  }

  return (
    <GigForm
      tiers={tiers}
      initialValues={initialValues}
      lockedFields={lockedFields}
      onSubmit={handleSubmit}
      submitLabel="Save Changes"
      cancelHref={`/venue/gigs/${gigId}`}
    />
  );
}
