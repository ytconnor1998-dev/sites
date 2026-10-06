import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Schibsted_Grotesk } from "next/font/google";
import { Providers } from "@/components/ui/Providers";
import { contact, lowestMonthly, pricing, searchConsoleVerification, site } from "@/config/site";
import { translations } from "@/content/translations";
import { ogImage, withPrices } from "@/lib/seo";
import "./globals.css";

const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-plex-mono",
  display: "swap",
  preload: false, // only used inside receipts; let the main font load first
});

const t = translations.en.meta;

// Defaults for every page. The main pages override these with their own language
// versions (see src/lib/seo.ts); the example sites set their own titles.
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${withPrices(t.title, "en")} | ${site.name}`, template: `%s · ${site.name}` },
  description: withPrices(t.description, "en"),
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  category: "Web design",
  openGraph: {
    type: "website",
    siteName: site.name,
    title: withPrices(t.title, "en"),
    description: withPrices(t.description, "en"),
    locale: "en_GB",
    alternateLocale: ["it_IT"],
    images: [ogImage],
  },
  twitter: { card: "summary_large_image", images: [ogImage.url] },
  formatDetection: { telephone: false },
  ...(searchConsoleVerification && { verification: { google: searchConsoleVerification } }),
};

export const viewport: Viewport = {
  themeColor: "#2340D9",
};

const realInstagram = !/instagram\.com\/?$/.test(contact.instagram);

/** Structured data: tells search engines (and AI assistants) who you are, where, and what it costs. */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      url: site.url,
      name: site.name,
      inLanguage: ["en", "it"],
      publisher: { "@id": `${site.url}/#business` },
    },
    {
      "@type": "ProfessionalService",
      "@id": `${site.url}/#business`,
      name: site.name,
      description: withPrices(t.description, "en"),
      url: site.url,
      email: contact.email,
      telephone: contact.phoneDisplay,
      image: `${site.url}${ogImage.url}`,
      logo: `${site.url}/icon.svg`,
      priceRange: `€${lowestMonthly}–€${Math.max(...pricing.plans.map((p) => p.monthly))}/month`,
      address: {
        "@type": "PostalAddress",
        addressLocality: site.address.locality,
        addressRegion: site.address.region,
        postalCode: site.address.postalCode,
        addressCountry: site.address.country,
      },
      areaServed: [
        { "@type": "City", name: "Rome" },
        { "@type": "Country", name: "Italy" },
      ],
      knowsLanguage: ["en", "it"],
      knowsAbout: ["Web design", "Website development", "Small business websites", "Restaurant websites", "Hotel websites", "Local SEO", "Website hosting"],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        telephone: contact.phoneDisplay,
        email: contact.email,
        availableLanguage: ["English", "Italian"],
      },
      ...(realInstagram && { sameAs: [contact.instagram] }),
      makesOffer: pricing.plans.map((plan) => ({
        "@type": "Offer",
        name: `${plan.name.en} website plan`,
        description: plan.audience.en,
        priceCurrency: "EUR",
        price: plan.monthly,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: plan.monthly,
          priceCurrency: "EUR",
          unitCode: "MON",
          valueAddedTaxIncluded: false,
        },
      })),
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${schibsted.variable} ${plexMono.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
