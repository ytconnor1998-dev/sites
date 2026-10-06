import type { Metadata } from "next";
import { PageHero } from "@/components/Section";
import { faq } from "@/config/faq";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "FAQ", description: "Answers to common questions about entering Win the Lakes competitions." };

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function FaqPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero title="FAQ" intro={<>Can&rsquo;t find your answer? Email <a className="link text-ink" href={`mailto:${site.email}`}>{site.email}</a>.</>} />
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="max-w-3xl divide-y divide-rule border-y-[3px] border-ink">
          {faq.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                {f.q}
                <span className="text-2xl leading-none font-normal transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-2 max-w-[65ch] leading-relaxed text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}
