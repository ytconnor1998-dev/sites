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
      <PageHero eyebrow="Help" title="FAQ" intro={<>Can&rsquo;t find your answer? Email <a className="text-lake underline" href={`mailto:${site.email}`}>{site.email}</a>.</>} />
      <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
        <div className="divide-y divide-line rounded-3xl border border-line bg-deep">
          {faq.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                {f.q}
                <span className="text-xl text-lake transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-fog">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}
