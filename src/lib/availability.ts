/** "YYYY-MM" for a given Date */
export function toMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** Returns the current month and the next five months (6 months total) */
export function editableMonths(): string[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return toMonthKey(d);
  });
}

/** Days in a month */
export function daysInMonth(month: string): number {
  const [year, mon] = month.split("-").map(Number);
  return new Date(year, mon, 0).getDate();
}
