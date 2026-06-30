"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface VenueFilterFormProps {
  q: string;
  capacityPreset: string;
}

export default function VenueFilterForm({ q, capacityPreset }: VenueFilterFormProps) {
  const router = useRouter();

  return (
    <form method="GET" action="/venues" className="flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <label className="label">Search Venues</label>
        <div className="relative">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by venue name or address..."
            className="input pr-10"
          />
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-brand-300">
            🔍
          </span>
        </div>
      </div>

      <div className="w-full md:w-64">
        <label className="label">Capacity Size</label>
        <select
          name="capacity"
          defaultValue={capacityPreset}
          className="input appearance-none bg-brand-50"
          onChange={(e) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (e.target.value) params.set("capacity", e.target.value);
            router.push(`/venues?${params.toString()}`);
          }}
        >
          <option value="">All Sizes</option>
          <option value="small">Small (&lt; 150 people)</option>
          <option value="medium">Medium (150 - 500 people)</option>
          <option value="large">Large (&gt; 500 people)</option>
        </select>
      </div>

      <div className="flex items-end gap-2">
        <button type="submit" className="btn-primary w-full md:w-auto h-[42px] px-6">
          Filter
        </button>
        {(q || capacityPreset) && (
          <Link href="/venues" className="btn-secondary h-[42px] flex items-center justify-center">
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}
