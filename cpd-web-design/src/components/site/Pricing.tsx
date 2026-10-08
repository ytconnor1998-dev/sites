"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { planById, pricing, type Plan, type PlanId } from "@/config/site";
import { fill, formatEuro, useL, useLang, useT } from "@/lib/i18n";
import { Section, btn } from "./Section";

/** Plans come from src/config/site.ts → pricing.plans. */
export function Pricing() {
  const t = useT();
  const months = pricing.minimumTermMonths;

  return (
    <Section id="pricing" title={t.pricing.title} intro={t.pricing.intro}>
      <div className="grid gap-5 lg:grid-cols-2">
        {pricing.plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      <div className="mt-10 max-w-[64ch]">
        <h3 className="text-xl font-semibold">{fill(t.pricing.termTitle, { months })}</h3>
        <p className="mt-2 text-lg leading-relaxed text-muted">{fill(t.pricing.termBody, { months })}</p>
      </div>

      <Comparison />
    </Section>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const t = useT();
  const tr = useL();
  const { lang } = useLang();
  return (
    <div className={`flex flex-col rounded-[28px] p-7 sm:p-10 ${plan.featured ? "bg-sky" : "border border-ink/15"}`}>
      <h3 className="text-2xl font-semibold">{tr(plan.name)}</h3>
      <p className="mt-1 text-muted">{tr(plan.audience)}</p>
      <p className="mt-6 flex items-end gap-3">
        <span className="headline text-[clamp(4.5rem,9vw,7rem)]">{formatEuro(plan.monthly, lang)}</span>
        <span className="pb-2 text-muted">
          {t.pricing.perMonth}
          <br />
          {t.pricing.vat}
        </span>
      </p>
      <p className="mt-2 text-sm text-muted">{t.pricing.free}</p>
      <ul className="mt-6 flex-1 space-y-2.5">
        {plan.includes.map((item) => (
          <li key={item.en} className="flex gap-2.5">
            <Check aria-hidden className="mt-1 size-4 shrink-0 text-cobalt" strokeWidth={3} />
            <span>{tr(item)}</span>
          </li>
        ))}
      </ul>
      <a href="#contact" className={`mt-8 self-start ${plan.featured ? btn.primary : btn.secondary}`}>
        {fill(t.pricing.choose, { name: tr(plan.name) })}
      </a>
    </div>
  );
}

/**
 * Two printed receipts side by side, typical agency vs CPD, with a plan and period picker.
 * All figures come from pricing in src/config/site.ts.
 */
function Comparison() {
  const t = useT();
  const tr = useL();
  const { lang } = useLang();
  const eur = (n: number) => formatEuro(n, lang);
  const [planId, setPlanId] = useState<PlanId>("business");
  const [years, setYears] = useState(1);

  const a = pricing.agency;
  const plan = planById(planId);
  const months = years * 12;
  const agencyMin = a.buildMin + (a.hostingMonthly + a.maintenanceMonthly) * months;
  const agencyMax = a.buildMax + (a.hostingMonthly + a.maintenanceMonthly) * months;
  const ours = plan.monthly * months;
  const period = t.pricing.years[years - 1];

  const rows: [string, string, string][] = [
    [t.pricing.rows.build, `${eur(a.buildMin)}–${eur(a.buildMax)}`, eur(0)],
    [t.pricing.rows.hosting, `${eur(a.hostingMonthly)}${t.pricing.perMonthShort}`, t.pricing.included],
    [t.pricing.rows.maintenance, `${eur(a.maintenanceMonthly)}${t.pricing.perMonthShort}`, t.pricing.included],
    [t.pricing.rows.edits, t.pricing.billed, t.pricing.included],
    [t.pricing.rows.support, t.pricing.billed, t.pricing.included],
  ];

  const segment = (active: boolean) =>
    `min-h-10 cursor-pointer rounded-full px-4 text-sm font-medium transition-colors ${active ? "bg-ink text-white" : "hover:bg-ink/5"}`;

  return (
    <div className="mt-20">
      <h3 className="heading text-[clamp(1.8rem,3.4vw,2.75rem)]">{t.pricing.compareTitle}</h3>
      <p className="mt-2 text-lg text-muted">{t.pricing.compareIntro}</p>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
        <div role="group" aria-label={t.pricing.calcPlan} className="inline-flex flex-wrap gap-1 rounded-full border border-ink/20 p-1">
          {pricing.plans.map((p) => (
            <button key={p.id} type="button" aria-pressed={planId === p.id} onClick={() => setPlanId(p.id)} className={segment(planId === p.id)}>
              {tr(p.name)}
            </button>
          ))}
        </div>
        <div role="group" aria-label={t.pricing.calcPeriod} className="inline-flex flex-wrap gap-1 rounded-full border border-ink/20 p-1">
          {t.pricing.years.map((label, i) => (
            <button key={label} type="button" aria-pressed={years === i + 1} onClick={() => setYears(i + 1)} className={segment(years === i + 1)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid items-start gap-6 md:grid-cols-2 lg:gap-10">
        <ReceiptCard
          title={t.pricing.agency}
          rows={rows.map(([l, v]) => [l, v])}
          due={`${eur(a.buildMin)}–${eur(a.buildMax)}`}
          totalLabel={fill(t.pricing.rows.total, { period })}
          total={`${eur(agencyMin)}–${eur(agencyMax)}`}
        />
        <ReceiptCard
          title={`${t.pricing.you} · ${tr(plan.name)}`}
          rows={rows.map(([l, , v]) => [l, v])}
          due={eur(0)}
          totalLabel={fill(t.pricing.rows.total, { period })}
          total={eur(ours)}
          ours
        />
      </div>

      <p className="mt-6 text-2xl font-semibold tracking-tight" aria-live="polite">
        {fill(t.pricing.savings, { min: eur(agencyMin - ours), max: eur(agencyMax - ours) })}
      </p>
      <p className="mt-3 max-w-[70ch] text-sm text-muted">
        {fill(t.pricing.finePrint, { months: pricing.minimumTermMonths, fee: eur(pricing.buyoutFee) })} {t.pricing.basedOn}
      </p>
    </div>
  );
}

function ReceiptCard({ title, rows, due, totalLabel, total, ours = false }: { title: string; rows: [string, string][]; due: string; totalLabel: string; total: string; ours?: boolean }) {
  const t = useT();
  return (
    <div className={`receipt-edge relative px-6 pt-6 pb-9 font-mono text-[13px] ${ours ? "bg-white shadow-[0_18px_40px_-26px_rgb(0_0_0/0.55)]" : "bg-paper-2"}`}>
      <p className="text-center font-semibold">{title}</p>
      <dl className="mt-4 space-y-1.5 border-t border-dashed border-ink/50 pt-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-end gap-2">
            <dt className="shrink-0">{label}</dt>
            <span aria-hidden className="dotted-leader mb-1.5 h-2 flex-1" />
            <dd className="shrink-0 text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <dl className="mt-4 space-y-1 border-t border-dashed border-ink/50 pt-3">
        <div className="flex items-baseline justify-between gap-4 font-semibold">
          <dt>{t.pricing.rows.dueToday}</dt>
          <dd className="text-right text-lg">{due}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt>{totalLabel}</dt>
          <dd className="text-right">{total}</dd>
        </div>
      </dl>
      {ours && <span aria-hidden className="absolute inset-y-0 right-1.5 w-1 bg-stripe/70" />}
    </div>
  );
}
