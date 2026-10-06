import type { Metadata } from "next";
import { LegalRoute } from "@/components/site/Pages";
import { legalDocs } from "@/content/legal";
import { pageMetadata } from "@/lib/seo";

const doc = legalDocs.it.cookies;

export const metadata: Metadata = pageMetadata({ path: "/cookies", lang: "it", title: doc.title, description: doc.description });

export default function Cookies() {
  return <LegalRoute lang="it" kind="cookies" />;
}
