"use client";

import { Check, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { freeTicketsFor, lineTotal, ticketsLeft, type Competition } from "@/config/competitions";
import { addToBasket, useBasket } from "@/lib/basket";
import { confetti } from "@/lib/confetti";
import { money, num } from "@/lib/format";
import { Ticket } from "./Ticket";

export function EntryPanel({ comp }: { comp: Competition }) {
  const basket = useBasket();
  const inBasket = basket.find((i) => i.slug === comp.slug)?.qty ?? 0;
  const max = Math.max(0, Math.min(comp.maxPerPerson - inBasket, ticketsLeft(comp)));
  const [qty, setQty] = useState(Math.min(comp.bundles?.[0]?.buy ?? 5, max || 1));
  const [answer, setAnswer] = useState<number | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const [showError, setShowError] = useState(false);

  const clamp = (n: number) => Math.max(1, Math.min(max, Math.round(n) || 1));
  const free = freeTicketsFor(comp, qty);

  function add(e: React.MouseEvent<HTMLButtonElement>) {
    if (answer === null) {
      setShowError(true);
      document.getElementById("question")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    addToBasket(comp.slug, qty, answer);
    setAdded(qty + free);
    const r = e.currentTarget.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top, 70);
  }

  if (max === 0) {
    return (
      <div className="rounded-md border border-rule bg-sheet p-6">
        <p className="font-semibold">{ticketsLeft(comp) === 0 ? "Sold out. The draw is on the date shown." : `You've reached the ${comp.maxPerPerson}-ticket limit for this competition.`}</p>
        <Link href="/basket" className="btn btn-primary mt-4">
          Go to basket
        </Link>
      </div>
    );
  }

  return (
    <Ticket
      paper={comp.paper}
      orientation="v"
      stubV="8.5rem"
      stub={
        <div className="px-6">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-ink-2">
              {num(qty)} × {money(comp.price)}
              {free > 0 && <span className="font-semibold text-ink"> + {free} free</span>}
            </span>
            <span className="display tabular text-4xl">{money(lineTotal(comp, qty), { short: false })}</span>
          </div>
          <button type="button" onClick={add} className="btn btn-primary mt-3 w-full">
            Add {num(qty + free)} tickets to basket
          </button>
        </div>
      }
    >
      <div className="space-y-7 p-6">
        {comp.bundles && (
          <fieldset>
            <legend className="font-semibold">Bundles</legend>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {comp.bundles.map((b) => {
                const on = qty === b.buy;
                return (
                  <button
                    key={b.buy}
                    type="button"
                    disabled={b.buy > max}
                    onClick={() => setQty(b.buy)}
                    aria-pressed={on}
                    className={`rounded-md px-3 py-2.5 text-left transition-colors disabled:opacity-40 ${on ? "bg-ink text-map" : "bg-white/55 hover:bg-white/85"}`}
                  >
                    <span className="block font-semibold">Buy {b.buy}</span>
                    <span className={`text-sm ${on ? "text-map/80" : "text-ink-2"}`}>{b.free} free</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="qty" className="font-semibold">
              Number of tickets
            </label>
            <span className="text-sm text-ink-2">up to {num(Math.min(max, comp.maxPerPerson))}</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <button type="button" onClick={() => setQty((q) => clamp(q - 1))} aria-label="One fewer ticket" className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-white/55 hover:bg-white/85">
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
              className="display tabular h-12 w-full rounded-md bg-white/70 text-center text-3xl [appearance:textfield] focus:bg-white focus:outline-2 focus:outline-explorer [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button type="button" onClick={() => setQty((q) => clamp(q + 1))} aria-label="One more ticket" className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-white/55 hover:bg-white/85">
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
            className="mt-3 w-full accent-[#1d2b33]"
          />
        </div>

        <fieldset id="question" className={showError && answer === null ? "rounded-md outline-2 outline-offset-8 outline-explorer" : ""}>
          <legend className="font-semibold">{comp.question.text}</legend>
          <div className="mt-2.5 grid gap-1.5">
            {comp.question.options.map((o, i) => (
              <label
                key={o}
                className={`flex cursor-pointer items-center gap-3 rounded-md px-3.5 py-2.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-explorer ${answer === i ? "bg-ink text-map" : "bg-white/55 hover:bg-white/85"}`}
              >
                <input
                  type="radio"
                  name="answer"
                  className="sr-only"
                  checked={answer === i}
                  onChange={() => {
                    setAnswer(i);
                    setShowError(false);
                  }}
                />
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] ${answer === i ? "border-map" : "border-ink/50"}`}>
                  {answer === i && <Check size={12} strokeWidth={3.5} />}
                </span>
                {o}
              </label>
            ))}
          </div>
          {showError && answer === null ? (
            <p role="alert" className="mt-2.5 text-sm font-semibold text-explorer">
              Choose an answer to add your tickets.
            </p>
          ) : (
            <p className="mt-2.5 text-sm text-ink-2">Only correct answers go into the draw. Wrong answers can&rsquo;t be refunded.</p>
          )}
        </fieldset>

        {added !== null && (
          <p role="status" className="flex items-center justify-between gap-3 rounded-md bg-ink px-4 py-3 text-sm text-map">
            <span>{num(added)} tickets added to your basket.</span>
            <Link href="/basket" className="font-semibold underline underline-offset-4">
              Go to basket
            </Link>
          </p>
        )}
        <p className="text-sm text-ink-2">
          Or{" "}
          <Link href="/free-entry" className="link text-ink">
            enter free by post
          </Link>
          .
        </p>
      </div>
    </Ticket>
  );
}
