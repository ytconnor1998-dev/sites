import type { Metadata } from "next";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { LegalPage } from "@/components/site/LegalPage";
import { legalDocs } from "@/content/legal";

const doc = legalDocs.en.cookies;

export const metadata: Metadata = {
  title: doc.title,
  description: doc.description,
  alternates: { canonical: "/cookies" },
};

export default function CookiePolicyPage() {
  return (
    <>
      <Header />
      <main id="main">
        <LegalPage kind="cookies" />
      </main>
      <Footer />
    </>
  );
}
