import type { MetadataRoute } from "next";
import { site } from "@/config/site";

// Generated once at build time (required for the static export).
export const dynamic = "force-static";

// Example sites are fictional businesses and set to noindex, so they're left out here.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${site.url}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/examples`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...["/privacy", "/cookies", "/terms", "/legal"].map((path) => ({
      url: `${site.url}${path}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];
}
