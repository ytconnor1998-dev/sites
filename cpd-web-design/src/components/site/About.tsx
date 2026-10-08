"use client";

import { MessageCircle } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { site, whatsappUrl } from "@/config/site";
import { fill, useL, useT } from "@/lib/i18n";
import { Section } from "./Section";

export function About() {
  const t = useT();
  const tr = useL();
  const name = site.owner.name;

  return (
    <Section id="about" title={t.about.title} tone="paper-2" layout="split">
      <div className="grid gap-10 md:grid-cols-[minmax(0,17rem)_1fr] md:items-start">
        {/* With site.owner.photo set (src/config/site.ts) the photo shows; otherwise a name card. */}
        {site.owner.photo ? (
          <div className="relative aspect-[4/5] w-full max-w-64 overflow-hidden rounded-2xl">
            <Photo src={site.owner.photo} alt={fill(t.about.photoAlt, { name })} sizes="16rem" />
          </div>
        ) : (
          <div className="w-full max-w-72 rounded-2xl bg-white p-6 shadow-[0_1px_0_var(--color-line),0_18px_40px_-24px_rgb(0_0_0/0.35)]">
            <div className="flex items-center gap-4">
              <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-full bg-cobalt text-3xl font-semibold text-white">
                {name.charAt(0)}
              </span>
              <div>
                <p className="text-xl font-semibold tracking-tight">{name}</p>
                <p className="text-muted">{tr(site.owner.role)}</p>
              </div>
            </div>
            <dl className="mt-6 space-y-3 border-t border-line pt-5 text-[15px]">
              {t.about.facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-4">
                  <dt className="text-muted">{f.label}</dt>
                  <dd className="text-right font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
            <a
              href={whatsappUrl(fill(t.contact.waPreset, { name }))}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-cobalt px-5 text-sm font-medium text-white transition-colors hover:bg-[#1a33b8]"
            >
              <MessageCircle aria-hidden className="size-4" />
              {t.about.say}
            </a>
          </div>
        )}
        <div className="max-w-[62ch] space-y-5 text-lg leading-relaxed">
          {t.about.paragraphs.map((p, i) => (
            <p key={i}>{fill(p, { name })}</p>
          ))}
        </div>
      </div>
    </Section>
  );
}
