import { HandCoins, HelpCircle, Radio, ShieldCheck, Sparkles, Ticket, Trees, Trophy } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CompetitionGrid } from "@/components/CompetitionGrid";
import { HeroSlider } from "@/components/HeroSlider";
import { SectionHeading } from "@/components/Section";
import { WinnersTicker } from "@/components/WinnersTicker";
import { competitions, winners } from "@/config/competitions";
import { faq } from "@/config/faq";
import { site, stats } from "@/config/site";
import { num } from "@/lib/format";
import { PrizeArt } from "@/components/PrizeArt";

const steps = [
  { icon: Ticket, title: "Pick your prize", text: "Choose a competition and how many tickets you want. Bigger bundles get free tickets." },
  { icon: HelpCircle, title: "Answer the question", text: "One simple question. Get it right and your tickets go into the draw." },
  { icon: Sparkles, title: "Reveal instant wins", text: "After checkout, reveal your ticket numbers. Matching numbers win straight away." },
  { icon: Radio, title: "Watch the live draw", text: "Main prizes are drawn live on Facebook. Winners are announced the same night." },
];

export default function Home() {
  const featured = competitions.filter((c) => c.featured);
  return (
    <>
      <HeroSlider comps={featured} />

      <div className="mt-8">
        <WinnersTicker />
      </div>

      <section id="competitions" aria-labelledby="comps-h" className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Open now" title="Live competitions" id="comps-h">
          <Link href="/competitions" className="btn btn-ghost self-start md:self-auto">
            View all
          </Link>
        </SectionHeading>
        <Suspense>
          <CompetitionGrid comps={competitions} />
        </Suspense>
      </section>

      <section aria-label="Our numbers" className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line lg:grid-cols-4">
          {[
            ["Given away in prizes", `£${num(stats.givenAway)}`],
            ["Happy winners", num(stats.winners)],
            ["Donated to Lakes causes", `£${num(stats.charity)}`],
            ["Trustpilot rating", `${stats.trustpilot} / 5`],
          ].map(([label, value]) => (
            <div key={label} className="bg-deep px-6 py-8">
              <dt className="eyebrow text-[0.62rem] text-fog">{label}</dt>
              <dd className="display mt-2 text-3xl text-lantern sm:text-4xl">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="how-h" className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Simple as that" title="How it works" id="how-h">
          <Link href="/how-it-works" className="btn btn-ghost self-start md:self-auto">
            Full details
          </Link>
        </SectionHeading>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="card relative p-6">
              <span className="display absolute top-5 right-6 text-5xl text-white/5">{i + 1}</span>
              <s.icon className="text-lake" size={28} strokeWidth={1.6} />
              <h3 className="display mt-5 text-xl">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fog">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="winners-h" className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Real people, real prizes" title="Recent winners" id="winners-h">
          <Link href="/winners" className="btn btn-ghost self-start md:self-auto">
            All winners
          </Link>
        </SectionHeading>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {winners.slice(0, 4).map((w) => (
            <figure key={`${w.name}-${w.ticket}`} className="card overflow-hidden">
              <div className="relative aspect-[5/4]">
                <PrizeArt comp={{ art: w.art, title: w.prize }} iconSize={44} />
                <span className="absolute top-3 left-3 rounded-full bg-lantern px-2.5 py-1 text-[0.62rem] font-extrabold tracking-wider text-night uppercase">
                  Ticket #{num(w.ticket)}
                </span>
              </div>
              <figcaption className="p-5">
                <p className="display text-lg">{w.prize}</p>
                <p className="mt-1 text-sm text-fog">
                  {w.name}, {w.town}
                </p>
                {w.quote && <blockquote className="mt-3 border-l-2 border-lake pl-3 text-sm italic">“{w.quote}”</blockquote>}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section aria-labelledby="trust-h" className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <div className="card water grid gap-10 overflow-hidden p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-lake">Why Win the Lakes</p>
            <h2 id="trust-h" className="display mt-2 text-4xl sm:text-5xl">
              Born in the fells. Fair to the last ticket.
            </h2>
            <p className="mt-5 max-w-md text-fog">
              We&rsquo;re a small team from Cumbria. Every competition is drawn on time whether it sells out or not, every live draw is streamed, and a slice of
              every ticket goes back into the Lake District.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              [ShieldCheck, "Always drawn on time", "We never extend a draw date. Sold out or not, it's drawn."],
              [Radio, "Live on Facebook", "Watch the number come out of the random generator in real time."],
              [HandCoins, "Paid within 24 hours", "Cash prizes and instant wins hit your bank the next day."],
              [Trees, "Giving back", "We donate to fell-rescue, footpath and lake conservation charities."],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <li key={title as string} className="rounded-2xl border border-line bg-night/40 p-5">
                  <I size={22} className="text-lantern" />
                  <h3 className="mt-3 font-extrabold">{title as string}</h3>
                  <p className="mt-1 text-sm text-fog">{text as string}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section aria-labelledby="faq-h" className="mx-auto mt-24 max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow="Questions" title="Good to know" id="faq-h" />
        <div className="divide-y divide-line rounded-3xl border border-line bg-deep">
          {faq.slice(0, 5).map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                {f.q}
                <span className="text-xl text-lake transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 text-fog">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-center">
          <Link href="/faq" className="font-bold text-lake underline-offset-4 hover:underline">
            All questions
          </Link>
          <span className="text-fog"> · </span>
          <Link href="/free-entry" className="font-bold text-lake underline-offset-4 hover:underline">
            Enter for free by post
          </Link>
        </p>
      </section>

      <section aria-label="Join" className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-lake px-8 py-12 text-night sm:px-12">
          <Trophy className="absolute -right-6 -bottom-8 text-night/10" size={220} aria-hidden="true" />
          <h2 className="display max-w-2xl text-4xl sm:text-5xl">Your Lakes escape could be one ticket away.</h2>
          <p className="mt-4 max-w-xl font-semibold">Tickets from 25p. {site.minAge}+ only. Free entry route available.</p>
          <Link href="/competitions" className="btn mt-7 bg-night text-mist hover:bg-deep">
            See all prizes
          </Link>
        </div>
      </section>
    </>
  );
}
