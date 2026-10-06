import { PlayCircle } from "lucide-react";
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
      <PageHero eyebrow="Fair and transparent" title="Draw results" intro="Every draw, every winning number, and a recording of every live draw. Entry lists for live competitions are below." />
      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="eyebrow border-b border-line text-[0.62rem] text-fog">
              <tr>
                <th className="px-5 py-4 font-bold">Date</th>
                <th className="px-5 py-4 font-bold">Competition</th>
                <th className="px-5 py-4 font-bold">Tickets sold</th>
                <th className="px-5 py-4 font-bold">Winning ticket</th>
                <th className="px-5 py-4 font-bold">Winner</th>
                <th className="px-5 py-4 font-bold">
                  <span className="sr-only">Video</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {drawResults.map((d) => (
                <tr key={`${d.date}-${d.competition}`}>
                  <td className="px-5 py-4 whitespace-nowrap text-fog">{shortDate(d.date)}</td>
                  <td className="px-5 py-4 font-bold">{d.competition}</td>
                  <td className="tabular px-5 py-4">{num(d.ticketsSold)}</td>
                  <td className="px-5 py-4">
                    <span className="tabular rounded-lg bg-lantern px-2.5 py-1 font-extrabold text-night">#{num(d.winningTicket)}</span>
                  </td>
                  <td className="px-5 py-4">{d.winner}</td>
                  <td className="px-5 py-4">
                    {d.video && (
                      <a href={d.video} target="_blank" rel="noopener" className="flex items-center gap-1.5 font-bold whitespace-nowrap text-lake hover:underline">
                        <PlayCircle size={16} /> Watch
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 id="entry-lists" className="display mt-20 text-4xl">
          Entry lists
        </h2>
        <p className="mt-3 max-w-2xl text-fog">
          Every ticket sold, with the entrant&rsquo;s initial and surname. The full list is published when a competition closes, before the draw.
        </p>
        <div className="mt-6 space-y-3">
          {competitions.map((c) => (
            <details key={c.slug} className="card group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-5">
                <span>
                  <span className="display text-lg">{c.title}</span>
                  <span className="ml-3 text-sm text-fog">Draw {drawDate(c.drawAt)}</span>
                </span>
                <span className="eyebrow text-[0.62rem] text-fog">
                  {num(c.sold)} entries <span className="ml-2 text-lake transition-transform group-open:rotate-45">+</span>
                </span>
              </summary>
              <div className="border-t border-line p-5">
                <ol className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  {sampleEntries(c.slug, c.sold).map((e) => (
                    <li key={e.ticket} className="flex justify-between border-b border-line/60 py-1">
                      <span className="tabular text-lake">#{num(e.ticket)}</span>
                      <span>{e.name}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 text-xs text-fog">
                  Showing a sample. <Link href={`/competitions/${c.slug}`} className="underline underline-offset-2">View competition</Link>
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}
