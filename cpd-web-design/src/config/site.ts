/**
 * ───────────────────────────────────────────────────────────────
 *  CPD WEB DESIGN: SITE CONFIG
 *  Edit this file to change prices, contact details, portfolio,
 *  the minimum term and the agency comparison. Page copy lives in
 *  src/content/translations.ts; demo sites in src/content/examples/.
 * ───────────────────────────────────────────────────────────────
 */
import type { L } from "@/lib/i18n";

export const site = {
  name: "CPD Web Design",
  shortName: "CPD",
  /** Production URL, used for SEO, sitemap and Open Graph. Set NEXT_PUBLIC_SITE_URL on Vercel. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cpdwebdesign.com").replace(/\/$/, ""),
  owner: {
    name: "Your Name", // PLACEHOLDER: your name as it should appear in the About section
    role: { en: "Designer & developer", it: "Designer e sviluppatore" } satisfies L,
    /** Put your photo in /public/images/ and set e.g. "/images/me.jpg". null shows a placeholder frame. */
    photo: null as string | null,
  },
  city: "Rome",
  address: {
    locality: "Roma",
    region: "RM",
    postalCode: "00100", // PLACEHOLDER
    country: "IT",
  },
  /** Italian businesses must show their Partita IVA on their website. */
  vatNumber: "IT00000000000", // PLACEHOLDER
  languages: ["English", "Italiano"],
};

/**
 * LEGAL DETAILS
 * Used on /privacy, /cookies, /terms and /legal. Fill these in before going public,
 * and have the pages checked by a lawyer or your commercialista: they're a solid
 * starting point, not legal advice. The page text is in src/content/legal.ts.
 * Lines whose value is "" (e.g. no PEC) are left off the pages automatically.
 */
export const legal = {
  /** Your full legal name, or your company's registered name. */
  ownerName: "Your Full Name", // PLACEHOLDER
  /** Full business address. */
  address: "Via Esempio 1, 00100 Roma (RM), Italia", // PLACEHOLDER
  /** Certified email (PEC), if you have one. */
  pec: "", // PLACEHOLDER
  /** REA number, if registered with the Chamber of Commerce (e.g. "RM-1234567"). */
  rea: "",
  /** When the legal pages last changed (YYYY-MM-DD). Update it whenever you edit them. */
  lastUpdated: "2026-10-05",
  /** Days of notice to cancel after the minimum term (also written into the FAQ copy). */
  noticeDays: 30,
  /** Months to keep enquiries that don't become clients. */
  enquiryRetentionMonths: 12,
  /** Court for disputes with business clients. */
  court: { en: "Rome", it: "Roma" } satisfies L,
  /** Hosting provider, named in the legal notice. Change it if you move host. */
  host: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA",
};

export const contact = {
  email: "hello@cpdwebdesign.com", // PLACEHOLDER
  /** International format, digits only, no + or spaces (used for wa.me links). */
  whatsapp: "390000000000", // PLACEHOLDER
  /** Human-readable phone number shown on the page. */
  phoneDisplay: "+39 000 000 0000", // PLACEHOLDER
  instagram: "https://instagram.com/", // PLACEHOLDER
};

/**
 * CONTACT FORM
 * 1. Create a free form at https://formspree.io (or any service accepting JSON POSTs).
 * 2. Paste its endpoint below, e.g. "https://formspree.io/f/abcdwxyz".
 * While it still contains "YOUR_FORM_ID", the form runs in demo mode: it shows the
 * success message but sends nothing (and logs a warning in the browser console).
 * Using a service other than Formspree? Add its domain to connect-src and form-action
 * in vercel.json (the Content-Security-Policy), or the browser will block the request.
 */
export const contactForm = {
  endpoint: process.env.NEXT_PUBLIC_FORM_ENDPOINT ?? "https://formspree.io/f/YOUR_FORM_ID",
};

export type PlanId = "onepage" | "business";

export type Plan = {
  id: PlanId;
  name: L;
  /** Monthly price in euro, excluding VAT. */
  monthly: number;
  /** Who it's for, in one line. */
  audience: L;
  includes: L[];
  /** Highlighted card in the pricing section. */
  featured?: boolean;
};

