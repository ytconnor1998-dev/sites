import type { Metadata } from "next";
import { LegalRoute } from "@/components/site/Pages";
import { legalDocs } from "@/content/legal";
import { pageMetadata } from "@/lib/seo";

const doc = legalDocs.it.privacy;

export const metadata: Metadata = pageMetadata({ path: "/privacy", lang: "it", title: doc.title, description: doc.description });

export default function Privacy() {
  return <LegalRoute lang="it" kind="privacy" />;
}
