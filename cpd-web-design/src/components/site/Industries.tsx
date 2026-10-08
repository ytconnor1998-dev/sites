"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { Photo } from "@/components/ui/Photo";
import { planById } from "@/config/site";
import { examples } from "@/content/examples";
import { industries } from "@/content/industries";
import { fill, formatEuro, useHref, useL, useLang, useT } from "@/lib/i18n";
import { Section, btn } from "./Section";

/** What each example site includes. Everything is in the one plan. */
export function Industries() {
  const t = useT();
  const tr = useL();
  const { lang } = useLang();
  const [active, setActive] = useState(0);
  const baseId = useId();
  const ex = examples[active];

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = (active + (e.key === "ArrowRight" ? 1 : -1) + examples.length) % examples.length;
    setActive(next);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  };

  const href = useHref();
  const industry = industries.find((x) => x.example === ex.slug);
  return (
    <Section id="industries" tone="paper-2" title={t.industries.title} intro={t.industries.intro}>
      <div role="tablist" aria-label={t.industries.title} className="inline-flex flex-wrap gap-1 rounded-[24px] border border-ink/20 p-1" onKeyDown={onKeyDown}>
        {examples.map((x, i) => (
          <button
            key={x.slug}
            id={`${baseId}-tab-${i}`}
            role="tab"
            type="button"
            aria-selected={active === i}
            aria-controls={`${baseId}-panel`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            className={`min-h-10 cursor-pointer rounded-full px-5 font-medium ${active === i ? "bg-ink text-white" : "hover:bg-ink/5"}`}
          >
            {tr(x.industry)}
          </button>
        ))}
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${active}`} className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl" style={{ background: ex.palette.bg, ["--ph-bg" as string]: ex.palette.bg, ["--ph-fg" as string]: ex.palette.fg }}>
            <Photo src={ex.cover} alt="" label={ex.name} sizes="(min-width: 1024px) 30vw, 100vw" />
          </div>
          <p className="mt-4 text-xl font-semibold">{ex.name}</p>
          <p className="text-muted">{tr(ex.tagline)}</p>
          <p className="mt-2 inline-flex rounded-full bg-sky px-3 py-1 text-sm font-medium">
            {tr(planById(ex.plan).name)} · {formatEuro(planById(ex.plan).monthly, lang)}
            {t.pricing.perMonth}
          </p>
          <Link href={`/examples/${ex.slug}`} className={`${btn.secondary} mt-5`}>
            {fill(t.industries.demo, { name: ex.name })}
          </Link>
          {industry && (
            <Link href={href(`/websites/${industry.slug}`)} className={`${btn.link} mt-4 block`}>
              {fill(t.industryPage.more, { name: tr(industry.name) })} →
            </Link>
          )}
        </div>

        <div className="lg:col-span-8">
          <ul className="grid gap-x-8 sm:grid-cols-2">
            {ex.features.map((f) => (
              <li key={f.id} className="flex gap-3 border-b border-line py-3">
                <Check aria-hidden className="mt-1 size-4 shrink-0 text-cobalt" strokeWidth={3} />
                <span>
                  <span className="block font-medium">{tr(f.label)}</span>
                  <span className="block text-sm text-muted">{tr(f.description)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">{t.industries.note}</p>
        </div>
      </div>
    </Section>
  );
}
