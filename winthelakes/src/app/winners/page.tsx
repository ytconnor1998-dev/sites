import type { Metadata } from "next";
import { PageHero } from "@/components/Section";
import { winners } from "@/config/competitions";
import { stats } from "@/config/site";
import { num, shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Winners", description: "Every Win the Lakes winner, with their ticket number and the date they won." };

export default function WinnersPage() {
  return (
    <>
      <PageHero title="Winners" intro={`${num(stats.winners)} people have won with us so far, and £${num(stats.givenAway)} in prizes. Here are the latest.`} />
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <ol className="divide-y divide-rule border-y-[3px] border-ink">
          {winners.map((w) => (
            <li key={`${w.name}-${w.ticket}`} className="grid gap-x-8 gap-y-2 py-6 md:grid-cols-[8rem_1fr_1.2fr]">
              <p className="text-sm text-ink-2">
                {shortDate(w.date)}
                <span className="tabular block text-ink">Ticket {num(w.ticket)}</span>
              </p>
              <div>
                <p className="display text-3xl">{w.prize}</p>
                <p className="mt-1">
                  {w.name}, {w.town}
                </p>
              </div>
              {w.quote ? <blockquote className="max-w-[45ch] text-lg italic">&ldquo;{w.quote}&rdquo;</blockquote> : <span />}
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
