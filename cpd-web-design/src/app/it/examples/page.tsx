import type { Metadata } from "next";
import { ExamplesPage } from "@/components/site/Pages";
import { translations } from "@/content/translations";
import { pageMetadata } from "@/lib/seo";

const t = translations.it.meta;

export const metadata: Metadata = pageMetadata({ path: "/examples", lang: "it", title: t.examplesTitle, description: t.examplesDescription });

export default function Examples() {
  return <ExamplesPage lang="it" />;
}