export const pricing = {
  /** Minimum term in months (both plans). Shown in pricing, FAQ and "What's the catch?". PLACEHOLDER. */
  minimumTermMonths: 6,
  /** Fee to take full ownership of the design and code if you leave (FAQ). PLACEHOLDER. */
  buyoutFee: 500,
  /** The plans. "What's included" lists are PLACEHOLDERS: edit to match what you offer. */
  plans: [
    {
      id: "onepage",
      name: { en: "One page", it: "Una pagina" },
      monthly: 14,
      audience: { en: "For portfolios, freelancers, CVs, events and side projects.", it: "Per portfolio, freelance, CV, eventi e progetti personali." },
      includes: [
        { en: "A one-page site designed for you", it: "Un sito di una pagina progettato per te" },
        { en: "Your own domain connected", it: "Il tuo dominio collegato" },
        { en: "Hosting, SSL and daily backups", it: "Hosting, SSL e backup giornalieri" },
        { en: "Contact form, WhatsApp and social links", it: "Modulo di contatto, WhatsApp e link social" },
        { en: "1 small change a month", it: "1 piccola modifica al mese" },
        { en: "Support by email", it: "Assistenza via email" },
      ],
    },
    {
      id: "business",
      name: { en: "Business", it: "Business" },
      monthly: 49,
      featured: true,
      audience: { en: "For restaurants, hotels, shops, studios and services.", it: "Per ristoranti, hotel, negozi, studi e servizi." },
      includes: [
        { en: "A custom-designed site, up to 5 pages", it: "Un sito progettato su misura, fino a 5 pagine" },
        { en: "English and Italian versions", it: "Versione italiana e inglese" },
        { en: "Hosting, SSL and daily backups", it: "Hosting, SSL e backup giornalieri" },
        { en: "Updates and security patches", it: "Aggiornamenti e patch di sicurezza" },
        { en: "Contact, enquiry or booking forms", it: "Moduli di contatto, richiesta o prenotazione" },
        { en: "Google Maps and Google Business Profile setup", it: "Google Maps e configurazione di Google Business Profile" },
        { en: "Basic SEO for local search", it: "SEO di base per la ricerca locale" },
        { en: "Up to 3 small changes a month", it: "Fino a 3 piccole modifiche al mese" },
        { en: "Support by WhatsApp and email", it: "Assistenza via WhatsApp e email" },
      ],
    },
  ] satisfies Plan[] as Plan[],
  /** Typical agency costs, used in the comparison receipt. */
  agency: {
    buildMin: 1500,
    buildMax: 5000,
    hostingMonthly: 25,
    maintenanceMonthly: 50,
  },
};

export type PortfolioItem = {
  title: string;
  url?: string;
  /** Internal link (e.g. a demo). Takes priority over url. */
  href?: string;
  year: string;
  category: L;
  description: L;
  /** Screenshot path in /public (e.g. "/images/work/client.jpg") or remote URL. null shows a typographic cover. */
  image: string | null;
  /** Cover colours used when there's no image. */
  cover: { bg: string; fg: string };
  featured?: boolean;
};

/** Example sites and client work shown in the "Example sites" section. Add real client projects here too. */
export const portfolio: PortfolioItem[] = [
  {
    title: "Trattoria Alba",
    href: "/examples/restaurant",
    year: "Demo",
    category: { en: "Restaurant · example site", it: "Ristorante · sito di esempio" },
    description: { en: "Menu, bookings, live opening hours, bilingual.", it: "Menu, prenotazioni, orari in tempo reale, bilingue." },
    image: "/images/work/restaurant.jpg",
    cover: { bg: "#2F3A1F", fg: "#F5EEDD" },
  },
  {
    title: "Hotel Via Giulia",
    href: "/examples/hotel",
    year: "Demo",
    category: { en: "Boutique hotel · example site", it: "Hotel boutique · sito di esempio" },
    description: { en: "Availability search, room carousels, booking requests.", it: "Ricerca disponibilità, camere, richieste di prenotazione." },
    image: "/images/work/hotel.jpg",
    cover: { bg: "#14202B", fg: "#C9A66B" },
  },
  {
    title: "Salone Iris",
    href: "/examples/salon",
    year: "Demo",
    category: { en: "Hair salon · example site", it: "Parrucchiere · sito di esempio" },
    description: { en: "Price list, online appointments, team and live opening hours.", it: "Listino, appuntamenti online, team e orari in tempo reale." },
    image: "/images/work/salon.jpg",
    cover: { bg: "#F6E9E6", fg: "#3E1F38" },
  },
  {
    title: "Respiro Yoga",
    href: "/examples/yoga",
    year: "Demo",
    category: { en: "Yoga studio · example site", it: "Studio di yoga · sito di esempio" },
    description: { en: "Weekly timetable with filters, class booking and passes.", it: "Orario settimanale con filtri, prenotazione lezioni e abbonamenti." },
    image: "/images/work/yoga.jpg",
    cover: { bg: "#1F4E5A", fg: "#F1EBE1" },
  },
  {
    title: "Marta Ricci Fotografia",
    href: "/examples/portfolio",
    year: "Demo",
    category: { en: "One-page portfolio · example site", it: "Portfolio di una pagina · sito di esempio" },
    description: { en: "Filterable gallery, services and an enquiry form, on the One page plan.", it: "Galleria con filtri, servizi e modulo di richiesta, con il piano Una pagina." },
    image: "/images/work/portfolio.jpg",
    cover: { bg: "#141414", fg: "#F4F3F1" },
  },
  // Add real projects here. Copy this shape:
  // {
  //   title: "Bar Esempio",
  //   url: "https://example.com",
  //   year: "2026",
  //   category: { en: "Café", it: "Bar" },
  //   description: { en: "One-page site with menu and map.", it: "Sito di una pagina con menu e mappa." },
  //   image: "/images/work/bar-esempio.jpg",
  //   cover: { bg: "#1F4D3B", fg: "#FAFAF7" },
  // },
];

export const planById = (id: PlanId) => pricing.plans.find((p) => p.id === id)!;
export const lowestMonthly = Math.min(...pricing.plans.map((p) => p.monthly));
