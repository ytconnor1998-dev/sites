"use client";

import { PauseCircle, ShieldCheck, Ticket, Wallet, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { getCompetition } from "@/config/competitions";
import { onBreak, spentThisMonth, updateAccount, useAccount } from "@/lib/account";
import { useEntries } from "@/lib/entries";
import { drawDate, money, num, shortDate } from "@/lib/format";
import { CountdownInline } from "./Countdown";

const tabs = [
  { id: "tickets", label: "My tickets", icon: Ticket },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "safer", label: "Safer play", icon: ShieldCheck },
] as const;

export function AccountView() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("tickets");
  const account = useAccount();
  const entries = useEntries();

  // Group all orders by competition.
  const bySlug = new Map<string, typeof entries>();
  for (const e of entries) bySlug.set(e.slug, [...(bySlug.get(e.slug) ?? []), e]);

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <div className="space-y-4">
        <div className="card p-5">
          <p className="eyebrow text-[0.6rem] text-fog">Signed in as</p>
          <p className="mt-1 truncate font-bold">{account.name || "Guest player"}</p>
          <p className="truncate text-sm text-fog">{account.email || "Enter a competition to set up your account"}</p>
          <p className="mt-4 eyebrow text-[0.6rem] text-fog">Site credit</p>
          <p className="display normal-case text-3xl text-lantern">{money(account.credit, { short: false })}</p>
        </div>
        <nav aria-label="Account" className="flex gap-2 overflow-x-auto lg:flex-col">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-left font-bold transition-colors ${tab === t.id ? "bg-lake text-night" : "text-fog hover:bg-deep hover:text-mist"}`}
            >
              <t.icon size={17} /> {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {tab === "tickets" &&
          (bySlug.size === 0 ? (
            <div className="card p-10 text-center">
              <p className="display text-3xl">No tickets yet</p>
              <p className="mt-2 text-fog">Your ticket numbers will appear here after you enter.</p>
              <Link href="/competitions" className="btn btn-primary mt-6">
                Browse competitions
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {[...bySlug].map(([slug, list]) => {
                const comp = getCompetition(slug);
                const tickets = list.flatMap((e) => e.tickets).sort((a, b) => a - b);
                const wins = list.flatMap((e) => e.instantWins);
                return (
                  <section key={slug} className="card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link href={`/competitions/${slug}`} className="display text-xl hover:text-lake">
                          {list[0].title}
                        </Link>
                        {comp && <p className="mt-1 text-sm text-fog">Draw {drawDate(comp.drawAt)}</p>}
                      </div>
                      {comp && (
                        <span className="rounded-full border border-line-2 px-3 py-1.5 text-sm font-bold">
                          <CountdownInline drawAt={comp.drawAt} />
                        </span>
                      )}
                    </div>
                    {wins.length > 0 && (
                      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold text-lantern">
                        <Zap size={15} /> Instant wins: {wins.map((w) => `${w.prize} (#${num(w.ticket)})`).join(", ")}
                      </p>
                    )}
                    {list.some((e) => !e.correct) && <p className="mt-2 text-sm text-ember">Some tickets had a wrong answer and aren&rsquo;t in the draw.</p>}
                    <p className="eyebrow mt-4 text-[0.6rem] text-fog">{num(tickets.length)} tickets</p>
                    <ul className="mt-2 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                      {tickets.map((t) => (
                        <li key={t} className="tabular rounded-md bg-lake/10 px-2 py-0.5 text-sm font-bold text-lake">
                          #{num(t)}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          ))}

        {tab === "wallet" && (
          <div className="card p-6">
            <h2 className="display text-2xl">Wallet</h2>
            <p className="mt-2 text-fog">Site credit from instant wins and refunds. It&rsquo;s used automatically at checkout and never expires.</p>
            <p className="display normal-case mt-6 text-6xl text-lantern">{money(account.credit, { short: false })}</p>
            <h3 className="eyebrow mt-8 text-fog">Order history</h3>
            <ul className="mt-3 divide-y divide-line">
              {[...new Map(entries.map((e) => [e.orderId, e])).values()].map((e) => {
                const paid = entries.filter((x) => x.orderId === e.orderId).reduce((n, x) => n + x.paid, 0);
                return (
                  <li key={e.orderId} className="flex justify-between py-3 text-sm">
                    <span>
                      <Link href={`/order?id=${e.orderId}`} className="font-bold hover:text-lake">
                        {e.orderId}
                      </Link>
                      <span className="ml-2 text-fog">{shortDate(e.createdAt)}</span>
                    </span>
                    <span className="tabular">{money(paid, { short: false })}</span>
                  </li>
                );
              })}
              {entries.length === 0 && <li className="py-3 text-sm text-fog">No orders yet.</li>}
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
    <div className="space-y-5">
      <section className="card p-6">
        <h2 className="display text-2xl">Monthly spend limit</h2>
        <p className="mt-2 text-fog">
          You&rsquo;ve spent <strong className="text-mist">{money(spentThisMonth(account), { short: false })}</strong> this month.
          {account.monthlyLimit > 0 && (
            <>
              {" "}
              Your limit is <strong className="text-mist">{money(account.monthlyLimit, { short: false })}</strong>.
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
          <label className="flex items-center rounded-xl border border-line-2 bg-deep-2 px-4 focus-within:border-lake">
            <span className="text-fog">£</span>
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
            <p role="status" className="self-center text-sm font-bold text-lake">
              Saved
            </p>
          )}
        </form>
      </section>
      <section className="card p-6">
        <h2 className="display flex items-center gap-2 text-2xl">
          <PauseCircle className="text-lake" /> Take a break
        </h2>
        {resting ? (
          <p className="mt-3 text-fog">
            You&rsquo;re on a break until <strong className="text-mist">{shortDate(account.breakUntil!)}</strong>. You can&rsquo;t enter competitions until then.
          </p>
        ) : (
          <>
            <p className="mt-2 text-fog">Block yourself from entering for a while. A break can&rsquo;t be cancelled early.</p>
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
                  className="btn btn-ghost"
                  onClick={() => window.confirm(`Take a ${label} break? You won't be able to enter until it ends.`) && takeBreak(d as number)}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
        <p className="mt-5 text-sm text-fog">
          Need to talk? <a href="https://www.gamcare.org.uk/" className="text-mist underline underline-offset-2" rel="noopener" target="_blank">GamCare</a> offers free, confidential
          support on 0808 8020 133.
        </p>
      </section>
    </div>
  );
}
