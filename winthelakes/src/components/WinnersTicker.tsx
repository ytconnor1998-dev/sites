import { Trophy } from "lucide-react";
import { winners } from "@/config/competitions";

export function WinnersTicker() {
  // The list is rendered twice so the marquee loops seamlessly; the copy is hidden from screen readers.
  const row = [...winners, ...winners].map((w, i) => (
    <li key={i} aria-hidden={i >= winners.length || undefined} className="flex shrink-0 items-center gap-2.5 pr-10 text-sm">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-deep-2 text-[0.7rem] font-extrabold text-lake ring-1 ring-line-2">{w.name[0]}</span>
      <strong>{w.name}</strong>
      <span className="text-fog">from {w.town} won</span>
      <span className="font-bold text-lantern">{w.prize}</span>
    </li>
  ));
  return (
    <section aria-label="Recent winners" className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="flex items-center overflow-hidden rounded-full border border-line bg-deep">
        <div className="eyebrow z-10 flex shrink-0 items-center gap-2 rounded-full bg-lantern px-5 py-3.5 text-night">
          <Trophy size={15} /> Winners
        </div>
        <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
          <ul className="flex w-max animate-marquee py-3 pl-6 hover:[animation-play-state:paused]">
            {row}
          </ul>
        </div>
      </div>
    </section>
  );
}
