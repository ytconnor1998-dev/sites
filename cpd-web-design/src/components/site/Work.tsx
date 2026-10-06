"use client";

import Link from "next/link";
import { Photo } from "@/components/ui/Photo";
import { planById, portfolio, type PortfolioItem } from "@/config/site";
import { examples } from "@/content/examples";
import { formatEuro, useHref, useL, useLang, useT } from "@/lib/i18n";
import { Section, btn } from "./Section";

/**
 * Example sites (and any real client work) from src/config/site.ts → portfolio.
 * Layout: two large cards, then rows of three.
 */
export function Work() {
  const t = useT();
  const href = useHref();
  return (
    <Section id="work" title={t.work.title} intro={t.work.intro}>
      <ul className="grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-6">
        {portfolio.map((item, i) => (
          <li key={item.title} className={i < 2 ? "lg:col-span-3" : "lg:col-span-2"}>
            <WorkItem item={item} large={i < 2} />
          </li>
        ))}
      </ul>
      <Link href={href("/examples")} className={`${btn.secondary} mt-12`}>
        {t.work.all}
      </Link>
    </Section>
  );
}

function WorkItem({ item, large }: { item: PortfolioItem; large: boolean }) {
  const t = useT();
  const tr = useL();
  const { lang } = useLang();
  const isDemo = !!item.href;
  const meta = isDemo ? examples.find((e) => `/examples/${e.slug}` === item.href) : undefined;
  const plan = meta ? planById(meta.plan) : undefined;
  const link = item.href ?? item.url;

  const body = (
    <>
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-black/5" style={{ background: item.cover.bg, ["--ph-bg" as string]: item.cover.bg, ["--ph-fg" as string]: item.cover.fg }}>
        <Photo src={item.image} alt="" label={item.title} sizes={large ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"} className="object-top transition-transform duration-500 group-hover:scale-[1.02]" />
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h3 className={`font-semibold ${large ? "text-2xl" : "text-xl"}`}>{item.title}</h3>
          <p className="text-muted">{tr(item.category)}</p>
        </div>
        {plan && (
          <span className="shrink-0 rounded-full bg-sky px-3 py-1 text-sm font-medium">
            {formatEuro(plan.monthly, lang)}
            {t.pricing.perMonthShort}
          </span>
        )}
      </div>
      <p className="mt-2 max-w-[56ch] leading-relaxed text-muted">{tr(item.description)}</p>
    </>
  );

  if (!link) return <article>{body}</article>;
  return (
    <article>
      <a href={link} {...(isDemo ? {} : { target: "_blank", rel: "noopener noreferrer" })} className="group block rounded-2xl focus-visible:outline-offset-8">
        {body}
        <span className="mt-3 inline-block font-medium underline decoration-1 underline-offset-4 group-hover:decoration-2">
          {isDemo ? t.work.view : t.work.visit}
          <span className="sr-only">: {item.title}</span>
        </span>
      </a>
    </article>
  );
}
