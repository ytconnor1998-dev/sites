"use client";

import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { creditValue, getAccount, isAtLeast, monthKey, onBreak, spentThisMonth, updateAccount, useAccount } from "@/lib/account";
import { basketLines, clearBasket, removeFromBasket, setQty, useBasket } from "@/lib/basket";
import { placeOrder } from "@/lib/entries";
import { money, num } from "@/lib/format";
import { site } from "@/config/site";
import { PrizeImage } from "./PrizeImage";
import { Ticket } from "./Ticket";

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
      <div className="max-w-xl">
        <p className="text-lg">Your basket is empty. Pick a prize and answer its question, and your tickets will appear here.</p>
        <Link href="/competitions" className="btn btn-primary mt-6">
          Browse competitions
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <ul className="space-y-5">
        {lines.map((l) => {
          const max = l.comp.maxPerPerson;
          const right = l.answer === l.comp.question.answer;
          return (
            <li key={l.slug}>
              <Ticket
                paper={l.comp.paper}
                orientation="r"
                stubW="9rem"
                stubV="4rem"
                stub={
                  <div className="flex items-center justify-between gap-2 px-5 sm:flex-col sm:items-end">
                    <span className="display tabular text-3xl">{money(l.total, { short: false })}</span>
                    <button type="button" onClick={() => removeFromBasket(l.slug)} className="text-sm text-ink-2 underline underline-offset-2 hover:text-ink">
                      Remove<span className="sr-only"> {l.comp.title}</span>
                    </button>
                  </div>
                }
              >
                <div className="flex gap-4 p-3 pr-5">
                  <Link href={`/competitions/${l.slug}`} className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-[3px] sm:w-28">
                    <PrizeImage seed={l.slug} image={l.comp.image} alt="" />
                  </Link>
                  <div className="min-w-0 py-1">
                    <Link href={`/competitions/${l.slug}`} className="display text-2xl hover:underline">
                      {l.comp.title}
                    </Link>
                    <p className="mt-1 text-sm">
                      <span className="text-ink-2">Your answer:</span> {l.comp.question.options[l.answer]}
                      {!right && <strong className="ml-1 font-semibold text-explorer">(check this)</strong>}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <button type="button" onClick={() => setQty(l.slug, l.qty - 1)} aria-label="One fewer ticket" className="grid h-8 w-8 place-items-center rounded-md bg-white/60 hover:bg-white">
                        <Minus size={14} />
                      </button>
                      <span className="tabular w-9 text-center font-semibold">{l.qty}</span>
                      <button type="button" disabled={l.qty >= max} onClick={() => setQty(l.slug, l.qty + 1)} aria-label="One more ticket" className="grid h-8 w-8 place-items-center rounded-md bg-white/60 hover:bg-white disabled:opacity-40">
                        <Plus size={14} />
                      </button>
                      <span className="text-sm text-ink-2">
                        tickets{l.free > 0 && <>, plus {l.free} free</>}
                      </span>
                    </div>
                  </div>
                </div>
              </Ticket>
            </li>
          );
        })}
        {wrong.length > 0 && (
          <li className="border-l-[3px] border-explorer pl-4 text-sm">
            Tickets with a wrong answer aren&rsquo;t entered into the draw. To change an answer, remove the competition and add it again.
          </li>
        )}
      </ul>

      <form onSubmit={submit} className="h-fit space-y-5 rounded-md bg-sheet p-6 shadow-[0_1px_0_#1d2b3326] lg:sticky lg:top-24">
        <h2 className="display text-4xl">Checkout</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-2">Tickets</dt>
            <dd className="tabular">{num(tickets)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-2">Subtotal</dt>
            <dd className="tabular">{money(subtotal, { short: false })}</dd>
          </div>
          {creditUsed > 0 && (
            <div className="flex justify-between text-wood">
              <dt>Site credit</dt>
              <dd className="tabular">−{money(creditUsed, { short: false })}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-rule pt-3">
            <dt className="font-bold">To pay</dt>
            <dd className="display normal-case text-3xl text-explorer">{money(toPay, { short: false })}</dd>
          </div>
        </dl>

        <div className="grid gap-3">
          <Field label="Full name" name="name" autoComplete="name" defaultValue={account.name} />
          <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={account.email} />
          <Field label="Mobile" name="phone" type="tel" autoComplete="tel" />
          <Field label="Date of birth" name="dob" type="date" autoComplete="bday" />
        </div>

        <label className="flex gap-3 text-sm">
          <input type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#1d2b33]" />
          <span>
            I&rsquo;m {site.minAge}+, a UK resident, and I accept the{" "}
            <Link href="/terms" className="link">
              terms
            </Link>
            .
          </span>
        </label>

        {error && (
          <p role="alert" className="border-l-[3px] border-explorer pl-3 text-sm font-semibold">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary w-full">
          {toPay === 0 ? "Confirm entry" : `Pay ${money(toPay, { short: false })}`}
        </button>
        <p className="text-sm text-ink-2">This is a demo: no payment is taken. Card payments are added when the site goes live.</p>
      </form>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input required {...props} className="mt-1 w-full rounded-md border border-ink/25 bg-white px-3.5 py-2.5 focus:border-ink focus:outline-2 focus:outline-explorer" />
    </label>
  );
}
