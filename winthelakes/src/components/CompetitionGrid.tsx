"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { categories, type Category, type Competition } from "@/config/competitions";
import { CompetitionCard } from "./CompetitionCard";

type Filter = Category | "all" | "ending";

const tabs: { id: Filter; label: string }[] = [{ id: "all", label: "All" }, { id: "ending", label: "Ending soon" }, ...categories];

/** Category tabs + ticket grid. The selected tab is kept in the URL (?c=cash) so it can be linked to. */
export function CompetitionGrid({ comps, syncUrl = false }: { comps: Competition[]; syncUrl?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("c");
  const filter: Filter = tabs.some((t) => t.id === raw) ? (raw as Filter) : "all";

  const shown =
    filter === "all"
      ? comps
      : filter === "ending"
        ? [...comps].sort((a, b) => a.drawAt.localeCompare(b.drawAt)).slice(0, 3)
        : comps.filter((c) => c.category === filter);

  function select(id: Filter) {
    const url = id === "all" ? "?" : `?c=${id}`;
    router.replace(syncUrl ? url : `${url}#competitions`, { scroll: false });
  }

  return (
    <div>
      <div role="tablist" aria-label="Filter competitions" className="-mx-4 flex gap-6 overflow-x-auto border-b border-rule px-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={filter === t.id}
            onClick={() => select(t.id)}
            className={`-mb-px shrink-0 border-b-[3px] pt-1 pb-3 text-[0.95rem] ${
              filter === t.id ? "border-explorer font-semibold" : "border-transparent text-ink-2 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-10 grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c, i) => (
          <CompetitionCard key={c.slug} comp={c} index={i} />
        ))}
        {shown.length === 0 && <p className="text-ink-2">Nothing in this category right now. New competitions open every week.</p>}
      </div>
    </div>
  );
}
