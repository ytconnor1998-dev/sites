import Link from "next/link";
import { instantWinCount, type Competition } from "@/config/competitions";
import { money, num } from "@/lib/format";
import { CountdownInline } from "./Countdown";
import { PrizeImage } from "./PrizeImage";
import { Progress } from "./Progress";
import { serial, Ticket } from "./Ticket";

export function drawLabel(comp: Competition) {
  return comp.drawType === "live" ? "Drawn live on Facebook" : "Drawn automatically";
}

/** A competition, printed on its own colour of raffle ticket. */
export function CompetitionCard({ comp }: { comp: Competition }) {
  const iw = instantWinCount(comp);
  return (
    <article className="relative">
      <Ticket
        paper={comp.paper}
        orientation="v"
        stubV="5rem"
        className="h-full"
        stub={
          <div className="flex items-center justify-between gap-3 px-5">
            <p className="leading-none">
              {comp.wasPrice && (
                <s className="mr-1.5 text-sm text-ink-2">
                  <span className="sr-only">was </span>
                  {money(comp.wasPrice)}
                </s>
              )}
              <span className="display text-[2rem]">{money(comp.price)}</span>
              <span className="ml-1 text-sm text-ink-2">a ticket</span>
            </p>
            <span className="btn btn-primary !py-2.5" aria-hidden="true">
              Enter
            </span>
          </div>
        }
      >
        <div className="flex h-full flex-col">
          <div className="p-2.5 pb-0">
            <div className="relative aspect-[3/2] overflow-hidden rounded-[3px] bg-sheet">
              <PrizeImage seed={comp.slug} image={comp.image} alt="" />
              {comp.cashAlternative && (
                <span className="absolute bottom-2 left-2 rounded-[3px] bg-ink px-2 py-1 text-xs font-medium text-map">
                  or {money(comp.cashAlternative)} cash
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
            <p className="flex justify-between gap-3 text-xs text-ink-2">
              <span>{drawLabel(comp)}</span>
              <span className="tabular" title="The next ticket number to be sold">
                {serial(comp.sold + 1)}
              </span>
            </p>
            <h3 className="display mt-2 text-[1.85rem]">
              <Link href={`/competitions/${comp.slug}`} className="after:absolute after:inset-0 hover:underline">
                {comp.title}
              </Link>
            </h3>
            <p className="mt-1.5 text-[0.95rem] text-ink-2">{comp.teaser}</p>
            <dl className="mt-4 mb-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-ink-2">Draw in</dt>
                <dd className="font-semibold">
                  <CountdownInline drawAt={comp.drawAt} />
                </dd>
              </div>
              {iw > 0 && (
                <div>
                  <dt className="text-ink-2">Instant wins</dt>
                  <dd className="font-semibold">{num(iw)} prizes</dd>
                </div>
              )}
            </dl>
            <div className="mt-auto">
              <Progress sold={comp.sold} max={comp.maxTickets} compact />
            </div>
          </div>
        </div>
      </Ticket>
    </article>
  );
}
