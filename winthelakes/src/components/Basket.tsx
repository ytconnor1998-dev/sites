"use client";

import { AlertTriangle, Gift, Lock, Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { creditValue, getAccount, isAtLeast, monthKey, onBreak, spentThisMonth, updateAccount, useAccount } from "@/lib/account";
import { basketLines, clearBasket, removeFromBasket, setQty, useBasket } from "@/lib/basket";
import { placeOrder } from "@/lib/entries";
import { money, num } from "@/lib/format";
import { site } from "@/config/site";
import { PrizeArt } from "./PrizeArt";

export function Basket() {
  const items = useBasket();
  const account = useAccount();
  const router = useRouter();
  const lines = basketLines(items);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const subtotal = lines.reduce((n, l) => n + l.total, 0);
  const creditUsed = Math.min(account.credit, subtotal);
  const toPay = subtotal - creditUsed;
  const tickets = lines.reduce((n, l) => n + l.qty + l.free, 0);
  const wrong = lines.filter((l) => l.answer !== l.comp.question.answer);
  const overLimit = account.monthlyLimit > 0 && spentThisMonth(account) + toPay > account.monthlyLimit;
  const resting = onBreak(account);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    if (!isAtLeast(String(f.get("dob")), site.minAge)) return setError(`You must be ${site.minAge} or over to enter.`);
    if (resting) return setError("You're on a break from entering. You can change this in My account once it ends.");
    if (overLimit) return setError("This order would go over your monthly spend limit. You can review your limit in My account.");

    setBusy(true);
    // DEMO: no payment is taken. On the live site this is where the payment provider's
    // checkout runs, and the server allocates tickets only after payment succeeds.
    const { orderId, entries } = placeOrder(lines);
    const wonCredit = entries.flatMap((x) => x.instantWins).reduce((n, w) => n + creditValue(w.prize), 0);
    const a = getAccount();
    updateAccount({
      name: String(f.get("name")),
      email: String(f.get("email")),
      credit: a.credit - creditUsed + wonCredit,
      spent: { ...a.spent, [monthKey()]: (a.spent[monthKey()] ?? 0) + toPay },
    });
    clearBasket();
    router.push(`/order?id=${orderId}`);
  }

  if (lines.length === 0) {
    return (
      <div className="card mx-auto max-w-xl p-10 text-center">
        <p className="display text-3xl">Your basket is empty</p>
        <p className="mt-3 text-fog">Pick a prize, answer the question, and your tickets will appear here.</p>
        <Link href="/competitions" className="btn btn-primary mt-6">
          Browse competitions
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <ul className="space-y-4">
        {lines.map((l) => {
          const max = l.comp.maxPerPerson;
          const right = l.answer === l.comp.question.answer;
          return (
            <li key={l.slug} className="card flex gap-4 p-4 sm:p-5">
              <Link href={`/competitions/${l.slug}`} className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl sm:w-32">
                <PrizeArt comp={l.comp} iconSize={30} />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/competitions/${l.slug}`} className="display text-lg leading-tight hover:text-lake sm:text-xl">
                    {l.comp.title}
                  </Link>
                  <button type="button" onClick={() => removeFromBasket(l.slug)} aria-label={`Remove ${l.comp.title}`} className="text-fog hover:text-ember">
                    <Trash2 size={18} />
                  </button>
                </div>
                <p className="mt-1 text-sm text-fog">
                  Your answer: <span className={right ? "text-mist" : "font-bold text-ember"}>{l.comp.question.options[l.answer]}</span>
                </p>
                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setQty(l.slug, l.qty - 1)} aria-label="One fewer ticket" className="grid h-9 w-9 place-items-center rounded-full border border-line-2 hover:border-lake">
                      <Minus size={15} />
                    </button>
                    <span className="tabular w-10 text-center font-bold" aria-label={`${l.qty} tickets`}>
                      {l.qty}
                    </span>
                    <button type="button" disabled={l.qty >= max} onClick={() => setQty(l.slug, l.qty + 1)} aria-label="One more ticket" className="grid h-9 w-9 place-items-center rounded-full border border-line-2 hover:border-lake disabled:opacity-40">
                      <Plus size={15} />
                    </button>
                    {l.free > 0 && (
                      <span className="ml-1 flex items-center gap-1 text-sm font-bold text-lantern">
                        <Gift size={14} /> +{l.free} free
                      </span>
                    )}
                  </div>
                  <span className="display normal-case text-2xl">{money(l.total, { short: false })}</span>
                </div>
              </div>
            </li>
          );
        })}
        {wrong.length > 0 && (
          <li className="flex gap-3 rounded-2xl border border-ember/50 bg-ember/10 p-4 text-sm">
            <AlertTriangle size={18} className="shrink-0 text-ember" />
            <span>
              Double-check your answer{wrong.length > 1 ? "s" : ""}. Tickets with a wrong answer aren&rsquo;t entered into the draw. To change it, remove the competition and add it
              again.
            </span>
          </li>
        )}
      </ul>

      <form onSubmit={submit} className="card h-fit space-y-5 p-6 lg:sticky lg:top-32">
        <h2 className="display text-2xl">Checkout</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-fog">Tickets</dt>
            <dd className="tabular">{num(tickets)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fog">Subtotal</dt>
            <dd className="tabular">{money(subtotal, { short: false })}</dd>
          </div>
          {creditUsed > 0 && (
            <div className="flex justify-between text-lake">
              <dt>Site credit</dt>
              <dd className="tabular">−{money(creditUsed, { short: false })}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <dt className="font-bold">To pay</dt>
            <dd className="display normal-case text-3xl text-lantern">{money(toPay, { short: false })}</dd>
          </div>
        </dl>

        <div className="grid gap-3">
          <Field label="Full name" name="name" autoComplete="name" defaultValue={account.name} />
          <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={account.email} />
          <Field label="Mobile" name="phone" type="tel" autoComplete="tel" />
          <Field label="Date of birth" name="dob" type="date" autoComplete="bday" />
        </div>

        <label className="flex gap-3 text-sm text-fog">
          <input type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#2ee6d0]" />
          <span>
            I&rsquo;m {site.minAge}+, a UK resident, and I accept the{" "}
            <Link href="/terms" className="text-mist underline underline-offset-2">
              terms
            </Link>
            .
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-ember/15 p-3 text-sm font-bold text-ember">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary w-full !py-4 !text-base">
          <Lock size={17} /> {toPay === 0 ? "Confirm entry" : `Pay ${money(toPay, { short: false })}`}
        </button>
        <p className="rounded-xl border border-dashed border-line-2 p-3 text-center text-xs text-fog">
          <strong className="text-lantern">Demo mode:</strong> no payment is taken. Card payments are added when the site goes live.
        </p>
      </form>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="eyebrow text-[0.6rem] text-fog">{label}</span>
      <input required {...props} className="mt-1.5 w-full rounded-xl border border-line-2 bg-deep-2 px-4 py-3 focus:border-lake focus:outline-none" />
    </label>
  );
}
