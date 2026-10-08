"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { Photo } from "@/components/ui/Photo";
import { planById, pricing } from "@/config/site";
import { examples } from "@/content/examples";
import type { Industry } from "@/content/industries";
import { fill, formatEuro, useHref, useL, useLang, useT } from "@/lib/i18n";
import { btn } from "./Section";

/** Landing page for one kind of business. Content: src/content/industries.ts. */
export function IndustryPage({ industry }: { industry: Industry }) {
  const t = useT();
  const p = t.industryPage;
  const tr = useL();
  const { lang } = useLang();
  const href = useHref();
  const ex = examples.find((e) => e.slug === industry.example)!;
  const plan = planById(industry.plan);
  const price = formatEuro(plan.monthly, lang);

  return (
    <>
      <section aria-labelledby="industry-title" className="mx-auto max-w-[1280px] px-5 pt-10 pb-16 sm:px-8 lg:pt-16 lg:pb-24">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <ol className="flex flex-wrap gap-1.5">
            <li>
              <Link href={href("/")} className="hover:text-ink hover:underline">
                CPD Web Design
              </Link>
              <span aria-hidden> /</span>
            </li>
            <li>
              <Link href={href("/examples")} className="hover:text-ink hover:underline">
                {p.breadcrumb}
              </Link>
              <span aria-hidden> /</span>
            </li>
            <li aria-current="page" className="text-ink">
              {tr(industry.name)}
            </li>
          </ol>
        </nav>

        <div className="mt-8 grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h1 id="industry-title" className="heading text-[clamp(2.6rem,5.6vw,4.75rem)]">
              {tr(industry.h1)}
            </h1>
            <p className="mt-6 max-w-[54ch] text-lg leading-relaxed text-muted">{tr(industry.intro)}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={href("/#contact")} className={btn.primary}>
                {t.nav.cta}
              </Link>
              <Link href={`/examples/${ex.slug}`} className={btn.secondary}>
                {p.seeDemo}
              </Link>
            </div>
          </div>
          <figure className="lg:col-span-6">
            <Link href={`/examples/${ex.slug}`} className="block overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-30px_rgb(0_0_0/0.45)]" tabIndex={-1} aria-hidden>
              <span className="flex h-8 items-center gap-1.5 border-b border-line px-3">
                <span className="size-2.5 rounded-full bg-ink/15" />
                <span className="size-2.5 rounded-full bg-ink/15" />
                <span className="size-2.5 rounded-full bg-ink/15" />
                <span className="ml-3 truncate text-xs text-muted">{ex.domain}</span>
              </span>
              <span className="relative block aspect-[16/10]" style={{ ["--ph-bg" as string]: ex.palette.bg, ["--ph-fg" as string]: ex.palette.fg }}>
                <Photo src={ex.screenshot} alt="" label={ex.name} sizes="(min-width: 1024px) 45vw, 100vw" priority />
              </span>
            </Link>
            <figcaption className="mt-3 text-sm text-muted">{fill(p.demoCaption, { name: ex.name })}</figcaption>
          </figure>
        </div>
      </section>

      <section aria-labelledby="needs-title" className="bg-paper-2">
        <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 lg:py-24">
          <h2 id="needs-title" className="heading text-[clamp(2rem,4vw,3.25rem)]">
            {p.needsTitle}
          </h2>
          <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {industry.needs.map((n) => (
              <li key={n.title.en} className="border-t border-ink/20 pt-4">
                <h3 className="text-lg font-semibold">{tr(n.title)}</h3>
                <p className="mt-1 leading-relaxed text-muted">{tr(n.body)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="included-title" className="mx-auto grid max-w-[1280px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:py-24">
        <div className="lg:col-span-7">
          <h2 id="included-title" className="heading text-[clamp(2rem,4vw,3.25rem)]">
            {p.includedTitle}
          </h2>
          <ul className="mt-8 grid gap-x-8 sm:grid-cols-2">
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
        </div>
        <div className="self-start rounded-[28px] bg-sky p-7 sm:p-9 lg:col-span-5">
          <p className="text-xl font-semibold">{fill(p.planTitle, { plan: tr(plan.name) })}</p>
          <p className="headline mt-3 text-[clamp(3.5rem,7vw,5.5rem)]">{price}</p>
          <p className="mt-3 leading-relaxed text-muted">{fill(p.planBody, { price, months: pricing.minimumTermMonths })}</p>
          <ul className="mt-5 space-y-2">
            {plan.includes.slice(0, 5).map((item) => (
              <li key={item.en} className="flex gap-2.5">
                <Check aria-hidden className="mt-1 size-4 shrink-0 text-cobalt" strokeWidth={3} />
                <span>{tr(item)}</span>
              </li>
            ))}
          </ul>
          <Link href={href("/#pricing")} className={`${btn.link} mt-6 inline-block`}>
            {t.nav.pricing}
          </Link>
        </div>
      </section>

      <section aria-labelledby="ifaq-title" className="mx-auto grid max-w-[1280px] gap-10 px-5 pb-16 sm:px-8 lg:grid-cols-12 lg:pb-24">
        <h2 id="ifaq-title" className="heading text-[clamp(2rem,4vw,3.25rem)] lg:col-span-5">
          {p.faqTitle}
        </h2>
        <div className="border-t border-ink lg:col-span-7">
          {industry.faqs.map((item) => (
            <details key={item.q.en} className="group border-b border-line">
              <summary className="flex min-h-14 items-center justify-between gap-6 py-4">
                <h3 className="text-lg font-semibold">{tr(item.q)}</h3>
                <Plus aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-45" />
              </summary>
              <p className="max-w-[64ch] pb-6 text-lg leading-relaxed text-muted">{tr(item.a)}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="icta-title" className="on-cobalt bg-cobalt text-white">
        <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 lg:py-20">
          <h2 id="icta-title" className="heading text-[clamp(2rem,4.4vw,3.5rem)]">
            {p.ctaTitle}
          </h2>
          <p className="mt-4 max-w-[56ch] text-lg text-cobalt-soft">{p.ctaBody}</p>
          <Link href={href("/#contact")} className={`${btn.onCobalt} mt-8`}>
            {t.nav.cta}
          </Link>
        </div>
      </section>
    </>
  );
}
