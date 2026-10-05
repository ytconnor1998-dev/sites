import type { Metadata } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import { TourSite } from "@/components/examples/tours/TourSite";

// Demo-only fonts: loaded on this route only.
const display = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-sc-display", display: "swap" });
const sans = Manrope({ subsets: ["latin"], variable: "--font-sc-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Example: Sette Colli Tours (tour company website)",
  description: "An example tourism website by CPD Web Design: small-group tours in Rome with filters, live booking with dates, times and prices, guides, FAQ and meeting point map.",
  alternates: { canonical: "/examples/tours" },
  robots: { index: false, follow: true }, // fictional business
};

export default function ToursExamplePage() {
  return (
    <div className={`${display.variable} ${sans.variable}`}>
      <TourSite />
    </div>
  );
}
