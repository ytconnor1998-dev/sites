import type { Metadata } from "next";
import { LegalRoute } from "@/components/site/Pages";
import { legalDocs } from "@/content/legal";
import { pageMetadata } from "@/lib/seo";

const doc = legalDocs.it.terms;

export const metadata: Metadata = pageMetadata({ path: "/terms", lang: "it", title: doc.title, description: doc.description });

export default function Terms() {
  return <LegalRoute lang="it" kind="terms" />;
}
