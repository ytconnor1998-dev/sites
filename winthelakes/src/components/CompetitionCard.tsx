import { Radio, Shuffle, Zap } from "lucide-react";
import Link from "next/link";
import { categories, instantWinCount, type Competition } from "@/config/competitions";
import { money } from "@/lib/format";
import { CountdownInline } from "./Countdown";
import { PrizeArt } from "./PrizeArt";
import { Progress } from "./Progress";

export function Badge({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "lake" | "lantern" | "ember" }) {
  const tones = {
    plain: "bg-night/70 text-mist ring-white/15",
    lake: "bg-lake text-night ring-lake",
    lantern: "bg-lantern text-night ring-lantern",
    ember: "bg-ember text-white ring-ember",
  };
  return <span className={`eyebrow inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6rem] ring-1 backdrop-blur ${tones[tone]}`}>{children}</span>;
}

export function DrawBadge({ comp }: { comp: Competition }) {
  return comp.drawType === "live" ? (
    <Badge>
      <Radio size={11} className="text-ember" /> Live draw
    </Badge>
  ) : (
    <Badge>
      <Shuffle size={11} /> Auto draw
    </Badge>
  );
}

export function CompetitionCard({ comp }: { comp: Competition }) {
  const iw = instantWinCount(comp);
  const category = categories.find((c) => c.id === comp.category)?.label;
  return (
    <article className="card group relative flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:border-lake/40">
      <div className="relative aspect-[4/3] overflow-hidden">
        <PrizeArt comp={comp} className="transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <DrawBadge comp={comp} />
          {comp.wasPrice && <Badge tone="ember">Sale</Badge>}
        </div>
        {iw > 0 && (
          <div className="absolute top-3 right-3">
            <Badge tone="lantern">
              <Zap size={11} /> {iw} instant wins
            </Badge>
          </div>
        )}
        <div className="absolute inset-x-3 bottom-3 rounded-full bg-night/75 px-3 py-1.5 text-center text-xs font-bold ring-1 ring-white/10 backdrop-blur">
          <CountdownInline drawAt={comp.drawAt} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow text-[0.62rem] text-fog">{category}</p>
        <h3 className="display mt-1.5 text-xl leading-[1.02]">
          <Link href={`/competitions/${comp.slug}`} className="after:absolute after:inset-0">
            {comp.title}
          </Link>
        </h3>
        <p className="mt-2 text-sm text-fog">{comp.teaser}</p>
        <div className="mt-auto pt-5">
          <Progress sold={comp.sold} max={comp.maxTickets} size="sm" />
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              {comp.wasPrice && <span className="mr-1.5 text-sm text-fog line-through">{money(comp.wasPrice)}</span>}
              <span className="display normal-case text-3xl text-lantern">{money(comp.price)}</span>
              <span className="eyebrow ml-1.5 text-[0.6rem] text-fog">a ticket</span>
            </div>
            <span className="btn btn-primary relative !px-4 !py-2.5 !text-[0.72rem]">Enter</span>
          </div>
        </div>
      </div>
    </article>
  );
}
