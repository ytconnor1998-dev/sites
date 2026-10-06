import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/Section";
import { competitions, drawResults } from "@/config/competitions";
import { drawDate, num, shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Draw results & entry lists", description: "Results of every draw with links to the live-draw videos, and the entry list for every live competition." };

const first = ["A", "B", "C", "D", "E", "G", "H", "J", "K", "L", "M", "N", "P", "R", "S", "T", "W"];
const last = ["Atkinson", "Brown", "Clarke", "Dixon", "Fell", "Graham", "Hodgson", "Irving", "Jackson", "Lowther", "Moore", "Nicholson", "Robinson", "Stephenson", "Taylor", "Wilson"];

/** DEMO: a repeatable sample of entries. On the live site this comes from your orders. */
function sampleEntries(slug: string, sold: number, count = 30) {
  let seed = [...slug].reduce((n, ch) => n * 31 + ch.charCodeAt(0), 7) >>> 0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  return Array.from({ length: Math.min(count, sold) }, (_, i) => ({
    ticket: Math.floor((i / count) * sold) + 1 + Math.floor(rand() * (sold / count)),
    name: `${first[Math.floor(rand() * first.length)]}. ${last[Math.floor(rand() * last.length)]}`,
  }));
}

export default function DrawsPage() {
  return (
    <>
      <PageHero title="Draw results" intro="Every draw, every winning number, and a recording of every live draw. Entry lists for live competitions are below." />
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="overflow-x-auto border-y-[3px] border-ink">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-rule text-ink-2">
              <tr>
                <th className="px-5 py-4 font-medium">Date</th>
                <th className="px-5 py-4 font-medium">Competition</th>
                <th className="px-5 py-4 font-medium">Tickets sold</th>
                <th className="px-5 py-4 font-medium">Winning ticket</th>
                <th className="px-5 py-4 font-medium">Winner</th>
                <th className="px-5 py-4 font-medium">
                  <span className="sr-only">Video</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {drawResults.map((d) => (
                <tr key={`${d.date}-${d.competition}`}>
                  <td className="px-5 py-4 whitespace-nowrap text-ink-2">{shortDate(d.date)}</td>
                  <td className="px-5 py-4 font-semibold">{d.competition}</td>
                  <td className="tabular px-5 py-4">{num(d.ticketsSold)}</td>
                  <td className="px-5 py-4">
                    <span className="tabular paper-lemon rounded-[3px] bg-[var(--paper)] px-2 py-0.5 font-semibold">{num(d.winningTicket)}</span>
                  </td>
                  <td className="px-5 py-4">{d.winner}</td>
                  <td className="px-5 py-4">
                    {d.video && (
                      <a href={d.video} target="_blank" rel="noopener" className="link whitespace-nowrap">
                        Watch the draw
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 id="entry-lists" className="display mt-20 text-5xl">
          Entry lists
        </h2>
        <p className="mt-3 max-w-2xl text-ink-2">
          Every ticket sold, with the entrant&rsquo;s initial and surname. The full list is published when a competition closes, before the draw.
        </p>
        <div className="mt-6 border-t-[3px] border-ink">
          {competitions.map((c) => (
            <details key={c.slug} className="group border-b border-rule">
              <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-3 py-4">
                <span>
                  <span className="display text-2xl">{c.title}</span>
                  <span className="ml-3 text-sm text-ink-2">Draw {drawDate(c.drawAt)}</span>
                </span>
                <span className="text-sm text-ink-2">
                  {num(c.sold)} entries <span className="ml-2 inline-block text-xl text-ink transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </span>
              </summary>
              <div className="pb-6">
                <ol className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  {sampleEntries(c.slug, c.sold).map((e) => (
                    <li key={e.ticket} className="flex justify-between border-b border-rule/60 py-1">
                      <span className="tabular text-ink-2">{num(e.ticket)}</span>
                      <span>{e.name}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 text-xs text-ink-2">
                  Showing a sample. <Link href={`/competitions/${c.slug}`} className="link">View competition</Link>
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}
