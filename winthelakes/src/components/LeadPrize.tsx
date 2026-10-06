import Link from "next/link";
import { instantWinCount, type Competition } from "@/config/competitions";
import { drawDate, money, num } from "@/lib/format";
import { CountdownBoxes } from "./Countdown";
import { drawLabel } from "./CompetitionCard";
import { PrizeImage } from "./PrizeImage";
import { Progress } from "./Progress";
import { serial, Ticket } from "./Ticket";

/** The home page opener: the biggest prize, with an oversized ticket laid over its photo. */
export function LeadPrize({ comp }: { comp: Competition }) {
  const iw = instantWinCount(comp);
  return (
    <section aria-labelledby="lead-h" className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <div className="relative aspect-[4/3] overflow-hidden rounded-md sm:aspect-[21/9]">
        <PrizeImage seed={comp.slug} image={comp.image} alt={comp.title} />
      </div>
      <div className="relative z-10 -mt-14 px-2 sm:-mt-32 sm:px-10">
        <Ticket
          paper={comp.paper}
          orientation="r"
          stubW="14rem"
          stubV="10.5rem"
          className="max-w-4xl"
          stub={
            <div className="flex h-full flex-col justify-center gap-3 px-6 py-5 sm:px-7">
              <p className="tabular text-xs text-ink-2">{serial(comp.sold + 1)}</p>
              <p className="leading-none">
                <span className="display text-5xl">{money(comp.price)}</span>
                <span className="ml-1.5 text-ink-2">a ticket</span>
              </p>
              <Link href={`/competitions/${comp.slug}`} className="btn btn-primary w-full">
                Enter now
              </Link>
            </div>
          }
        >
          <div className="p-6 sm:p-9">
            <p className="text-sm text-ink-2">
              {drawLabel(comp)}, {drawDate(comp.drawAt)}
            </p>
            <h1 id="lead-h" className="display mt-3 max-w-[16ch] text-[2.9rem] sm:text-7xl">
              {comp.title}
            </h1>
            <p className="mt-3 max-w-[48ch] text-lg">
              {comp.teaser}.{iw > 0 && <> Plus {num(iw)} instant wins.</>}
              {comp.cashAlternative && <> Or take {money(comp.cashAlternative)} cash.</>}
            </p>
            <div className="mt-6">
              <CountdownBoxes drawAt={comp.drawAt} />
            </div>
            <div className="mt-5 max-w-md">
              <Progress sold={comp.sold} max={comp.maxTickets} />
            </div>
          </div>
        </Ticket>
      </div>
    </section>
  );
}
