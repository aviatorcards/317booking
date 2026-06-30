"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface BandFilterFormProps {
  q: string;
  selectedGenre: string;
  uniqueGenres: string[];
}

export default function BandFilterForm({ q, selectedGenre, uniqueGenres }: BandFilterFormProps) {
  const router = useRouter();

  return (
    <form method="GET" action="/bands" className="flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <label className="label">Search Artists</label>
        <div className="relative">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by band name..."
            className="input pr-10"
          />
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-brand-300">
            🔍
          </span>
        </div>
      </div>

      <div className="w-full md:w-64">
        <label className="label">Filter by Genre</label>
        <select
          name="genre"
          defaultValue={selectedGenre}
          className="input appearance-none bg-brand-50"
          onChange={(e) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (e.target.value) params.set("genre", e.target.value);
            router.push(`/bands?${params.toString()}`);
          }}
        >
          <option value="">All Genres</option>
          {uniqueGenres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2">
        <button type="submit" className="btn-primary w-full md:w-auto h-[42px] px-6">
          Filter
        </button>
        {(q || selectedGenre) && (
          <Link href="/bands" className="btn-secondary h-[42px] flex items-center justify-center">
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}
