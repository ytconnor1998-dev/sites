import type { Metadata } from "next";
import { LegalRoute } from "@/components/site/Pages";
import { legalDocs } from "@/content/legal";
import { pageMetadata } from "@/lib/seo";

const doc = legalDocs.it.legal;

export const metadata: Metadata = pageMetadata({ path: "/legal", lang: "it", title: doc.title, description: doc.description });

export default function LegalNotice() {
  return <LegalRoute lang="it" kind="legal" />;
}
