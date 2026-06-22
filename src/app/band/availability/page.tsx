"use client";

import { useState, useEffect, useCallback } from "react";
import { editableMonths, daysInMonth, isMonthLocked } from "@/lib/availability";

export default function AvailabilityPage() {
  const months = editableMonths();
  const [selectedMonth, setSelectedMonth] = useState(months[0] ?? "");
  const [availableDates, setAvailableDates] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadMonth = useCallback(async (month: string) => {
    const res = await fetch(`/api/availability?month=${month}`);
    const data = await res.json();
    setAvailableDates(data.availableDates ?? []);
    setLocked(data.locked ?? isMonthLocked(month));
    setSaved(false);
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
    await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: selectedMonth, availableDates }),
    });
    setSaving(false);
    setSaved(true);
  }

  const totalDays = selectedMonth ? daysInMonth(selectedMonth) : 31;
  const [year, mon] = selectedMonth ? selectedMonth.split("-").map(Number) : [0, 0];
  // Day of week the month starts on (0=Sun)
  const startDay = selectedMonth ? new Date(year, mon - 1, 1).getDay() : 0;

  function monthLabel(m: string) {
    const [y, mo] = m.split("-").map(Number);
    return new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Set Availability</h1>
      <p className="text-gray-500 text-sm mb-6">
        Mark the days you&apos;re available to play. Locks on the 25th of the prior month.
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
            {monthLabel(m)}
          </button>
        ))}
        {months.length === 0 && (
          <p className="text-gray-400 text-sm">No editable months right now.</p>
        )}
      </div>

      {selectedMonth && (
        <>
          {locked && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              Availability for this month is locked.
            </div>
          )}

          {/* Calendar grid */}
          <div className="card">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-xs font-medium text-gray-400 text-center py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells before month start */}
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                const isAvailable = availableDates.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    disabled={locked}
                    className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                      isAvailable
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : locked
                        ? "bg-gray-50 text-gray-400 cursor-not-allowed"
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
            {!locked && (
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? "Saving…" : "Save availability"}
              </button>
            )}
            {saved && <span className="text-sm text-green-600">Saved!</span>}
            <span className="text-sm text-gray-400">{availableDates.length} days selected</span>
          </div>
        </>
      )}
    </div>
  );
}
