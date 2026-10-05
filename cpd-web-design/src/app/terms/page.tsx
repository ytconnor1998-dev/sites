import type { Metadata } from "next";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { LegalPage } from "@/components/site/LegalPage";
import { legalDocs } from "@/content/legal";

const doc = legalDocs.en.terms;

export const metadata: Metadata = {
  title: doc.title,
  description: doc.description,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main id="main">
        <LegalPage kind="terms" />
      </main>
      <Footer />
    </>
  );
}
