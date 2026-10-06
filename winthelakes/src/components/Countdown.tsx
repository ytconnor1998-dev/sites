"use client";

import { useCountdown } from "@/lib/countdown";

const pad = (n: number) => String(n).padStart(2, "0");

/** Big boxed countdown (competition page). */
export function CountdownBoxes({ drawAt }: { drawAt: string }) {
  const r = useCountdown(drawAt);
  const parts: [string, number | undefined][] = [
    ["Days", r?.days],
    ["Hours", r?.hours],
    ["Mins", r?.minutes],
    ["Secs", r?.seconds],
  ];
  if (r?.ended) return <p className="rounded-xl bg-deep-2 px-4 py-3 font-bold text-lantern">Entries closed. Draw coming up!</p>;
  return (
    <div className="grid grid-cols-4 gap-2" role="timer" aria-label="Time until the draw">
      {parts.map(([label, v]) => (
        <div key={label} className="rounded-xl border border-line bg-deep-2 py-2.5 text-center">
          <div className="display tabular text-2xl sm:text-3xl">{v === undefined ? "--" : pad(v)}</div>
          <div className="eyebrow mt-1 text-[0.6rem] text-fog">{label}</div>
        </div>
      ))}
    </div>
  );
}

/** Compact inline countdown: 02d 14h 05m 33s. */
export function CountdownInline({ drawAt, className = "" }: { drawAt: string; className?: string }) {
  const r = useCountdown(drawAt);
  if (!r) return <span className={`tabular ${className}`}>--d --h --m --s</span>;
  if (r.ended) return <span className={className}>Draw due</span>;
  const urgent = r.days === 0;
  return (
    <span className={`tabular ${urgent ? "text-ember" : ""} ${className}`}>
      {pad(r.days)}
      <small className="opacity-60">d</small> {pad(r.hours)}
      <small className="opacity-60">h</small> {pad(r.minutes)}
      <small className="opacity-60">m</small> {pad(r.seconds)}
      <small className="opacity-60">s</small>
    </span>
  );
}
