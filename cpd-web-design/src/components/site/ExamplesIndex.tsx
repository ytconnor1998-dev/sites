"use client";

import Link from "next/link";
import { Photo } from "@/components/ui/Photo";
import { examples } from "@/content/examples";
import { useHref, useL, useT } from "@/lib/i18n";
import { btn } from "./Section";

export function ExamplesIndex() {
  const t = useT();
  const tr = useL();
  const href = useHref();
  return (
    <section aria-labelledby="examples-title" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
      <h1 id="examples-title" className="heading text-[clamp(2.5rem,6vw,4.5rem)]">
        {t.examples.title}
      </h1>
      <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-muted">{t.examples.intro}</p>

      <ul className="mt-12 grid gap-10 md:grid-cols-2">
        {examples.map((ex) => (
          <li key={ex.slug}>
            <article>
              <Link href={`/examples/${ex.slug}`} className="block" tabIndex={-1} aria-hidden>
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl" style={{ background: ex.palette.bg, ["--ph-bg" as string]: ex.palette.bg, ["--ph-fg" as string]: ex.palette.fg }}>
                  <Photo src={ex.cover} alt="" label={ex.name} sizes="(min-width: 768px) 50vw, 100vw" />
                </div>
              </Link>
              <h2 className="mt-4 text-2xl font-semibold">{ex.name}</h2>
              <p className="text-muted">
                {tr(ex.industry)}, {ex.location}
              </p>
              <p className="mt-2 text-lg">{tr(ex.tagline)}</p>
              <Link href={`/examples/${ex.slug}`} className={`${btn.secondary} mt-5`}>
                {t.examples.open}
                <span className="sr-only">: {ex.name}</span>
              </Link>
            </article>
          </li>
        ))}
      </ul>

      <div className="mt-16 flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[56ch] text-lg">{t.examples.more}</p>
        <Link href={href("/#contact")} className={btn.primary}>
          {t.examples.ask}
        </Link>
      </div>
    </section>
  );
}
