/**
 * Page bodies shared by the English (/…) and Italian (/it/…) routes.
 * Each route file only picks the language and sets its metadata.
 */
import { About } from "@/components/site/About";
import { Catch } from "@/components/site/Catch";
import { Contact } from "@/components/site/Contact";
import { ExamplesIndex } from "@/components/site/ExamplesIndex";
import { Faq } from "@/components/site/Faq";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { HowItWorks } from "@/components/site/HowItWorks";
import { Included } from "@/components/site/Included";
import { Industries } from "@/components/site/Industries";
import { LegalPage } from "@/components/site/LegalPage";
import { Pricing } from "@/components/site/Pricing";
import { Work } from "@/components/site/Work";
import { pricing, site } from "@/config/site";
import type { LegalKind } from "@/content/legal";
import { translations } from "@/content/translations";
import { RouteLang, type Lang } from "@/lib/i18n";
import { euro, langPath } from "@/lib/seo";

function Shell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <RouteLang lang={lang}>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </RouteLang>
  );
}

function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function HomePage({ lang }: { lang: Lang }) {
  const t = translations[lang];
  const vars: Record<string, string> = { months: String(pricing.minimumTermMonths), fee: euro(pricing.buyoutFee, lang) };
  const answer = (a: string) => a.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);

  // The FAQ as structured data: helps search engines and AI assistants quote the answers.
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: lang,
    url: `${site.url}${langPath("/", lang)}`,
    mainEntity: t.faq.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: answer(item.a) },
    })),
  };

  return (
    <Shell lang={lang}>
      <JsonLd data={faq} />
      <Hero />
      <Work />
      <HowItWorks />
      <Pricing />
      <Included />
      <Catch />
      <Industries />
      <Faq />
      <About />
      <Contact />
    </Shell>
  );
}

export function ExamplesPage({ lang }: { lang: Lang }) {
  return (
    <Shell lang={lang}>
      <ExamplesIndex />
    </Shell>
  );
}

export function LegalRoute({ lang, kind }: { lang: Lang; kind: LegalKind }) {
  return (
    <Shell lang={lang}>
      <LegalPage kind={kind} />
    </Shell>
  );
}
