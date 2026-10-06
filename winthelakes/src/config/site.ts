/**
 * Business details used across the site. Anything marked PLACEHOLDER must be
 * replaced with your real details before launch.
 */
export const site = {
  name: "Win the Lakes",
  shortName: "WinTheLakes",
  tagline: "Win a little piece of the Lake District",
  description:
    "Prize competitions from the heart of the Lake District. Lodge breaks, cash, cars and tech, with low ticket prices, instant wins and live draws.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://winthelakes.co.uk", // PLACEHOLDER: your domain
  email: "hello@winthelakes.co.uk", // PLACEHOLDER
  /** Company details shown in the footer and legal pages. */
  company: {
    legalName: "Win the Lakes Ltd", // PLACEHOLDER
    number: "00000000", // PLACEHOLDER: Companies House number
    address: "PO Box 000, Windermere, Cumbria, LA23 0AA", // PLACEHOLDER: also the free postal entry address
  },
  social: {
    facebook: "https://facebook.com/", // PLACEHOLDER: where live draws are streamed
    instagram: "https://instagram.com/", // PLACEHOLDER
    tiktok: "https://tiktok.com/", // PLACEHOLDER
  },
  /** Minimum age to enter. */
  minAge: 18,
  /** Where entries are accepted from. */
  territory: "UK residents only",
};

/** Shown in the strip of numbers on the home page. Update as you grow. */
export const stats = {
  givenAway: 248_350, // PLACEHOLDER: £ in prizes awarded
  winners: 1_284, // PLACEHOLDER
  charity: 12_400, // PLACEHOLDER: £ donated to Lake District causes
  trustpilot: 4.9, // PLACEHOLDER
};

export const nav = [
  { href: "/competitions", label: "Competitions" },
  { href: "/winners", label: "Winners" },
  { href: "/draws", label: "Draw results" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
];
