"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { instantWinCount, type Competition } from "@/config/competitions";
import { useCountdown } from "@/lib/countdown";
import { money, num, percent } from "@/lib/format";
import { Odometer } from "./Odometer";
import { PrizeImage } from "./PrizeImage";
import { Stamp } from "./Stamp";

const pad = (n: number) => String(n).padStart(2, "0");

function FlipCountdown({ drawAt }: { drawAt: string }) {
  const r = useCountdown(drawAt);
  const parts: [string, number | undefined][] = [
    ["days", r?.days],
    ["hrs", r?.hours],
    ["min", r?.minutes],
    ["sec", r?.seconds],
  ];
  return (
    <div className="flex gap-1.5 sm:gap-2" role="timer" aria-label="Time until the draw">
      {parts.map(([label, v]) => (
        <div key={label} className="text-center">
          <div className="flip-tile display tabular grid h-16 w-14 place-items-center rounded-md text-4xl text-white ring-1 ring-white/15 backdrop-blur-md sm:h-20 sm:w-[4.5rem] sm:text-5xl">
            {v === undefined ? "--" : pad(v)}
          </div>
          <div className="mt-1 text-xs text-white/70">{label}</div>
        </div>
      ))}
    </div>
  );
}

/** Full-screen opener: the featured prizes, one at a time, with thumbnails to flick between them. */
export function Hero({ comps }: { comps: Competition[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const comp = comps[i];

  useEffect(() => {
    if (paused || comps.length < 2) return;
    const id = window.setTimeout(() => setI((n) => (n + 1) % comps.length), 8000);
    return () => window.clearTimeout(id);
  }, [i, paused, comps.length]);

  const iw = instantWinCount(comp);
  const p = percent(comp.sold, comp.maxTickets);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured prizes"
      className="relative isolate overflow-hidden bg-ink text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
    >
      <div key={comp.slug} className="absolute inset-0 -z-10 animate-[hero-in_1.1s_cubic-bezier(.2,.8,.2,1)_both]">
        <PrizeImage seed={comp.slug} image={comp.image} alt="" />
      </div>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#1d2b33f2_0%,#1d2b33b3_45%,#1d2b3320_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-ink to-transparent" />

      <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-6xl flex-col justify-end px-4 pt-16 pb-8 sm:px-6 lg:min-h-[44rem]">
        <div key={comp.slug} className="animate-[rise_.7s_cubic-bezier(.2,.8,.2,1)_both]" aria-live="polite">
          <div className="flex flex-wrap items-center gap-3">
            <Stamp tone="white" angle={-5}>
              Worth {money(comp.value)}
            </Stamp>
            {iw > 0 && (
              <Stamp tone="white" angle={3}>
                + {num(iw)} instant wins
              </Stamp>
            )}
          </div>
          <h1 className="display mt-5 max-w-[14ch] text-[clamp(3.2rem,9vw,8.5rem)]">{comp.title}</h1>
          <p className="mt-4 max-w-[46ch] text-lg text-white/85 sm:text-xl">
            {comp.teaser}.{comp.cashAlternative && <> Or take {money(comp.cashAlternative)} cash.</>}
          </p>

          <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-6">
            <FlipCountdown drawAt={comp.drawAt} />

            <Link
              href={`/competitions/${comp.slug}`}
              className={`ticket ticket-h paper-${comp.paper} group flex items-stretch transition-transform hover:-rotate-1 hover:scale-[1.03]`}
              style={{ "--stub": "8.5rem", "--notch": "9px" } as React.CSSProperties}
            >
              <span className="flex flex-col justify-center px-5 py-3">
                <span className="text-xs text-ink-2">
                  Next ticket <Odometer key={comp.slug} value={comp.sold + 1} pad={6} prefix="No " className="font-semibold text-ink" />
                </span>
                <span className="mt-1 leading-none">
                  {comp.wasPrice && <s className="mr-1.5 text-base text-ink-2">{money(comp.wasPrice)}</s>}
                  <span className="display text-5xl">{money(comp.price)}</span>
                </span>
              </span>
              <span className="stub-h flex items-center justify-center bg-explorer px-3 text-center text-lg font-bold text-white group-hover:bg-[#a83c08]">Enter now</span>
            </Link>
          </div>

          <div className="mt-7 max-w-xl">
            <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-[var(--color-paper-lemon)] transition-[width] duration-1000" style={{ width: `${p}%` }} />
            </div>
            <p className="mt-2 flex justify-between text-sm text-white/85">
              <span>
                <strong className="text-white">{p}%</strong> of tickets gone
              </span>
              <span className="tabular">{num(comp.maxTickets - comp.sold)} left</span>
            </p>
          </div>
        </div>

        {comps.length > 1 && (
          <div className="mt-10 flex gap-3 overflow-x-auto pb-1" role="tablist" aria-label="Choose a featured prize">
            {comps.map((c, n) => (
              <button
                key={c.slug}
                type="button"
                role="tab"
                aria-selected={n === i}
                onClick={() => setI(n)}
                className={`group relative flex w-56 shrink-0 items-center gap-3 rounded-md p-2 pr-3 text-left transition-colors ${n === i ? "bg-white text-ink" : "bg-white/10 text-white hover:bg-white/20"}`}
              >
                <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[3px]">
                  <PrizeImage seed={c.slug} image={c.image} alt="" />
                </span>
                <span className="min-w-0">
                  <span className="display line-clamp-2 text-lg">{c.title}</span>
                </span>
                {n === i && !paused && <span key={i} className="absolute inset-x-2 bottom-1 h-0.5 origin-left animate-[timer_8s_linear_both] bg-explorer" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
