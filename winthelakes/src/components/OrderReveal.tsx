"use client";

import { PartyPopper, Ticket, Zap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { getCompetition } from "@/config/competitions";
import { creditValue } from "@/lib/account";
import { useEntries } from "@/lib/entries";
import { drawDate, num } from "@/lib/format";
import { ScratchCard } from "./ScratchCard";

export function OrderReveal() {
  const id = useSearchParams().get("id");
  const all = useEntries();
  const entries = all.filter((e) => e.orderId === id);
  const [revealed, setRevealed] = useState(false);

  if (entries.length === 0) {
    return (
      <div className="card mx-auto max-w-xl p-10 text-center">
        <p className="display text-3xl">Order not found</p>
        <Link href="/account" className="btn btn-primary mt-6">
          See my tickets
        </Link>
      </div>
    );
  }

  const wins = entries.flatMap((e) => e.instantWins.map((w) => ({ ...w, title: e.title })));
  const total = entries.reduce((n, e) => n + e.tickets.length, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow text-lake">Order {id}</p>
      <h1 className="display mt-2 text-5xl">You&rsquo;re in!</h1>
      <p className="mt-3 text-lg text-fog">
        {num(total)} tickets across {entries.length} {entries.length === 1 ? "competition" : "competitions"}. A confirmation is on its way to your inbox.
      </p>

      <div className="mt-8">
        <ScratchCard label="Scratch for instant wins" onReveal={() => setRevealed(true)}>
          <div className={`flex min-h-48 flex-col items-center justify-center p-8 text-center ${wins.length ? "bg-gradient-to-br from-lantern to-[#ff9f43] text-night" : "bg-deep-2"}`}>
            {wins.length ? (
              <>
                <PartyPopper size={40} />
                <p className="display mt-3 text-4xl">Instant win!</p>
                <ul className="mt-3 space-y-1 font-bold">
                  {wins.map((w) => (
                    <li key={`${w.title}-${w.ticket}`}>
                      Ticket #{num(w.ticket)} won <span className="underline">{w.prize}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm font-semibold">
                  {wins.some((w) => creditValue(w.prize) > 0) ? "Site credit is already in your wallet. " : ""}We&rsquo;ll be in touch about cash and prizes within 24 hours.
                </p>
              </>
            ) : (
              <>
                <Ticket size={36} className="text-lake" />
                <p className="display mt-3 text-3xl">No instant win this time</p>
                <p className="mt-2 text-fog">All your tickets are still in the main draw. Good luck!</p>
              </>
            )}
          </div>
        </ScratchCard>
      </div>

      <div className={`mt-10 space-y-5 transition-opacity ${revealed ? "" : "opacity-60"}`}>
        {entries.map((e) => {
          const comp = getCompetition(e.slug);
          const winners = new Set(e.instantWins.map((w) => w.ticket));
          return (
            <section key={e.slug} className="card p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="display text-xl">{e.title}</h2>
                {comp && <span className="text-sm text-fog">Draw {drawDate(comp.drawAt)}</span>}
              </div>
              {!e.correct && <p className="mt-2 text-sm font-bold text-ember">Wrong answer: these tickets aren&rsquo;t in the draw.</p>}
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Your ticket numbers">
                {e.tickets.map((t) => (
                  <li
                    key={t}
                    className={`tabular flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-bold ${
                      revealed && winners.has(t) ? "bg-lantern text-night shadow-[0_0_20px_#ffc85788]" : "bg-lake/10 text-lake ring-1 ring-lake/25"
                    }`}
                  >
                    {revealed && winners.has(t) && <Zap size={12} />}#{num(t)}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/account" className="btn btn-primary">
          My tickets
        </Link>
        <Link href="/competitions" className="btn btn-ghost">
          Keep playing
        </Link>
      </div>
    </div>
  );
}
