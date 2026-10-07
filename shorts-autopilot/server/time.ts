/** Timezone helpers without a date library. */

function partsIn(tz: string, date: Date) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second };
}

/** Offset of `tz` from UTC at `date`, in ms. */
function offsetAt(tz: string, date: Date) {
  const p = partsIn(tz, date);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(date.getTime() / 1000) * 1000;
}

/** Wall-clock time in `tz` → UTC Date. */
export function zonedToUtc(tz: string, y: number, m: number, d: number, h: number, min: number): Date {
  const guess = Date.UTC(y, m - 1, d, h, min);
  let utc = guess - offsetAt(tz, new Date(guess));
  utc = guess - offsetAt(tz, new Date(utc)); // second pass settles DST edges
  return new Date(utc);
}

/** Calendar date (y, m, d) in `tz` for a given instant. */
export function dateIn(tz: string, date: Date) {
  const p = partsIn(tz, date);
  return { y: p.y, m: p.m, d: p.d };
}

export function addDays(ymd: { y: number; m: number; d: number }, n: number) {
  const t = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
