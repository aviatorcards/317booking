import { describe, expect, it } from "vitest";
import {
  formatDatetimeLocal,
  isMonthLocked,
  parseShowDateTime,
  showDay,
  showMonthKey,
  zonedDayRange,
} from "./timezone";

const TZ = "America/Indiana/Indianapolis";

describe("show timezone", () => {
  it("stores a summer wall time as UTC", () => {
    const instant = parseShowDateTime("2026-07-15T21:00", TZ);
    expect(instant.toISOString()).toBe("2026-07-16T01:00:00.000Z");
    expect(showMonthKey(instant, TZ)).toBe("2026-07");
    expect(showDay(instant, TZ)).toBe(15);
    expect(formatDatetimeLocal(instant, TZ)).toBe("2026-07-15T21:00");
  });

  it("stores a winter wall time with the standard offset", () => {
    const instant = parseShowDateTime("2026-01-15T21:00", TZ);
    expect(instant.toISOString()).toBe("2026-01-16T02:00:00.000Z");
    expect(showDay(instant, TZ)).toBe(15);
  });

  it("rejects a wall time that does not exist", () => {
    expect(() => parseShowDateTime("2026-02-31T12:00", TZ)).toThrow();
  });

  it("uses the local calendar day for double-book windows", () => {
    const instant = parseShowDateTime("2026-07-15T21:00", TZ);
    const range = zonedDayRange(instant, TZ);
    expect(range.gte.toISOString()).toBe("2026-07-15T04:00:00.000Z");
    expect(range.lt.toISOString()).toBe("2026-07-16T04:00:00.000Z");
    expect(parseShowDateTime("2026-07-15T23:30", TZ).getTime()).toBeGreaterThanOrEqual(range.gte.getTime());
    expect(parseShowDateTime("2026-07-15T23:30", TZ).getTime()).toBeLessThan(range.lt.getTime());
  });

  it("locks a month at 00:00 on the 25th of the previous month", () => {
    const before = parseShowDateTime("2026-06-24T23:59", TZ);
    const atLock = parseShowDateTime("2026-06-25T00:00", TZ);
    expect(isMonthLocked("2026-07", before, TZ)).toBe(false);
    expect(isMonthLocked("2026-07", atLock, TZ)).toBe(true);
    expect(isMonthLocked("2026-08", atLock, TZ)).toBe(false);
  });
});
