"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { categories, type Category, type Competition } from "@/config/competitions";
import { CompetitionCard } from "./CompetitionCard";

type Filter = Category | "all" | "ending";

const tabs: { id: Filter; label: string }[] = [{ id: "all", label: "All" }, { id: "ending", label: "Ending soon" }, ...categories];

/** Category tabs + grid. The selected tab is kept in the URL (?c=cash) so it can be linked to. */
export function CompetitionGrid({ comps, syncUrl = false }: { comps: Competition[]; syncUrl?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("c");
  const filter: Filter = tabs.some((t) => t.id === raw) ? (raw as Filter) : "all";

  const shown =
    filter === "all"
      ? comps
      : filter === "ending"
        ? [...comps].sort((a, b) => a.drawAt.localeCompare(b.drawAt)).slice(0, 4)
        : comps.filter((c) => c.category === filter);

  function select(id: Filter) {
    const url = id === "all" ? "?" : `?c=${id}`;
    router.replace(syncUrl ? url : `${url}#competitions`, { scroll: false });
  }

  return (
    <div>
      <div role="tablist" aria-label="Filter competitions" className="rail -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={filter === t.id}
            onClick={() => select(t.id)}
            className={`eyebrow shrink-0 rounded-full border px-4 py-2.5 text-[0.68rem] transition-colors ${
              filter === t.id ? "border-lake bg-lake text-night" : "border-line-2 text-fog hover:border-lake hover:text-lake"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((c) => (
          <CompetitionCard key={c.slug} comp={c} />
        ))}
        {shown.length === 0 && <p className="text-fog">Nothing in this category right now. New competitions launch every week.</p>}
      </div>
    </div>
  );
}
