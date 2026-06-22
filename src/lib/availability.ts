/**
 * Availability lock logic.
 * Bands can edit availability for month M until LOCK_DAY_OF_PRIOR_MONTH of month M-1.
 * e.g. July availability locks on June 25th.
 */
export const LOCK_DAY = 25;

/** "YYYY-MM" for a given Date */
export function toMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** Returns true if the availability for `month` ("YYYY-MM") is currently locked */
export function isMonthLocked(month: string): boolean {
  const [year, mon] = month.split("-").map(Number);
  // Lock date = 25th of prior month
  const lockDate = new Date(year, mon - 2, LOCK_DAY, 23, 59, 59);
  return new Date() > lockDate;
}

/** Next two editable months from today */
export function editableMonths(): string[] {
  const result: string[] = [];
  const now = new Date();
  // Check current month + next 2
  for (let offset = 0; offset <= 2; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const key = toMonthKey(d);
    if (!isMonthLocked(key)) result.push(key);
  }
  return result;
}

/** Days in a month */
export function daysInMonth(month: string): number {
  const [year, mon] = month.split("-").map(Number);
  return new Date(year, mon, 0).getDate();
}
