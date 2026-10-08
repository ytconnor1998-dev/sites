import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IndustryRoute } from "@/components/site/Pages";
import { planById } from "@/config/site";
import { industries, industryBySlug } from "@/content/industries";
import { euro, pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ industry: string }> };

// One static page per entry in src/content/industries.ts.
export const dynamicParams = false;
export const generateStaticParams = () => industries.map((i) => ({ industry: i.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const industry = industryBySlug((await params).industry);
  if (!industry) return {};
  const price = euro(planById(industry.plan).monthly, "it");
  return pageMetadata({
    path: `/websites/${industry.slug}`,
    lang: "it",
    title: industry.metaTitle.it.replace("{price}", price),
    description: industry.metaDescription.it.replace("{price}", price),
  });
}

export default async function IndustryWebsitesPage({ params }: Props) {
  const industry = industryBySlug((await params).industry);
  if (!industry) notFound();
  return <IndustryRoute lang="it" industry={industry} />;
}
