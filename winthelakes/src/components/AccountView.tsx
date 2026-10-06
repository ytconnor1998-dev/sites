"use client";

import Link from "next/link";
import { useState } from "react";
import { getCompetition } from "@/config/competitions";
import { onBreak, spentThisMonth, updateAccount, useAccount } from "@/lib/account";
import { useEntries } from "@/lib/entries";
import { drawDate, money, num, shortDate } from "@/lib/format";
import { CountdownInline } from "./Countdown";

const tabs = [
  { id: "tickets", label: "My tickets" },
  { id: "wallet", label: "Wallet" },
  { id: "safer", label: "Safer play" },
] as const;

export function AccountView() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("tickets");
  const account = useAccount();
  const entries = useEntries();

  // Group all orders by competition.
  const bySlug = new Map<string, typeof entries>();
  for (const e of entries) bySlug.set(e.slug, [...(bySlug.get(e.slug) ?? []), e]);

  return (
    <div>
      <p className="text-lg">
        {account.name ? (
          <>
            {account.name}, {account.email}.
          </>
        ) : (
          "You'll see your details here after your first entry."
        )}{" "}
        Site credit: <strong className="font-semibold">{money(account.credit, { short: false })}</strong>
      </p>
      <nav aria-label="Account" className="mt-8 flex gap-6 overflow-x-auto border-b border-rule">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id}
            className={`-mb-px shrink-0 border-b-[3px] pb-3 text-[0.95rem] ${tab === t.id ? "border-explorer font-semibold" : "border-transparent text-ink-2 hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-8">
        {tab === "tickets" &&
          (bySlug.size === 0 ? (
            <div>
              <p className="text-lg">No tickets yet. Your ticket numbers appear here after you enter.</p>
              <Link href="/competitions" className="btn btn-primary mt-6">
                Browse competitions
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {[...bySlug].map(([slug, list]) => {
                const comp = getCompetition(slug);
                const tickets = list.flatMap((e) => e.tickets).sort((a, b) => a - b);
                const wins = list.flatMap((e) => e.instantWins);
                return (
                  <section key={slug} className="border-b border-rule pb-8">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link href={`/competitions/${slug}`} className="display text-3xl hover:underline">
                          {list[0].title}
                        </Link>
                        {comp && <p className="mt-1 text-sm text-ink-2">Draw {drawDate(comp.drawAt)}</p>}
                      </div>
                      {comp && (
                        <span className="text-sm">Draw in{" "}
                          <CountdownInline drawAt={comp.drawAt} />
                        </span>
                      )}
                    </div>
                    {wins.length > 0 && (
                      <p className="mt-3 text-sm font-semibold text-explorer">
                        Instant wins: {wins.map((w) => `${w.prize} (#${num(w.ticket)})`).join(", ")}
                      </p>
                    )}
                    {list.some((e) => !e.correct) && <p className="mt-2 text-sm text-explorer">Some tickets had a wrong answer and aren&rsquo;t in the draw.</p>}
                    <p className="mt-4 text-sm text-ink-2">{num(tickets.length)} tickets</p>
                    <ul className="mt-2 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                      {tickets.map((t) => (
                        <li key={t} className={`tabular rounded-[3px] px-2 py-0.5 text-sm paper-${comp?.paper ?? "lemon"} bg-[var(--paper)]`}>
                          {num(t)}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          ))}

        {tab === "wallet" && (
          <div className="max-w-2xl">
            <h2 className="display text-4xl">Wallet</h2>
            <p className="mt-2 text-ink-2">Site credit from instant wins and refunds. It&rsquo;s used automatically at checkout and never expires.</p>
            <p className="display mt-6 text-7xl">{money(account.credit, { short: false })}</p>
            <h3 className="mt-8 text-ink-2">Order history</h3>
            <ul className="mt-3 divide-y divide-rule">
              {[...new Map(entries.map((e) => [e.orderId, e])).values()].map((e) => {
                const paid = entries.filter((x) => x.orderId === e.orderId).reduce((n, x) => n + x.paid, 0);
                return (
                  <li key={e.orderId} className="flex justify-between py-3 text-sm">
                    <span>
                      <Link href={`/order?id=${e.orderId}`} className="link font-semibold">
                        {e.orderId}
                      </Link>
                      <span className="ml-2 text-ink-2">{shortDate(e.createdAt)}</span>
                    </span>
                    <span className="tabular">{money(paid, { short: false })}</span>
                  </li>
                );
              })}
              {entries.length === 0 && <li className="py-3 text-sm text-ink-2">No orders yet.</li>}
            </ul>
          </div>
        )}

        {tab === "safer" && <SaferPlay />}
      </div>
    </div>
  );
}

function SaferPlay() {
  const account = useAccount();
  const [limit, setLimit] = useState(account.monthlyLimit ? String(account.monthlyLimit / 100) : "");
  const [saved, setSaved] = useState(false);
  const resting = onBreak(account);

  function takeBreak(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    updateAccount({ breakUntil: d.toISOString() });
  }

  return (
    <div className="max-w-2xl space-y-12">
      <section>
        <h2 className="display text-4xl">Monthly spend limit</h2>
        <p className="mt-2 text-ink-2">
          You&rsquo;ve spent <strong className="text-ink">{money(spentThisMonth(account), { short: false })}</strong> this month.
          {account.monthlyLimit > 0 && (
            <>
              {" "}
              Your limit is <strong className="text-ink">{money(account.monthlyLimit, { short: false })}</strong>.
            </>
          )}
        </p>
        <form
          className="mt-4 flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            updateAccount({ monthlyLimit: Math.max(0, Math.round(Number(limit) * 100) || 0) });
            setSaved(true);
          }}
        >
          <label className="flex items-center rounded-md border border-ink/25 bg-white px-3.5 focus-within:outline-2 focus-within:outline-explorer">
            <span className="text-ink-2">£</span>
            <input
              value={limit}
              onChange={(e) => {
                setLimit(e.target.value);
                setSaved(false);
              }}
              inputMode="decimal"
              placeholder="No limit"
              aria-label="Monthly limit in pounds"
              className="w-32 bg-transparent px-2 py-3 focus:outline-none"
            />
          </label>
          <button className="btn btn-primary">Save limit</button>
          {saved && (
            <p role="status" className="self-center text-sm font-semibold text-wood">
              Saved
            </p>
          )}
        </form>
      </section>
      <section>
        <h2 className="display text-4xl">Take a break</h2>
        {resting ? (
          <p className="mt-3 text-ink-2">
            You&rsquo;re on a break until <strong className="text-ink">{shortDate(account.breakUntil!)}</strong>. You can&rsquo;t enter competitions until then.
          </p>
        ) : (
          <>
            <p className="mt-2 text-ink-2">Block yourself from entering for a while. A break can&rsquo;t be cancelled early.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                [1, "24 hours"],
                [7, "1 week"],
                [30, "1 month"],
                [180, "6 months"],
              ].map(([d, label]) => (
                <button
                  key={d}
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => window.confirm(`Take a ${label} break? You won't be able to enter until it ends.`) && takeBreak(d as number)}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
        <p className="mt-5 text-sm text-ink-2">
          Need to talk? <a href="https://www.gamcare.org.uk/" className="link" rel="noopener" target="_blank">GamCare</a> offers free, confidential
          support on 0808 8020 133.
        </p>
      </section>
    </div>
  );
}
