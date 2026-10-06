import type { Metadata } from "next";
import { HomePage } from "@/components/site/Pages";
import { translations } from "@/content/translations";
import { pageMetadata, withPrices } from "@/lib/seo";

const t = translations.it.meta;

export const metadata: Metadata = pageMetadata({
  path: "/",
  lang: "it",
  title: `${withPrices(t.title, "it")} | CPD Web Design`,
  description: withPrices(t.description, "it"),
  absoluteTitle: true,
});

export default function Home() {
  return <HomePage lang="it" />;
}
