import Link from "next/link";
import type { Competition } from "@/config/competitions";
import { money, num } from "@/lib/format";
import { Odometer } from "./Odometer";

/** Dark section: every instant-win ticket number still to be won, lit up on its competition's paper colour. */
export function InstantWall({ comps }: { comps: Competition[] }) {
  const withWins = comps.filter((c) => c.instantWins?.length);
  const left = withWins.flatMap((c) => c.instantWins!.flatMap((w) => w.tickets.filter((t) => !w.claimed.includes(t)).map(() => w.value)));
  const value = left.reduce((n, v) => n + v, 0);

  return (
    <section aria-labelledby="iw-wall-h" className="bg-ink text-map">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <h2 id="iw-wall-h" className="display text-6xl sm:text-7xl">
            Instant wins up for grabs
          </h2>
          <p className="text-lg text-map/85">
            <Odometer value={left.length} className="display text-5xl text-[var(--color-paper-lemon)]" /> winning tickets still out there, worth{" "}
            <strong className="text-white">{money(Math.round(value / 100) * 100)}</strong>. Buy one of these numbers and you win on the spot.
          </p>
        </div>
        <div className="mt-10 space-y-6">
          {withWins.map((c) => (
            <div key={c.slug} className="grid gap-3 border-t border-map/15 pt-5 md:grid-cols-[16rem_1fr]">
              <Link href={`/competitions/${c.slug}`} className="display text-2xl hover:underline">
                {c.title}
              </Link>
              <ul className="flex flex-wrap items-start gap-2">
                {c.instantWins!.flatMap((w) =>
                  w.tickets.map((t) => {
                    const won = w.claimed.includes(t);
                    return (
                      <li
                        key={`${w.prize}-${t}`}
                        title={`${w.prize}${won ? " (already won)" : ""}`}
                        className={`tabular rounded-[3px] px-2 py-1 text-sm ${won ? "text-map/40 line-through" : `paper-${c.paper} bg-[var(--paper)] font-semibold text-ink`}`}
                      >
                        {num(t)}
                        <span className="sr-only">
                          {" "}
                          wins {w.prize}
                          {won ? ", already won" : ""}
                        </span>
                      </li>
                    );
                  }),
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
