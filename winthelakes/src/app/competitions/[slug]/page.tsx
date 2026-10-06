import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompetitionCard, drawLabel } from "@/components/CompetitionCard";
import { CountdownBoxes } from "@/components/Countdown";
import { EntryPanel } from "@/components/EntryPanel";
import { PrizeImage } from "@/components/PrizeImage";
import { Progress } from "@/components/Progress";
import { categories, competitions, getCompetition, instantWinCount, instantWinsFound } from "@/config/competitions";
import { drawDate, money, num } from "@/lib/format";

export function generateStaticParams() {
  return competitions.map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = getCompetition((await params).slug);
  if (!c) return {};
  return { title: `Win ${c.title}`, description: `${c.teaser}. Tickets ${money(c.price)}. ${c.description[0]}` };
}

export default async function CompetitionPage({ params }: { params: Promise<{ slug: string }> }) {
  const comp = getCompetition((await params).slug);
  if (!comp) notFound();

  const category = categories.find((c) => c.id === comp.category);
  const iw = instantWinCount(comp);
  const related = competitions.filter((c) => c.slug !== comp.slug).slice(0, 3);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-2">
          <Link href="/competitions" className="hover:text-ink hover:underline">
            Competitions
          </Link>
          <span aria-hidden="true"> / </span>
          <Link href={`/competitions?c=${comp.category}`} className="hover:text-ink hover:underline">
            {category?.label}
          </Link>
        </nav>
      </div>

      <div className="mx-auto mt-5 grid max-w-6xl gap-x-12 gap-y-10 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:grid-rows-[auto_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md lg:col-start-1 lg:row-start-1">
          <PrizeImage seed={comp.slug} image={comp.image} alt={comp.title} />
        </div>

        {/* On phones the entry panel comes straight after the photo; on desktop it sits alongside, sticky. */}
        <div className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <h1 className="display text-5xl sm:text-6xl">{comp.title}</h1>
          <p className="mt-3 text-lg text-ink-2">{comp.teaser}</p>
          <p className="mt-5 text-sm">
            {drawLabel(comp)}, <strong className="font-semibold">{drawDate(comp.drawAt)}</strong>
          </p>
          <div className="mt-2">
            <CountdownBoxes drawAt={comp.drawAt} />
          </div>
          <div className="mt-5">
            <Progress sold={comp.sold} max={comp.maxTickets} />
          </div>
          <div className="mt-8">
            <EntryPanel comp={comp} />
          </div>
        </div>

        <div className="lg:col-start-1 lg:row-start-2">
          <section id="prize" aria-labelledby="about-h">
            <h2 id="about-h" className="display text-4xl">
              The prize
            </h2>
            <div className="mt-3 max-w-[62ch] space-y-3 text-[1.05rem] leading-relaxed">
              {comp.description.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <ul className="mt-5 max-w-[62ch] divide-y divide-rule border-y border-rule">
              {comp.highlights.map((h) => (
                <li key={h} className="py-2.5">
                  {h}
                </li>
              ))}
            </ul>
            <dl className="mt-8 grid max-w-[62ch] grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
              <div>
                <dt className="text-sm text-ink-2">Prize value</dt>
                <dd className="display text-3xl">{money(comp.value)}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-2">Tickets</dt>
                <dd className="display text-3xl">{num(comp.maxTickets)}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-2">Max per person</dt>
                <dd className="display text-3xl">{num(comp.maxPerPerson)}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-2">Your odds with 10</dt>
                <dd className="display text-3xl">1 in {num(Math.round(comp.maxTickets / 10))}</dd>
              </div>
            </dl>

            <h3 className="mt-10 text-lg font-semibold">How it&rsquo;s drawn</h3>
            <p className="mt-2 max-w-[62ch] text-ink-2">
              {comp.drawType === "live"
                ? "A certified random number generator picks the winning ticket, streamed live on our Facebook page at the time shown."
                : "A certified random number generator picks the winning ticket automatically at the time shown, and the result goes on the results page."}{" "}
              It&rsquo;s drawn on time even if it hasn&rsquo;t sold out. Only correct answers are entered, and postal entries are included on equal terms.
            </p>
          </section>

          {comp.instantWins && (
            <section aria-labelledby="iw-h" className="mt-12">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="iw-h" className="display text-4xl">
                  Instant wins
                </h2>
                <p className="text-sm text-ink-2">
                  {instantWinsFound(comp)} of {iw} found
                </p>
              </div>
              <p className="mt-2 max-w-[62ch] text-ink-2">If one of your ticket numbers is on this list, you win that prize as soon as you&rsquo;ve paid. Crossed-out numbers have already been won.</p>
              <div className="mt-5 divide-y divide-rule border-y border-rule">
                {comp.instantWins.map((w) => (
                  <div key={w.prize} className="grid gap-3 py-4 sm:grid-cols-[12rem_1fr]">
                    <p>
                      <span className="font-semibold">{w.prize}</span>
                      <span className="block text-sm text-ink-2">
                        {w.claimed.length} of {w.tickets.length} won
                      </span>
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {w.tickets.map((t) => {
                        const won = w.claimed.includes(t);
                        return (
                          <li
                            key={t}
                            className={`tabular rounded-[3px] px-2 py-0.5 text-sm ${won ? "text-ink-2 line-through" : `paper-${comp.paper} bg-[var(--paper)] font-semibold`}`}
                          >
                            {num(t)}
                            <span className="sr-only">{won ? " (won)" : " (still to be won)"}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

      </div>

      <section aria-labelledby="more-h" className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
        <h2 id="more-h" className="display border-t-[3px] border-ink pt-6 text-4xl">
          Also drawing soon
        </h2>
        <div className="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((c) => (
            <CompetitionCard key={c.slug} comp={c} />
          ))}
        </div>
      </section>
    </>
  );
}
