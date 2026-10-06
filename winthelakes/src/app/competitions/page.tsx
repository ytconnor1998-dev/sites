import type { Metadata } from "next";
import { Suspense } from "react";
import { CompetitionGrid } from "@/components/CompetitionGrid";
import { PageHero } from "@/components/Section";
import { competitions } from "@/config/competitions";

export const metadata: Metadata = { title: "Competitions", description: "Every live competition: Lake District breaks, cash, cars, tech and instant wins." };

export default function CompetitionsPage() {
  return (
    <>
      <PageHero title="Competitions" intro={`${competitions.length} open now. Every one is drawn on the date shown, sold out or not.`} />
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <Suspense>
          <CompetitionGrid comps={competitions} syncUrl />
        </Suspense>
      </div>
    </>
  );
}
