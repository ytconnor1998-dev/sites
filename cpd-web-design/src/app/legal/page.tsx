import type { Metadata } from "next";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { LegalPage } from "@/components/site/LegalPage";
import { legalDocs } from "@/content/legal";

const doc = legalDocs.en.legal;

export const metadata: Metadata = {
  title: doc.title,
  description: doc.description,
  alternates: { canonical: "/legal" },
};

export default function LegalNoticePage() {
  return (
    <>
      <Header />
      <main id="main">
        <LegalPage kind="legal" />
      </main>
      <Footer />
    </>
  );
}
