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
  /**
   * Production URL, used for canonical links, the sitemap, Open Graph and structured data.
   * The www version is the main address; cpdwebdesign.com (no www) redirects to it on Vercel.
   * NEXT_PUBLIC_SITE_URL overrides it if you ever need to (e.g. a staging domain).
   */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cpdwebdesign.com").replace(/\/$/, ""),
  owner: {
    name: "Connor",
    role: { en: "Designer & developer", it: "Designer e sviluppatore" } satisfies L,
    /** Optional. Put your photo in /public/images/ and set e.g. "/images/me.jpg". null shows a name card instead. */
    photo: null as string | null,
  },
  city: "Rome",
  address: {
    locality: "Roma",
    region: "RM",
    postalCode: "00100", // PLACEHOLDER
    country: "IT",
  },
  /**
   * Partita IVA, e.g. "IT12345678901". Required on the home page by Italian law once you have one
   * (art. 35 DPR 633/1972). Leave "" until then: the footer and legal pages hide the line.
   */
  vatNumber: "",
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
  /**
   * Public email, by the visitor's language. Both are aliases of connor@cpdwebdesign.com,
   * so everything lands in one inbox, and the alias shows which language they wrote in.
   */
  email: { en: "hello@cpdwebdesign.com", it: "ciao@cpdwebdesign.com" } satisfies L,
  /** International format, digits only, no + or spaces (used for wa.me links). */
  whatsapp: "447902353010",
  /** Human-readable phone number shown on the page. */
  phoneDisplay: "+44 7902 353010",
  instagram: "https://www.instagram.com/connor_davies0/",
  /**
   * false = a personal account: linked in the footer, but not given to Google as the business's profile.
   * Set to true if you switch to a CPD Web Design business account.
   */
  instagramIsBusiness: false,
};

/**
 * CONTACT FORM → EMAIL
 * Enquiries are emailed via FormSubmit (formsubmit.co, free, no account) to contact.email.en,
 * an alias of your main inbox. One-time setup: send yourself a test enquiry from the live site,
 * then click "Activate form" in the email FormSubmit sends you. Until then, sending fails and
 * the form offers WhatsApp instead.
 * To use Formspree or another service, set NEXT_PUBLIC_FORM_ENDPOINT on Vercel (it gets the same
 * JSON), and add its domain to connect-src in vercel.json.
 */
export const contactForm = {
  endpoint: process.env.NEXT_PUBLIC_FORM_ENDPOINT ?? `https://formsubmit.co/ajax/${contact.email.en}`,
};

/** wa.me link to your WhatsApp, optionally with a message already typed in. */
export const whatsappUrl = (text?: string) => `https://wa.me/${contact.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

/** Google Search Console: paste the "content" value of its HTML-tag verification here, or set the env var. */
export const searchConsoleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "";

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
    title: "Sette Colli Tours",
    href: "/examples/tours",
    year: "Demo",
    category: { en: "Tour company · example site", it: "Tour operator · sito di esempio" },
    description: { en: "Tour filters, live booking with dates, times and prices, guides.", it: "Filtri dei tour, prenotazione con date, orari e prezzi, guide." },
    image: "/images/work/tours.jpg",
    cover: { bg: "#2B211C", fg: "#F4EDE2" },
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
