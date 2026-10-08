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
  const price = euro(planById(industry.plan).monthly, "en");
  return pageMetadata({
    path: `/websites/${industry.slug}`,
    lang: "en",
    title: industry.metaTitle.en.replace("{price}", price),
    description: industry.metaDescription.en.replace("{price}", price),
  });
}

export default async function IndustryWebsitesPage({ params }: Props) {
  const industry = industryBySlug((await params).industry);
  if (!industry) notFound();
  return <IndustryRoute lang="en" industry={industry} />;
}
