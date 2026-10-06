import { num, percent } from "@/lib/format";

/** Tickets sold: a water-blue bar like a lake filling up. */
export function Progress({ sold, max, compact = false }: { sold: number; max: number; compact?: boolean }) {
  const p = percent(sold, max);
  return (
    <div>
      <div
        className={`overflow-hidden rounded-full bg-ink/10 ${compact ? "h-1.5" : "h-2"}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p}
        aria-label={`${p}% of tickets sold`}
      >
        <div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(p, 1)}%` }} />
      </div>
      <p className={`mt-1.5 flex justify-between ${compact ? "text-xs" : "text-sm"}`}>
        <span>{p}% sold</span>
        <span className="tabular">{num(max - sold)} left</span>
      </p>
    </div>
  );
}
