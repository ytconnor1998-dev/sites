import Link from "next/link";
import type { Competition } from "@/config/competitions";
import { money, num } from "@/lib/format";
import { CountdownInline } from "./Countdown";
import { PrizeImage } from "./PrizeImage";

/** Loud orange band: the competitions closing soonest. */
export function LastChance({ comps }: { comps: Competition[] }) {
  return (
    <section aria-labelledby="last-h" className="bg-explorer text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="last-h" className="display text-6xl sm:text-7xl">
            Last chance
          </h2>
          <p className="max-w-[36ch] text-white/90">These close soonest. Once the clock hits zero, entries stop and the draw goes ahead.</p>
        </div>
        <ul className="mt-8 grid gap-5 lg:grid-cols-3">
          {comps.map((c, i) => (
            <li key={c.slug} className="tilt" style={{ "--tilt": `${[-1, 0.8, -0.5][i] ?? 0}deg` } as React.CSSProperties}>
              <Link
                href={`/competitions/${c.slug}`}
                className={`ticket ticket-h paper-${c.paper} flex items-stretch text-ink`}
                style={{ "--stub": "6.5rem" } as React.CSSProperties}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3 p-3">
                  <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[3px]">
                    <PrizeImage seed={c.slug} image={c.image} alt="" />
                  </span>
                  <span className="min-w-0">
                    <span className="display line-clamp-2 text-xl">{c.title}</span>
                    <span className="mt-1 block text-sm">
                      <CountdownInline drawAt={c.drawAt} className="font-bold" />
                      <span className="text-ink-2"> · {num(c.maxTickets - c.sold)} left</span>
                    </span>
                  </span>
                </span>
                <span className="stub-h flex flex-col items-center justify-center">
                  <span className="display text-3xl">{money(c.price)}</span>
                  <span className="text-sm font-semibold text-explorer">Enter</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
