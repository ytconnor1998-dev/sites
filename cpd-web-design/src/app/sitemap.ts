import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { langPath } from "@/lib/seo";

// Generated once at build time (required for the static export).
export const dynamic = "force-static";

// Every main page in English and Italian, each listing its other-language version.
// Example sites are fictional businesses and set to noindex, so they're left out.
const pages: { path: string; priority: number; changeFrequency: "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "monthly" },
  { path: "/examples", priority: 0.8, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/cookies", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/legal", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return pages.flatMap(({ path, priority, changeFrequency }) =>
    (["en", "it"] as const).map((lang) => ({
      url: `${site.url}${langPath(path, lang)}`,
      lastModified,
      changeFrequency,
      priority: lang === "en" ? priority : Math.max(priority - 0.1, 0.1),
      alternates: { languages: { en: `${site.url}${langPath(path, "en")}`, it: `${site.url}${langPath(path, "it")}` } },
    })),
  );
}
