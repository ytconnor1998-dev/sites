"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import { btn } from "./Section";

/** Body for the 404 page. */
export function SimplePage() {
  const t = useT();
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-32">
      <h1 className="heading text-[clamp(2.5rem,6vw,4.5rem)]">{t.notFound.title}</h1>
      <p className="mt-4 text-lg text-muted">{t.notFound.body}</p>
      <Link href="/" className={`${btn.primary} mt-8`}>
        {t.notFound.home}
      </Link>
    </section>
  );
}
