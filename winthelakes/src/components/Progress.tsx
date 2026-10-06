import { num, percent } from "@/lib/format";

export function Progress({ sold, max, size = "md" }: { sold: number; max: number; size?: "sm" | "md" }) {
  const p = percent(sold, max);
  return (
    <div>
      <div
        className={`overflow-hidden rounded-full bg-white/8 ${size === "sm" ? "h-1.5" : "h-2.5"}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p}
        aria-label={`${p}% of tickets sold`}
      >
        <div className="progress-fill h-full rounded-full" style={{ width: `${Math.max(p, 1.5)}%` }} />
      </div>
      <div className={`eyebrow mt-2 flex justify-between text-fog ${size === "sm" ? "text-[0.62rem]" : ""}`}>
        <span>
          <span className="text-mist">{p}%</span> gone
        </span>
        <span className="tabular">{num(max - sold)} left</span>
      </div>
    </div>
  );
}
