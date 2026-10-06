"use client";

import { m, useReducedMotion } from "framer-motion";
import { Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { lowestMonthly, planById } from "@/config/site";
import { examples } from "@/content/examples";
import type { ExampleMeta } from "@/content/examples/types";
import { fill, formatEuro, useHref, useL, useLang, useT } from "@/lib/i18n";
import { btn } from "./Section";

/** Order in the arc: the most striking example sits in the middle. */
const ORDER = ["hotel", "salon", "restaurant", "yoga", "portfolio"];

/** Desktop arc: horizontal offset (% of row), vertical drop (px) and stacking per position. */
const ARC = [
  { x: "1%", y: 110, z: 1 },
  { x: "19%", y: 45, z: 2 },
  { x: "37%", y: 0, z: 3 },
  { x: "55%", y: 45, z: 2 },
  { x: "73%", y: 110, z: 1 },
];

/**
 * Hero: the promise, centred, then every example site in a browser window,
 * labelled with its kind of business and plan price.
 */
export function Hero() {
  const t = useT();
  const href = useHref();
  const { lang } = useLang();
  const reduce = useReducedMotion();
  const sites = ORDER.map((slug) => examples.find((e) => e.slug === slug)).filter(Boolean) as ExampleMeta[];

  return (
    <section aria-labelledby="hero-title" className="px-3 pt-2 sm:px-4">
      <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[28px] bg-sky lg:min-h-[calc(100svh-5rem)]">
        <div className="mx-auto max-w-[980px] px-5 pt-14 text-center sm:px-8 lg:pt-20">
          <h1 id="hero-title" className="headline text-[clamp(3.2rem,8vw,7.5rem)]">
            <span className="mb-5 block text-[15px] font-semibold tracking-[0.12em] text-ink/75 uppercase sm:text-base">{t.hero.eyebrow}</span>
            {t.hero.titleA}
            <br />
            {t.hero.titleB}
          </h1>
          <p className="mx-auto mt-6 max-w-[40ch] text-[clamp(1.25rem,2vw,1.6rem)] leading-snug font-medium text-balance">
            {fill(t.hero.sub, { price: formatEuro(lowestMonthly, lang) })}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="#contact" className={`${btn.primary} min-h-13 px-7 text-lg`}>
              {t.hero.cta}
            </Link>
            <Link href={href("/examples")} className={`${btn.secondary} min-h-13 border-ink/20 bg-white/60 px-7 text-lg hover:bg-white`}>
              {t.hero.secondary}
            </Link>
          </div>
        </div>

        {/* Example sites: swipeable row on phones, an arc on desktop */}
        <ul
          aria-label={t.hero.showcase}
          className="mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-8 [scrollbar-width:none] sm:px-8 lg:relative lg:mx-auto lg:mt-14 lg:block lg:h-[400px] lg:max-w-[1360px] lg:overflow-visible lg:p-0 [&::-webkit-scrollbar]:hidden"
        >
          {sites.map((ex, i) => (
            <m.li
              key={ex.slug}
              initial={reduce ? false : { y: 40 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 + Math.abs(i - 2) * 0.12, ease: [0.2, 0.7, 0.1, 1] }}
              className="w-[80vw] max-w-[420px] shrink-0 snap-center lg:absolute lg:top-[var(--y)] lg:left-[var(--x)] lg:z-[var(--z)] lg:w-[26%] lg:max-w-none"
              style={{ ["--x" as string]: ARC[i].x, ["--y" as string]: `${ARC[i].y}px`, ["--z" as string]: ARC[i].z }}
            >
              <SiteCard ex={ex} eager={i < 2} flip={i > 2} />
            </m.li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SiteCard({ ex, eager, flip }: { ex: ExampleMeta; eager: boolean; flip: boolean }) {
  const t = useT();
  const tr = useL();
  const { lang } = useLang();
  const plan = planById(ex.plan);
  return (
    <Link
      href={`/examples/${ex.slug}`}
      className="group block overflow-hidden rounded-xl bg-white shadow-[0_30px_60px_-30px_rgb(20_40_120/0.5)] ring-1 ring-black/5 transition-transform duration-300 hover:-translate-y-2"
    >
      <div className={`flex items-center justify-between gap-2 border-b border-black/5 px-3 py-2 ${flip ? "lg:flex-row-reverse" : ""}`}>
        <span className="truncate rounded-full bg-sky px-2.5 py-0.5 text-[11px] font-medium">
          {tr(ex.industry)} · {formatEuro(plan.monthly, lang)}
          {t.pricing.perMonthShort}
        </span>
        <span className="flex min-w-0 items-center gap-1 text-[11px] text-muted">
          <Lock aria-hidden className="size-2.5 shrink-0" />
          <span className="truncate">{ex.domain}</span>
        </span>
      </div>
      <div className="relative aspect-[16/10]">
        <Image src={ex.screenshot} alt="" fill loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} sizes="(min-width: 1024px) 26vw, 80vw" className="object-cover object-top" />
      </div>
      <span className="sr-only">
        {ex.name}: {tr(ex.industry)}, {formatEuro(plan.monthly, lang)}
        {t.pricing.perMonth}
      </span>
    </Link>
  );
}
