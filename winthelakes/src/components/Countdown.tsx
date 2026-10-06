"use client";

import { useCountdown } from "@/lib/countdown";

const pad = (n: number) => String(n).padStart(2, "0");

/** Large countdown for the competition page. */
export function CountdownBoxes({ drawAt }: { drawAt: string }) {
  const r = useCountdown(drawAt);
  if (r?.ended) return <p className="font-semibold">Entries are closed. The draw is next.</p>;
  const parts: [string, number | undefined][] = [
    ["days", r?.days],
    ["hours", r?.hours],
    ["mins", r?.minutes],
    ["secs", r?.seconds],
  ];
  return (
    <div className="flex items-baseline gap-4" role="timer" aria-label="Time until the draw">
      {parts.map(([label, v]) => (
        <span key={label} className="flex items-baseline gap-1">
          <span className="display tabular text-4xl">{v === undefined ? "--" : pad(v)}</span>
          <span className="text-sm text-ink-2">{label}</span>
        </span>
      ))}
    </div>
  );
}

/** One-line countdown: "2d 14h 05m" (seconds only on the final day). */
export function CountdownInline({ drawAt, className = "" }: { drawAt: string; className?: string }) {
  const r = useCountdown(drawAt);
  if (!r) return <span className={`tabular ${className}`}>&nbsp;</span>;
  if (r.ended) return <span className={className}>Drawing now</span>;
  const text = r.days > 0 ? `${r.days}d ${r.hours}h ${pad(r.minutes)}m` : `${r.hours}h ${pad(r.minutes)}m ${pad(r.seconds)}s`;
  return <span className={`tabular ${r.days === 0 ? "font-semibold text-explorer" : ""} ${className}`}>{text}</span>;
}
