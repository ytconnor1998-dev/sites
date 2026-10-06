/**
 * Page metadata for the main site. Every page exists in English (/path) and
 * Italian (/it/path); this builds the canonical URL, hreflang alternates and
 * Open Graph tags so Google shows the right language to the right people.
 */
import type { Metadata } from "next";
import { lowestMonthly, pricing, site } from "@/config/site";
import { translations } from "@/content/translations";

export type SeoLang = "en" | "it";

/** "/privacy" + "it" → "/it/privacy". (Server-safe twin of localePath in i18n.tsx.) */
export const langPath = (path: string, lang: SeoLang) => (lang === "en" ? path : path === "/" ? "/it" : `/it${path}`);

export const euro = (amount: number, lang: SeoLang) =>
  new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: "always" } as Intl.NumberFormatOptions).format(amount);

/** Fills {min} / {max} with the plan prices from src/config/site.ts. */
export const withPrices = (text: string, lang: SeoLang) =>
  text.replace("{min}", euro(lowestMonthly, lang)).replace("{max}", euro(Math.max(...pricing.plans.map((p) => p.monthly)), lang));

/** Social share image (public/og-image.png, 1200×630). Replace the file to change it. */
export const ogImage = { url: "/og-image.png", width: 1200, height: 630, alt: "CPD Web Design: your website, built free. Web designer in Rome." };

export function pageMetadata({
  path,
  lang,
  title,
  description,
  absoluteTitle = false,
}: {
  /** The English path, e.g. "/" or "/privacy". */
  path: string;
  lang: SeoLang;
  title: string;
  description: string;
  /** Use the title as-is, without " · CPD Web Design" after it. */
  absoluteTitle?: boolean;
}): Metadata {
  const url = langPath(path, lang);
  const fullTitle = absoluteTitle ? title : `${title} · ${site.name}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: url,
      languages: { en: langPath(path, "en"), it: langPath(path, "it"), "x-default": langPath(path, "en") },
    },
    openGraph: {
      type: "website",
      siteName: site.name,
      title: fullTitle,
      description,
      url,
      locale: translations[lang].meta.ogLocale,
      alternateLocale: [translations[lang === "en" ? "it" : "en"].meta.ogLocale],
      images: [ogImage],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [ogImage.url] },
  };
}
