"use client";

import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { instantWinCount, type Competition } from "@/config/competitions";
import { money } from "@/lib/format";
import { CountdownInline } from "./Countdown";
import { DrawBadge } from "./CompetitionCard";
import { PrizeArt } from "./PrizeArt";
import { Progress } from "./Progress";

export function HeroSlider({ comps }: { comps: Competition[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const comp = comps[i];
  const go = (d: number) => setI((n) => (n + d + comps.length) % comps.length);

  useEffect(() => {
    if (paused || comps.length < 2) return;
    const id = window.setTimeout(() => setI((n) => (n + 1) % comps.length), 7000);
    return () => window.clearTimeout(id);
  }, [i, paused, comps.length]);

  const iw = instantWinCount(comp);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured competitions"
      className="water relative overflow-hidden border-b border-line"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div key={comp.slug} className="animate-[fadeUp_.5s_ease-out]" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow -rotate-2 rounded-full bg-lake px-3.5 py-1.5 text-[0.66rem] text-night shadow-[0_0_30px_-4px_#2ee6d0]">
              Win me! Prize {i + 1} of {comps.length}
            </span>
            <DrawBadge comp={comp} />
          </div>
          <h1 className="display mt-6 text-[2.6rem] sm:text-6xl lg:text-7xl">{comp.title}</h1>
          <p className="mt-4 max-w-lg text-lg text-fog">{comp.teaser}</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <span className="flex items-baseline gap-1.5 rounded-full bg-mist px-4 py-2 text-night">
              <span className="display normal-case text-2xl">{money(comp.price)}</span>
              <span className="eyebrow text-[0.58rem]">a ticket</span>
            </span>
            <span className="flex items-center rounded-full border border-line-2 px-4 py-2 text-sm font-bold">
              <CountdownInline drawAt={comp.drawAt} />
            </span>
            {iw > 0 && (
              <span className="flex items-center gap-1.5 rounded-full border border-lantern/40 px-4 py-2 text-sm font-bold text-lantern">
                <Zap size={14} /> {iw} instant wins
              </span>
            )}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/competitions/${comp.slug}`} className="btn btn-primary">
              Enter now
            </Link>
            <Link href={`/competitions/${comp.slug}#prize`} className="btn btn-ghost">
              Peek at the prize
            </Link>
          </div>
          <div className="mt-8 max-w-md">
            <Progress sold={comp.sold} max={comp.maxTickets} />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-lake/10 blur-3xl" aria-hidden="true" />
          <Link href={`/competitions/${comp.slug}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-[4/3] overflow-hidden rounded-[2rem] ring-1 ring-white/10">
            <PrizeArt key={comp.slug} comp={comp} iconSize={110} className="animate-[fadeIn_.6s_ease-out]" />
            {comp.cashAlternative && (
              <span className="absolute right-4 bottom-4 rounded-2xl bg-night/80 px-4 py-2.5 text-right ring-1 ring-white/10 backdrop-blur">
                <span className="eyebrow block text-[0.58rem] text-fog">or cash</span>
                <span className="display normal-case text-xl text-lantern">{money(comp.cashAlternative)}</span>
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 pb-8 sm:px-6">
        <div className="flex gap-1.5">
          {comps.map((c, n) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setI(n)}
              aria-label={`Show prize ${n + 1}: ${c.title}`}
              aria-current={n === i}
              className={`h-1.5 rounded-full transition-all ${n === i ? "w-10 bg-lake shadow-[0_0_12px_#2ee6d0]" : "w-6 bg-white/20 hover:bg-white/40"}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => go(-1)} aria-label="Previous prize" className="grid h-11 w-11 place-items-center rounded-full border border-line-2 hover:border-lake hover:text-lake">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next prize" className="grid h-11 w-11 place-items-center rounded-full border border-line-2 hover:border-lake hover:text-lake">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
