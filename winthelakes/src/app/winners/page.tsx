import type { Metadata } from "next";
import { PrizeArt } from "@/components/PrizeArt";
import { PageHero } from "@/components/Section";
import { winners } from "@/config/competitions";
import { num, shortDate } from "@/lib/format";
import { stats } from "@/config/site";

export const metadata: Metadata = { title: "Winners", description: "Every Win the Lakes winner, with their ticket number and the date they won." };

export default function WinnersPage() {
  return (
    <>
      <PageHero eyebrow={`${num(stats.winners)} winners and counting`} title="Our winners" intro="Every winner, every ticket number. Could you be next?" />
      <div className="mx-auto grid max-w-7xl gap-5 px-4 pt-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {winners.map((w) => (
          <figure key={`${w.name}-${w.ticket}`} className="card overflow-hidden">
            <div className="relative aspect-[16/10]">
              <PrizeArt comp={{ art: w.art, title: w.prize }} iconSize={50} />
              <span className="absolute top-3 left-3 rounded-full bg-lantern px-2.5 py-1 text-[0.62rem] font-extrabold tracking-wider text-night uppercase">
                Ticket #{num(w.ticket)}
              </span>
            </div>
            <figcaption className="p-5">
              <p className="eyebrow text-[0.6rem] text-fog">{shortDate(w.date)}</p>
              <p className="display mt-1 text-xl">{w.prize}</p>
              <p className="mt-1 text-fog">
                {w.name}, {w.town}
              </p>
              {w.quote && <blockquote className="mt-3 border-l-2 border-lake pl-3 text-sm italic">“{w.quote}”</blockquote>}
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}
