const DEFAULT_TIMEZONE = "America/Indiana/Indianapolis";

export function getAppTimeZone(): string {
  const tz = process.env.APP_TIMEZONE || process.env.NEXT_PUBLIC_APP_TIMEZONE || DEFAULT_TIMEZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function zonedParts(date: Date, timeZone = getAppTimeZone()): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function offsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - instant.getTime();
}

/** Interpret a datetime-local value as wall time in the app timezone. */
export function parseShowDateTime(input: string, timeZone = getAppTimeZone()): Date {
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) throw new Error("Invalid show datetime");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    throw new Error("Invalid show datetime");
  }
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  let instant = new Date(utcGuess.getTime() - offsetMs(utcGuess, timeZone));
  instant = new Date(utcGuess.getTime() - offsetMs(instant, timeZone));
  const back = zonedParts(instant, timeZone);
  if (
    back.year !== year ||
    back.month !== month ||
    back.day !== day ||
    back.hour !== hour ||
    back.minute !== minute ||
    back.second !== second
  ) {
    throw new Error("Invalid show datetime");
  }
  return instant;
}

export function showMonthKey(date: Date, timeZone = getAppTimeZone()): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

export function showDay(date: Date, timeZone = getAppTimeZone()): number {
  return zonedParts(date, timeZone).day;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function nextCalendarDay(year: number, month: number, day: number): string {
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function zonedDayRange(date: Date, timeZone = getAppTimeZone()): { gte: Date; lt: Date } {
  const p = zonedParts(date, timeZone);
  const day = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  return {
    gte: parseShowDateTime(`${day}T00:00:00`, timeZone),
    lt: parseShowDateTime(`${nextCalendarDay(p.year, p.month, p.day)}T00:00:00`, timeZone),
  };
}

export function zonedMonthRange(month: string, timeZone = getAppTimeZone()): { gte: Date; lt: Date } {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Invalid month");
  const [year, mon] = month.split("-").map(Number);
  const next = mon === 12 ? `${year + 1}-01` : `${year}-${pad(mon + 1)}`;
  return {
    gte: parseShowDateTime(`${month}-01T00:00:00`, timeZone),
    lt: parseShowDateTime(`${next}-01T00:00:00`, timeZone),
  };
}

/** Month M locks at 00:00 on the 25th of month M-1 in the app timezone. */
export function isMonthLocked(month: string, now = new Date(), timeZone = getAppTimeZone()): boolean {
  if (!/^\d{4}-\d{2}$/.test(month)) return true;
  const [year, mon] = month.split("-").map(Number);
  const prevYear = mon === 1 ? year - 1 : year;
  const prevMonth = mon === 1 ? 12 : mon - 1;
  const lockAt = parseShowDateTime(`${prevYear}-${pad(prevMonth)}-25T00:00:00`, timeZone);
  return now.getTime() >= lockAt.getTime();
}

export function formatShowDate(date: Date, timeZone = getAppTimeZone(), withTime = true): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

export function formatShowDay(date: Date, timeZone = getAppTimeZone()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatMonthLabel(month: string, timeZone = getAppTimeZone()): string {
  const instant = parseShowDateTime(`${month}-01T12:00:00`, timeZone);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    year: "numeric",
  }).format(instant);
}

export function formatDatetimeLocal(date: Date, timeZone = getAppTimeZone()): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function editableMonths(now = new Date(), timeZone = getAppTimeZone()): string[] {
  const p = zonedParts(now, timeZone);
  const months: string[] = [];
  let year = p.year;
  let month = p.month;
  for (let i = 0; i < 6; i++) {
    months.push(`${year}-${pad(month)}`);
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

export function daysInMonth(month: string): number {
  const [year, mon] = month.split("-").map(Number);
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

export function weekdayIndex(month: string, timeZone = getAppTimeZone()): number {
  const instant = parseShowDateTime(`${month}-01T00:00:00`, timeZone);
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(instant);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[name] ?? 0;
}

export function upcomingMonthOptions(now = new Date(), timeZone = getAppTimeZone(), count = 3) {
  const current = showMonthKey(now, timeZone);
  const [year, month] = current.split("-").map(Number);
  const options: { label: string; value: string }[] = [];
  let y = year;
  let m = month;
  for (let i = 0; i < count; i++) {
    const value = `${y}-${pad(m)}`;
    options.push({ value, label: formatMonthLabel(value, timeZone) });
    m += 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
  }
  return options;
}
