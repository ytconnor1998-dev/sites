import type { Metadata } from "next";
import { Suspense } from "react";
import { CompetitionGrid } from "@/components/CompetitionGrid";
import { PageHero } from "@/components/Section";
import { competitions } from "@/config/competitions";

export const metadata: Metadata = { title: "Competitions", description: "Every live competition: Lake District breaks, cash, cars, tech and instant wins." };

export default function CompetitionsPage() {
  return (
    <>
      <PageHero eyebrow={`${competitions.length} live now`} title="Competitions" intro="Lodges, cash, cars and more. Every one drawn on time, sold out or not." />
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <Suspense>
          <CompetitionGrid comps={competitions} syncUrl />
        </Suspense>
      </div>
    </>
  );
}
