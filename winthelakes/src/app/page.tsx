import Link from "next/link";
import { Suspense } from "react";
import { CompetitionGrid } from "@/components/CompetitionGrid";
import { LeadPrize } from "@/components/LeadPrize";
import { competitions, winners } from "@/config/competitions";
import { faq } from "@/config/faq";
import { site } from "@/config/site";
import { num, shortDate } from "@/lib/format";

const steps = [
  { title: "Pick a prize", text: "Choose how many tickets you want. Bigger bundles come with free tickets." },
  { title: "Answer the question", text: "One question per competition. Correct answers go into the draw." },
  { title: "Scratch for instant wins", text: "After you pay, scratch to see your ticket numbers. Some win straight away." },
  { title: "Watch the draw", text: "Main prizes are drawn on the date shown, sold out or not, live on Facebook." },
];

export default function Home() {
  // The first featured competition leads the page; the rest go in the grid.
  const lead = competitions.find((c) => c.featured) ?? competitions[0];
  const rest = competitions.filter((c) => c !== lead);
  return (
    <>
      <LeadPrize comp={lead} />

      <section id="competitions" aria-labelledby="comps-h" className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <h2 id="comps-h" className="display mb-5 text-5xl">
          Open competitions
        </h2>
        <Suspense>
          <CompetitionGrid comps={rest} />
        </Suspense>
      </section>

      <section aria-labelledby="how-h" className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 border-t-[3px] border-ink pt-8 lg:grid-cols-[1fr_3fr]">
          <h2 id="how-h" className="display text-5xl">
            How it works
          </h2>
          <ol className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title}>
                <span className="display text-6xl text-explorer">{i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-ink-2">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
        <p className="mt-8 text-ink-2 lg:ml-[25%]">
          Prefer not to pay?{" "}
          <Link href="/free-entry" className="link text-ink">
            Every competition can be entered free by post
          </Link>
          , with the same chance of winning.
        </p>
      </section>

      <section aria-labelledby="winners-h" className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 border-t-[3px] border-ink pt-8 lg:grid-cols-[1fr_3fr]">
          <div>
            <h2 id="winners-h" className="display text-5xl">
              Recent winners
            </h2>
            <Link href="/winners" className="link mt-4 inline-block">
              All winners
            </Link>
          </div>
          <ol className="divide-y divide-rule border-y border-rule">
            {winners.slice(0, 6).map((w) => (
              <li key={`${w.name}-${w.ticket}`} className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 py-4 sm:grid-cols-[7rem_1fr_auto] sm:items-baseline">
                <span className="text-sm text-ink-2 sm:order-none">{shortDate(w.date)}</span>
                <span className="col-span-2 sm:col-span-1">
                  <strong className="font-semibold">{w.name}</strong>, {w.town}, won {w.prize}
                </span>
                <span className="tabular row-start-1 text-right text-sm sm:row-auto">Ticket {num(w.ticket)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="about-h" className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 border-t-[3px] border-ink pt-8 lg:grid-cols-[1fr_3fr]">
          <h2 id="about-h" className="display text-5xl">
            Who we are
          </h2>
          <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
            <p className="text-lg md:col-span-2 max-w-[60ch]">
              We&rsquo;re a small team based in Windermere. We started Win the Lakes to give away the kind of weeks we&rsquo;d want to win: a lodge on the water, a
              boat for the day, a Defender for the passes.
            </p>
            <div>
              <h3 className="font-semibold">Drawn on time, every time</h3>
              <p className="mt-1 text-ink-2">We never extend a draw date. If a competition doesn&rsquo;t sell out, it&rsquo;s still drawn when we said it would be.</p>
            </div>
            <div>
              <h3 className="font-semibold">Every result published</h3>
              <p className="mt-1 text-ink-2">
                The winning ticket, the winner&rsquo;s name and town, and a recording of the draw go on the{" "}
                <Link href="/draws" className="link text-ink">
                  results page
                </Link>
                .
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Paid within a day</h3>
              <p className="mt-1 text-ink-2">Cash prizes and instant wins are paid by bank transfer the next working day.</p>
            </div>
            <div>
              <h3 className="font-semibold">Some of every ticket stays local</h3>
              <p className="mt-1 text-ink-2">We give to fell rescue teams and footpath repair across the national park.</p>
            </div>
          </div>
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
