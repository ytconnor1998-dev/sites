import type { MetadataRoute } from "next";
import { competitions } from "@/config/competitions";
import { site } from "@/config/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/competitions", "/winners", "/draws", "/how-it-works", "/faq", "/free-entry", "/safer-play", "/terms", "/privacy"];
  return [...pages, ...competitions.map((c) => `/competitions/${c.slug}`)].map((p) => ({ url: `${site.url}${p}/`.replace(/\/\/$/, "/") }));
}
