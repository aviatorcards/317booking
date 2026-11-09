"use client";

import { useState, useEffect, useCallback } from "react";
import { editableMonths, daysInMonth, weekdayIndex } from "@/lib/availability";
import { formatMonthLabel } from "@/lib/timezone";

export default function AvailabilityPage() {
  const months = editableMonths();
  const [selectedMonth, setSelectedMonth] = useState(months[0] ?? "");
  const [availableDates, setAvailableDates] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const loadMonth = useCallback(async (month: string) => {
    const res = await fetch(`/api/availability?month=${month}`);
    const data = await res.json();
    setAvailableDates(data.availableDates ?? []);
    setLocked(!!data.locked);
    setSaved(false);
    setError("");
  }, []);

  useEffect(() => {
    if (selectedMonth) loadMonth(selectedMonth);
  }, [selectedMonth, loadMonth]);

  function toggleDay(day: number) {
    if (locked) return;
    setAvailableDates((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: selectedMonth, availableDates }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save");
      return;
    }
    setSaved(true);
  }

  const totalDays = selectedMonth ? daysInMonth(selectedMonth) : 31;
  const startDay = selectedMonth ? weekdayIndex(selectedMonth) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Set Availability</h1>
      <p className="text-gray-500 text-sm mb-6">
        Mark the days you&apos;re available to play. A month locks at the start of the 25th of the previous month.
      </p>

      {/* Month selector */}
      <div className="flex gap-2 mb-6">
        {months.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMonth(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              m === selectedMonth
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-200 hover:border-indigo-400"
            }`}
          >
            {formatMonthLabel(m)}
          </button>
        ))}
      </div>

      {selectedMonth && (
        <>
          {/* Calendar grid */}
          <div className="card">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-xs font-medium text-gray-400 text-center py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                const isAvailable = availableDates.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                      isAvailable
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-gray-100 text-gray-700 hover:bg-indigo-100"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <button onClick={save} disabled={saving || locked} className="btn-primary">
              {locked ? "Month locked" : saving ? "Saving…" : "Save availability"}
            </button>
            {locked && <span className="text-sm text-amber-700">This month is locked.</span>}
            {saved && <span className="text-sm text-green-600">Saved!</span>}
            {error && <span className="text-sm text-red-600">{typeof error === "string" ? error : "Could not save"}</span>}
            <span className="text-sm text-gray-400">{availableDates.length} days selected</span>
          </div>
        </>
      )}
    </div>
  );
}
