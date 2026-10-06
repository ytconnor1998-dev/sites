import { CalendarClock, Check, PoundSterling, Ticket, Users, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, CompetitionCard, DrawBadge } from "@/components/CompetitionCard";
import { CountdownBoxes } from "@/components/Countdown";
import { EntryPanel } from "@/components/EntryPanel";
import { PrizeArt } from "@/components/PrizeArt";
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
  const related = competitions.filter((c) => c.slug !== comp.slug).slice(0, 4);

  return (
    <>
      <div className="water border-b border-line">
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <nav aria-label="Breadcrumb" className="eyebrow text-[0.65rem] text-fog">
            <Link href="/competitions" className="hover:text-lake">
              Competitions
            </Link>{" "}
            /{" "}
            <Link href={`/competitions?c=${comp.category}`} className="hover:text-lake">
              {category?.label}
            </Link>
          </nav>
        </div>
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-12">
          <div id="prize" className="lg:sticky lg:top-32 lg:self-start">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] ring-1 ring-white/10">
              <PrizeArt comp={comp} iconSize={120} />
              <div className="absolute top-4 left-4 flex gap-2">
                <DrawBadge comp={comp} />
                {comp.wasPrice && <Badge tone="ember">Sale</Badge>}
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [PoundSterling, "Prize value", money(comp.value)],
                [Ticket, "Max tickets", num(comp.maxTickets)],
                [Users, "Per person", num(comp.maxPerPerson)],
                [Zap, "Instant wins", iw ? num(iw) : "None"],
              ].map(([Icon, label, value]) => {
                const I = Icon as typeof Ticket;
                return (
                  <div key={label as string} className="card p-4">
                    <I size={16} className="text-lake" />
                    <dt className="eyebrow mt-2 text-[0.58rem] text-fog">{label as string}</dt>
                    <dd className="display mt-0.5 text-lg">{value as string}</dd>
                  </div>
                );
              })}
            </dl>
          </div>

          <div>
            <h1 className="display text-4xl sm:text-5xl">{comp.title}</h1>
            <p className="mt-3 text-lg text-fog">{comp.teaser}</p>
            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              {comp.wasPrice && <span className="text-xl text-fog line-through">{money(comp.wasPrice)}</span>}
              <span className="display normal-case text-5xl text-lantern">{money(comp.price)}</span>
              <span className="eyebrow text-fog">per ticket</span>
              {comp.cashAlternative && (
                <span className="rounded-full border border-lantern/40 px-3 py-1 text-sm font-bold text-lantern">or {money(comp.cashAlternative)} cash</span>
              )}
            </div>

            <div className="mt-6">
              <p className="mb-2 flex items-center gap-2 text-sm text-fog">
                <CalendarClock size={15} /> Draw: <strong className="text-mist">{drawDate(comp.drawAt)}</strong>
                {comp.drawType === "live" ? " · live on Facebook" : " · automatic draw"}
              </p>
              <CountdownBoxes drawAt={comp.drawAt} />
            </div>
            <div className="mt-6">
              <Progress sold={comp.sold} max={comp.maxTickets} />
            </div>

            <div className="mt-8">
              <EntryPanel comp={comp} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <section aria-labelledby="about-h">
          <h2 id="about-h" className="display text-3xl">
            The prize
          </h2>
          <div className="mt-4 space-y-4 leading-relaxed text-fog">
            {comp.description.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {comp.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2.5 rounded-xl border border-line bg-deep px-4 py-3 text-sm">
                <Check size={16} className="mt-0.5 shrink-0 text-lake" /> {h}
              </li>
            ))}
          </ul>
          <h3 className="display mt-10 text-2xl">How the draw works</h3>
          <p className="mt-3 leading-relaxed text-fog">
            {comp.drawType === "live"
              ? "The winning ticket is picked with a certified random number generator, streamed live on our Facebook page at the time above."
              : "The winning ticket is picked automatically by a certified random number generator at the time above, and published on the draw results page."}{" "}
            It&rsquo;s drawn on time even if it doesn&rsquo;t sell out. Only entries with the correct answer are included. Postal entries are included on equal terms.
          </p>
        </section>

        {comp.instantWins && (
          <section aria-labelledby="iw-h">
            <div className="flex items-baseline justify-between">
              <h2 id="iw-h" className="display text-3xl">
                Instant wins
              </h2>
              <span className="eyebrow text-fog">
                {instantWinsFound(comp)}/{iw} found
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {comp.instantWins.map((w) => (
                <details key={w.prize} className="card group overflow-hidden" open={w.tickets.length <= 8}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                    <span className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-lantern/15 text-lantern">
                        <Zap size={18} />
                      </span>
                      <span>
                        <span className="block font-extrabold">{w.prize}</span>
                        <span className="text-xs text-fog">
                          {w.claimed.length}/{w.tickets.length} found
                        </span>
                      </span>
                    </span>
                    <span className="text-xl text-lake transition-transform group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <ul className="flex flex-wrap gap-2 border-t border-line p-4">
                    {w.tickets.map((t) => {
                      const won = w.claimed.includes(t);
                      return (
                        <li
                          key={t}
                          className={`tabular rounded-lg px-2.5 py-1 text-sm font-bold ${won ? "bg-white/5 text-fog line-through" : "bg-lake/10 text-lake ring-1 ring-lake/30"}`}
                          title={won ? "Already won" : "Still up for grabs"}
                        >
                          #{num(t)}
                          <span className="sr-only">{won ? " (won)" : " (available)"}</span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ))}
            </div>
            <p className="mt-3 text-xs text-fog">Crossed-out numbers have been won. Your ticket numbers are revealed right after checkout.</p>
          </section>
        )}
      </div>

      <section aria-labelledby="more-h" className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <h2 id="more-h" className="display text-3xl">
          You might also like
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((c) => (
            <CompetitionCard key={c.slug} comp={c} />
          ))}
        </div>
      </section>
    </>
  );
}
