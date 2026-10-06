"use client";

import { Check, Gift, Minus, Plus, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { freeTicketsFor, lineTotal, ticketsLeft, type Competition } from "@/config/competitions";
import { addToBasket, useBasket } from "@/lib/basket";
import { money, num } from "@/lib/format";

const QUICK = [1, 5, 10, 25, 50, 100];

export function EntryPanel({ comp }: { comp: Competition }) {
  const basket = useBasket();
  const inBasket = basket.find((i) => i.slug === comp.slug)?.qty ?? 0;
  const max = Math.max(0, Math.min(comp.maxPerPerson - inBasket, ticketsLeft(comp)));
  const [qty, setQty] = useState(Math.min(comp.bundles?.[0]?.buy ?? 5, max || 1));
  const [answer, setAnswer] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  const [showError, setShowError] = useState(false);

  const clamp = (n: number) => Math.max(1, Math.min(max, Math.round(n) || 1));
  const free = freeTicketsFor(comp, qty);
  const quick = [...new Set([...(comp.bundles ?? []).map((b) => b.buy), ...QUICK])].filter((n) => n <= max).sort((a, b) => a - b).slice(0, 6);

  function add() {
    if (answer === null) {
      setShowError(true);
      document.getElementById("question")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    addToBasket(comp.slug, qty, answer);
    setAdded(true);
  }

  if (max === 0) {
    return (
      <div className="card p-6">
        <p className="font-bold">{ticketsLeft(comp) === 0 ? "Sold out! Watch the draw live." : `You've reached the ${comp.maxPerPerson}-ticket limit for this competition.`}</p>
        <Link href="/basket" className="btn btn-primary mt-4">
          Go to basket
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {comp.bundles && (
        <div>
          <h2 className="eyebrow flex items-center gap-2 text-lantern">
            <Gift size={14} /> Ticket bundles
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {comp.bundles.map((b) => {
              const on = qty === b.buy;
              return (
                <button
                  key={b.buy}
                  type="button"
                  disabled={b.buy > max}
                  onClick={() => setQty(b.buy)}
                  aria-pressed={on}
                  className={`rounded-2xl border p-3 text-left transition-colors ${on ? "border-lantern bg-lantern/10" : "border-line-2 hover:border-lantern/60"} disabled:opacity-40`}
                >
                  <span className="display block text-lg">Buy {b.buy}</span>
                  <span className="text-xs font-bold text-lantern">get {b.free} free</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="qty" className="eyebrow text-fog">
            How many tickets?
          </label>
          <span className="text-xs text-fog">Max {num(comp.maxPerPerson)} per person</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={() => setQty((q) => clamp(q - 1))} aria-label="One fewer ticket" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line-2 hover:border-lake hover:text-lake">
            <Minus size={18} />
          </button>
          <input
            id="qty"
            type="number"
            inputMode="numeric"
            min={1}
            max={max}
            value={qty}
            onChange={(e) => setQty(clamp(Number(e.target.value)))}
            className="display tabular h-12 w-full rounded-full border border-line-2 bg-deep-2 text-center text-2xl [appearance:textfield] focus:border-lake focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button type="button" onClick={() => setQty((q) => clamp(q + 1))} aria-label="One more ticket" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line-2 hover:border-lake hover:text-lake">
            <Plus size={18} />
          </button>
        </div>
        <input
          type="range"
          min={1}
          max={max}
          value={qty}
          onChange={(e) => setQty(clamp(Number(e.target.value)))}
          aria-label="Number of tickets"
          className="mt-4 w-full accent-[#2ee6d0]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {quick.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setQty(n)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-bold ${qty === n ? "border-lake text-lake" : "border-line-2 text-fog hover:text-mist"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <fieldset id="question" className={`rounded-2xl border p-5 ${showError && answer === null ? "border-ember" : "border-line-2"}`}>
        <legend className="eyebrow px-2 text-lake">Answer to enter</legend>
        <p className="font-bold">{comp.question.text}</p>
        <div className="mt-4 grid gap-2">
          {comp.question.options.map((o, i) => (
            <label
              key={o}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${answer === i ? "border-lake bg-lake/10" : "border-line-2 hover:border-lake/50"}`}
            >
              <input type="radio" name="answer" className="sr-only" checked={answer === i} onChange={() => { setAnswer(i); setShowError(false); }} />
              <span className={`grid h-5 w-5 place-items-center rounded-full border ${answer === i ? "border-lake bg-lake text-night" : "border-line-2"}`}>
                {answer === i && <Check size={13} strokeWidth={3} />}
              </span>
              {o}
            </label>
          ))}
        </div>
        {showError && answer === null && (
          <p role="alert" className="mt-3 text-sm font-bold text-ember">
            Choose an answer to add your tickets.
          </p>
        )}
        <p className="mt-3 text-xs text-fog">Wrong answers aren&rsquo;t entered into the draw, and no refunds are given.</p>
      </fieldset>

      <div className="rounded-2xl bg-deep-2 p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-fog">
            {num(qty)} × {money(comp.price)}
            {free > 0 && <span className="ml-2 font-bold text-lantern">+ {free} free</span>}
          </span>
          <span className="display normal-case text-3xl">{money(lineTotal(comp, qty), { short: false })}</span>
        </div>
        <button type="button" onClick={add} className="btn btn-primary mt-4 w-full !py-4 !text-base">
          <ShoppingBasket size={19} /> Add {num(qty + free)} tickets to basket
        </button>
        {added && (
          <p role="status" className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-1.5 font-bold text-lake">
              <Check size={16} /> Added to your basket
            </span>
            <Link href="/basket" className="font-bold underline underline-offset-4">
              Checkout
            </Link>
          </p>
        )}
        <p className="mt-3 text-center text-xs text-fog">
          Or{" "}
          <Link href="/free-entry" className="underline underline-offset-2 hover:text-mist">
            enter free by post
          </Link>
        </p>
      </div>
    </div>
  );
}
