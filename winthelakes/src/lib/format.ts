/** Formats pence as pounds: 99 → "99p", 249 → "£2.49", 450000 → "£4,500". */
export function money(pence: number, { short = true } = {}) {
  if (short && pence < 100) return `${pence}p`;
  const pounds = pence / 100;
  const whole = Number.isInteger(pounds);
  return pounds.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: whole && pence >= 10_000 ? 0 : 2,
    maximumFractionDigits: whole && pence >= 10_000 ? 0 : 2,
  });
}

export function num(n: number) {
  return n.toLocaleString("en-GB");
}

export function drawDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
}

export function percent(sold: number, max: number) {
  const p = (sold / max) * 100;
  return p >= 99.95 ? 100 : Math.round(p * 10) / 10;
}
