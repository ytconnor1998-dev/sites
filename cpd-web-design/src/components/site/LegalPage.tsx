"use client";

import Link from "next/link";
import { Fragment } from "react";
import { CookieSettingsButton } from "@/components/ui/CookieBanner";
import { contact, legal, pricing, site } from "@/config/site";
import { legalDocs, legalRoutes, type LegalBlock, type LegalKind } from "@/content/legal";
import { fill, formatEuro, useLang, useT } from "@/lib/i18n";
import { btn } from "./Section";

/** Renders one of the legal documents in src/content/legal.ts in the active language. */
export function LegalPage({ kind }: { kind: LegalKind }) {
  const { lang } = useLang();
  const t = useT();
  const doc = legalDocs[lang][kind];

  const vars: Record<string, string> = {
    owner: legal.ownerName,
    business: site.name,
    address: legal.address,
    vat: site.vatNumber,
    rea: legal.rea,
    pec: legal.pec,
    email: contact.email,
    phone: contact.phoneDisplay,
    months: String(pricing.minimumTermMonths),
    fee: formatEuro(pricing.buyoutFee, lang),
    notice: String(legal.noticeDays),
    retention: String(legal.enquiryRetentionMonths),
    court: legal.court[lang],
    host: legal.host,
    year: String(new Date().getFullYear()),
  };
  // Lines that mention an empty value (e.g. no PEC) are dropped.
  const usesEmpty = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].some(([, k]) => vars[k] === "");
  const text = (s: string) => <RichText text={fill(s, vars)} />;

  const updated = new Intl.DateTimeFormat(lang === "it" ? "it-IT" : "en-GB", { dateStyle: "long" }).format(new Date(`${legal.lastUpdated}T12:00:00`));

  const block = (b: LegalBlock, i: number) => {
    if (typeof b === "string") return usesEmpty(b) ? null : <p key={i}>{text(b)}</p>;
    if ("list" in b)
      return (
        <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-muted">
          {b.list.filter((s) => !usesEmpty(s)).map((s) => (
            <li key={s}>{text(s)}</li>
          ))}
        </ul>
      );
    if ("plans" in b)
      return (
        <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-muted">
          {pricing.plans.map((p) => (
            <li key={p.id}>{fill(t.legalPage.plans, { name: p.name[lang], price: formatEuro(p.monthly, lang) })}</li>
          ))}
        </ul>
      );
    return (
      // Scrolls sideways on small screens; focusable so keyboard users can scroll it too.
      <div key={i} className="overflow-x-auto rounded-xl border border-line" tabIndex={0} role="region" aria-label={b.table.head.join(", ")}>
        <table className="w-full min-w-[34rem] text-left text-[15px]">
          <thead className="bg-paper-2">
            <tr>
              {b.table.head.map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.table.rows.map((row) => (
              <tr key={row[0]} className="border-t border-line align-top">
                {row.map((cell, c) => (
                  <td key={c} className={`px-4 py-3 ${c === 0 ? "font-medium" : "text-muted"}`}>
                    {text(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const others = (Object.keys(legalRoutes) as LegalKind[]).filter((k) => k !== kind);

  return (
    <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8 lg:py-24">
      <p className="text-sm text-muted">
        {t.legalPage.updated}: <time dateTime={legal.lastUpdated}>{updated}</time>
      </p>
      <h1 className="heading mt-3 text-[clamp(2.5rem,6vw,4.5rem)]">{doc.title}</h1>
      <p className="mt-6 text-lg leading-relaxed">{text(doc.intro)}</p>

      {kind === "cookies" && <CookieSettingsButton className={`${btn.primary} mt-6`}>{t.legalPage.settings}</CookieSettingsButton>}

      {doc.sections.length > 4 && (
        <nav aria-labelledby="legal-contents" className="mt-10 rounded-2xl bg-paper-2 p-6">
          <h2 id="legal-contents" className="font-semibold">
            {t.legalPage.contents}
          </h2>
          <ol className="mt-3 grid gap-x-8 gap-y-1.5 text-[15px] sm:grid-cols-2">
            {doc.sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="hover:underline">
                  {i + 1}. {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="mt-12 space-y-12">
        {doc.sections.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24 space-y-4 leading-relaxed">
            <h2 id={`${s.id}-h`} className="text-2xl font-semibold tracking-tight">
              {i + 1}. {s.heading}
            </h2>
            {s.body.map(block)}
          </section>
        ))}
      </div>

      <nav aria-labelledby="legal-more" className="mt-16 border-t border-line pt-8">
        <h2 id="legal-more" className="font-semibold">
          {t.legalPage.more}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {others.map((k) => (
            <li key={k}>
              <Link href={legalRoutes[k]} className={btn.link}>
                {legalDocs[lang][k].title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}

/** Turns [text](href) into links; internal paths use next/link. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!m) return <Fragment key={i}>{part}</Fragment>;
    const [, label, href] = m;
    return href.startsWith("/") ? (
      <Link key={i} href={href} className={btn.link}>
        {label}
      </Link>
    ) : (
      <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={btn.link}>
        {label}
      </a>
    );
  });
}
