import Link from "next/link";
import { Suspense } from "react";
import { CompetitionGrid } from "@/components/CompetitionGrid";
import { Hero } from "@/components/Hero";
import { InstantWall } from "@/components/InstantWall";
import { LastChance } from "@/components/LastChance";
import { Odometer } from "@/components/Odometer";
import { Stamp } from "@/components/Stamp";
import { competitions, winners } from "@/config/competitions";
import { faq } from "@/config/faq";
import { site, stats } from "@/config/site";
import { num, shortDate } from "@/lib/format";

const steps = [
  { title: "Pick a prize", text: "Choose how many tickets you want. Bigger bundles come with free tickets." },
  { title: "Answer the question", text: "One question per competition. Correct answers go into the draw." },
  { title: "Scratch for instant wins", text: "After you pay, scratch to see your ticket numbers. Some win straight away." },
  { title: "Watch the draw", text: "Main prizes are drawn on the date shown, sold out or not, live on Facebook." },
];

export default function Home() {
  const featured = competitions.filter((c) => c.featured);
  const closing = [...competitions].sort((a, b) => a.drawAt.localeCompare(b.drawAt)).slice(0, 3);

  return (
    <>
      <Hero comps={featured} />
      <LastChance comps={closing} />

      <section id="competitions" aria-labelledby="comps-h" className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <h2 id="comps-h" className="display mb-5 text-6xl sm:text-7xl">
          Pick your prize
        </h2>
        <Suspense>
          <CompetitionGrid comps={competitions} />
        </Suspense>
      </section>

      <div className="mt-24">
        <InstantWall comps={competitions} />
      </div>

      <section aria-labelledby="winners-h" className="bg-[var(--color-paper-lemon)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <h2 id="winners-h" className="sr-only">
              Winners
            </h2>
            <p className="display text-[clamp(4rem,12vw,9rem)]">
              <Odometer value={stats.givenAway} prefix="£" />
            </p>
            <p className="mt-3 text-xl">
              given away to <strong>{num(stats.winners)} winners</strong> so far. Every one drawn live or published with the winning ticket.
            </p>
            <Link href="/winners" className="btn btn-quiet mt-6">
              See all winners
            </Link>
          </div>
          <ol className="space-y-3">
            {winners.slice(0, 4).map((w, i) => (
              <li key={`${w.name}-${w.ticket}`} className="tilt" style={{ "--tilt": `${[1, -1.2, 0.6, -0.4][i]}deg` } as React.CSSProperties}>
                <div className="ticket ticket-h flex items-stretch bg-white" style={{ "--stub": "7rem", "--paper": "#fff" } as React.CSSProperties}>
                  <div className="min-w-0 flex-1 px-4 py-3">
                    <p className="text-sm text-ink-2">
                      {shortDate(w.date)}, {w.name} from {w.town}
                    </p>
                    <p className="display mt-0.5 text-2xl">{w.prize}</p>
                  </div>
                  <div className="stub-h flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-ink-2">Ticket</span>
                    <span className="display tabular text-2xl">{num(w.ticket)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="how-h" className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
        <h2 id="how-h" className="display text-6xl sm:text-7xl">
          How it works
        </h2>
        <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="display block text-[7rem] leading-[0.8] text-[var(--color-water)]" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="display -mt-6 text-3xl">
                <span className="sr-only">Step {i + 1}: </span>
                {s.title}
              </h3>
              <p className="mt-2 text-ink-2">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Stamp tone="wood" angle={-3}>
            Free entry route
          </Stamp>
          <p className="text-ink-2">
            Prefer not to pay?{" "}
            <Link href="/free-entry" className="link text-ink">
              Enter any competition free by post
            </Link>
            , with the same chance of winning.
          </p>
        </div>
      </section>

      <section aria-labelledby="faq-h" className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 border-t-[3px] border-ink pt-8 lg:grid-cols-[1fr_3fr]">
          <div>
            <h2 id="faq-h" className="display text-5xl">
              Questions
            </h2>
            <Link href="/faq" className="link mt-4 inline-block">
              All questions
            </Link>
          </div>
          <div className="divide-y divide-rule border-y border-rule">
            {faq.slice(0, 5).map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                  {f.q}
                  <span className="text-2xl leading-none font-normal transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-2 max-w-[65ch] text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <p className="mt-10 text-sm text-ink-2 lg:ml-[25%]">
          {site.minAge}+ only. Please play responsibly.{" "}
          <Link href="/safer-play" className="link">
            Set limits or take a break
          </Link>
          .
        </p>
      </section>
    </>
  );
}
