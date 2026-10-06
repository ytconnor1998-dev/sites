"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { getCompetition } from "@/config/competitions";
import { creditValue } from "@/lib/account";
import { confetti } from "@/lib/confetti";
import { useEntries } from "@/lib/entries";
import { drawDate, num } from "@/lib/format";
import { ScratchCard } from "./ScratchCard";
import { serial } from "./Ticket";

export function OrderReveal() {
  const id = useSearchParams().get("id");
  const all = useEntries();
  const entries = all.filter((e) => e.orderId === id);
  const [revealed, setRevealed] = useState(false);

  if (entries.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <p className="text-lg">We couldn&rsquo;t find that order in this browser.</p>
        <Link href="/account" className="btn btn-primary mt-6">
          See my tickets
        </Link>
      </div>
    );
  }

  const wins = entries.flatMap((e) => e.instantWins.map((w) => ({ ...w, title: e.title })));
  const total = entries.reduce((n, e) => n + e.tickets.length, 0);
  // Where each competition's tickets start in the overall reveal order (for staggered timing).
  const starts = entries.map((_, i) => entries.slice(0, i).reduce((n, e) => n + e.tickets.length, 0));

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="display text-6xl sm:text-8xl">You&rsquo;re in</h1>
      <p className="mt-3 max-w-[55ch] text-lg">
        {num(total)} tickets in {entries.length} {entries.length === 1 ? "competition" : "competitions"}. Order {id}. We&rsquo;ve emailed you a copy.
      </p>

      <div className="mt-10 max-w-2xl">
        <ScratchCard label="Scratch to see your tickets" onReveal={() => {
            setRevealed(true);
            if (wins.length) {
              confetti(window.innerWidth / 2, window.innerHeight * 0.45, 160);
              window.setTimeout(() => confetti(window.innerWidth * 0.25, window.innerHeight * 0.6, 80), 250);
              window.setTimeout(() => confetti(window.innerWidth * 0.75, window.innerHeight * 0.6, 80), 450);
            }
          }}>
          <div className={`flex min-h-52 flex-col justify-center p-8 ${wins.length ? "bg-explorer text-white" : "bg-sheet"}`}>
            {wins.length ? (
              <>
                <p className="display text-6xl">Instant win</p>
                <ul className="mt-3 space-y-1 text-lg">
                  {wins.map((w) => (
                    <li key={`${w.title}-${w.ticket}`}>
                      Ticket {num(w.ticket)} wins <strong>{w.prize}</strong> in {w.title}.
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-white/90">
                  {wins.some((w) => creditValue(w.prize) > 0) ? "Site credit is already in your wallet. " : ""}We&rsquo;ll be in touch about cash and prizes within 24 hours.
                </p>
              </>
            ) : (
              <>
                <p className="display text-5xl">No instant win this time</p>
                <p className="mt-2 text-lg text-ink-2">All your tickets are in the main draw. Good luck.</p>
              </>
            )}
          </div>
        </ScratchCard>
      </div>

      {revealed && (
        <div className="mt-12 space-y-10">
          {entries.map((e, ei) => {
            const comp = getCompetition(e.slug);
            const winners = new Set(e.instantWins.map((w) => w.ticket));
            return (
              <section key={e.slug}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2">
                  <h2 className="display text-3xl">{e.title}</h2>
                  {comp && <span className="text-sm text-ink-2">Draw {drawDate(comp.drawAt)}</span>}
                </div>
                {!e.correct && <p className="mt-2 text-sm font-semibold text-explorer">Your answer was wrong, so these tickets aren&rsquo;t in the draw.</p>}
                <ul className="mt-4 flex flex-wrap gap-2.5" aria-label="Your ticket numbers">
                  {e.tickets.map((t, ti) => {
                    const won = winners.has(t);
                    const d = Math.min((starts[ei] + ti) * 60, 1800);
                    return (
                      <li
                        key={t}
                        style={{ animation: `tear-in .35s ${d}ms both` }}
                        className={`ticket ticket-h tabular flex h-11 items-center text-sm font-semibold ${won ? "bg-explorer !text-white" : `paper-${comp?.paper ?? "lemon"}`}`}
                      >
                        <span className="px-3">{serial(t)}</span>
                        {won && <span className="pr-3">Winner</span>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          <div className="flex flex-wrap gap-3">
            <Link href="/account" className="btn btn-primary">
              My tickets
            </Link>
            <Link href="/competitions" className="btn btn-quiet">
              More competitions
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
