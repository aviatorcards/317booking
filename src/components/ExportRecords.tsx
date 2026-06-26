"use client";

import { useState } from "react";

interface ExportRecordsProps {
  endpoint: string; // e.g. "/api/bands/me/export" or "/api/venues/me/export"
}

function getMonthOptions() {
  const options: { label: string; value: string }[] = [{ label: "All time", value: "" }];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    options.push({ label, value });
  }
  return options;
}

export function ExportRecords({ endpoint }: ExportRecordsProps) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const options = getMonthOptions();

  function href(format: "csv" | "xlsx" | "pdf") {
    const params = new URLSearchParams({ format });
    if (month) params.set("month", month);
    return `${endpoint}?${params}`;
  }

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">Export Records</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label text-xs mb-1">Period</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input py-1.5 text-sm"
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <a href={href("csv")} download className="btn-secondary text-sm px-3 py-1.5">
            CSV
          </a>
          <a href={href("xlsx")} download className="btn-secondary text-sm px-3 py-1.5">
            Excel
          </a>
          <a href={href("pdf")} download className="btn-secondary text-sm px-3 py-1.5">
            PDF
          </a>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Downloads include all gigs in the selected period with pay amounts and status.
      </p>
    </div>
  );
}
