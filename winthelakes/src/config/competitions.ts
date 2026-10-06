/**
 * All competitions on the site. Add, edit or remove entries here.
 *
 * In this demo the numbers (tickets sold, instant wins claimed) are fixed. When
 * the site is connected to a back end, these come from your database instead.
 * Money is stored in pence to avoid rounding errors: 149 = £1.49.
 */

export type Category = "lakes" | "cash" | "cars" | "tech" | "instant";

export const categories: { id: Category; label: string }[] = [
  { id: "lakes", label: "Lake District breaks" },
  { id: "cash", label: "Cash" },
  { id: "cars", label: "Cars & bikes" },
  { id: "tech", label: "Tech" },
  { id: "instant", label: "Instant wins" },
];

export type InstantWin = {
  prize: string;
  /** Value in pence. */
  value: number;
  /** Winning ticket numbers. Each pays out once. */
  tickets: number[];
  /** Ticket numbers that have already been won. */
  claimed: number[];
};

export type Competition = {
  slug: string;
  title: string;
  /** One line under the title on cards. */
  teaser: string;
  category: Category;
  /** Ticket price in pence. */
  price: number;
  /** Retail value of the main prize in pence. */
  value: number;
  /** Cash alternative in pence, if offered. */
  cashAlternative?: number;
  maxTickets: number;
  sold: number;
  maxPerPerson: number;
  /** When the draw happens (ISO date with UK time offset). */
  drawAt: string;
  featured?: boolean;
  /** Price before a sale, in pence. Shows a "Sale" badge and the old price crossed out. */
  wasPrice?: number;
  /** "live" = drawn live on Facebook; "auto" = drawn automatically by random number generator. */
  drawType: "live" | "auto";
  /** Ticket bundles: buy `buy` tickets, get `free` extra free. */
  bundles?: { buy: number; free: number }[];
  instantWins?: InstantWin[];
  /** Prize photo in /public/images/prizes/. Without one, a map-style placeholder is shown. */
  image?: string;
  /** Colour of the paper ticket this competition is printed on. */
  paper: Paper;
  description: string[];
  highlights: string[];
  question: { text: string; options: string[]; answer: number };
};

/** Classic raffle-roll colours. Defined in globals.css as --color-paper-<name>. */
export type Paper = "pink" | "lemon" | "mint" | "sky" | "lilac" | "peach";

/**
 * Demo draw dates are set relative to when the site was built (BUILD_TIME, from
 * next.config.ts), so a fresh deploy always has live countdowns. For real
 * competitions, write the date instead: drawAt: "2026-11-20T20:00:00+00:00".
 */
function inDays(days: number, hour = 20) {
  const d = new Date(process.env.BUILD_TIME ?? Date.now());
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour - 1, 0, 0, 0); // ~8pm UK
  return d.toISOString();
}

export const competitions: Competition[] = [
  {
    slug: "windermere-lodge-week",
    drawType: "live",
    title: "A week in a Windermere lake-view lodge",
    teaser: "Hot tub, private jetty and £1,000 spending money",
    category: "lakes",
    price: 249,
    value: 450_000,
    cashAlternative: 350_000,
    maxTickets: 4_999,
    sold: 3_412,
    maxPerPerson: 100,
    drawAt: inDays(3),
    featured: true,
    bundles: [{ buy: 5, free: 1 }, { buy: 10, free: 3 }, { buy: 25, free: 10 }],
    instantWins: [
      { prize: "£250 cash", value: 25_000, tickets: [118, 2_047, 3_960], claimed: [2_047] },
      { prize: "£50 cash", value: 5_000, tickets: [44, 512, 1_301, 2_222, 3_333, 4_100, 4_777], claimed: [512, 1_301, 3_333] },
      { prize: "Windermere cruise for two", value: 4_000, tickets: [77, 1_888, 4_444], claimed: [] },
    ],
    image: "/images/prizes/windermere-lodge-week.jpg",
    paper: "sky",
    description: [
      "Seven nights for up to six people in a lake-view lodge on the eastern shore of Windermere, with a private hot tub, wood burner and your own jetty.",
      "We'll add £1,000 spending money for boat hire, fell walks, pubs and Kendal mint cake. Pick any week in the next 12 months, subject to availability.",
    ],
    highlights: ["7 nights for up to 6 guests", "Private hot tub & jetty", "£1,000 spending money", "Dog friendly", "Book any week within 12 months"],
    question: { text: "Which is the largest natural lake in England?", options: ["Ullswater", "Windermere", "Coniston Water"], answer: 1 },
  },
  {
    slug: "10k-tax-free-cash",
    drawType: "live",
    title: "£10,000 tax-free cash",
    teaser: "Paid straight to your bank the day after the draw",
    category: "cash",
    price: 99,
    value: 1_000_000,
    maxTickets: 19_999,
    sold: 15_870,
    maxPerPerson: 250,
    drawAt: inDays(1),
    featured: true,
    bundles: [{ buy: 10, free: 2 }, { buy: 25, free: 7 }, { buy: 50, free: 20 }],
    image: "/images/prizes/10k-tax-free-cash.jpg",
    paper: "lemon",
    description: ["Ten thousand pounds, tax free, sent by bank transfer the day after the draw. Spend it on whatever you like."],
    highlights: ["Tax-free cash", "Paid within 24 hours of the draw", "Live draw on Facebook"],
    question: { text: "How many pence are in £1?", options: ["10", "100", "1,000"], answer: 1 },
  },
  {
    slug: "range-rover-sport",
    drawType: "live",
    title: "Range Rover Sport + £5,000",
    teaser: "Hardknott Pass in comfort, or £45,000 cash",
    category: "cars",
    price: 499,
    value: 6_500_000,
    cashAlternative: 4_500_000,
    maxTickets: 24_999,
    sold: 9_120,
    maxPerPerson: 200,
    drawAt: inDays(12),
    featured: true,
    bundles: [{ buy: 5, free: 1 }, { buy: 10, free: 3 }, { buy: 20, free: 8 }],
    instantWins: [
      { prize: "£1,000 cash", value: 100_000, tickets: [999, 12_345, 20_202], claimed: [] },
      { prize: "£100 cash", value: 10_000, tickets: [7, 300, 4_040, 8_008, 15_015, 18_000, 22_222, 24_000], claimed: [300, 8_008] },
    ],
    image: "/images/prizes/range-rover-sport.jpg",
    paper: "mint",
    description: [
      "A Range Rover Sport in Santorini Black, delivered to your door, with £5,000 cash on top for insurance and fuel.",
      "Prefer the money? Take £45,000 tax-free cash instead.",
    ],
    highlights: ["Brand new, delivered to your door", "£5,000 cash included", "£45,000 cash alternative", "16 instant wins"],
    question: { text: "Which mountain is the highest in England?", options: ["Helvellyn", "Skiddaw", "Scafell Pike"], answer: 2 },
  },
  {
    slug: "ullswater-glamping",
    drawType: "auto",
    title: "Ullswater glamping weekend for four",
    teaser: "Safari tent, steamer trip and a guided Helvellyn walk",
    category: "lakes",
    price: 79,
    value: 120_000,
    cashAlternative: 90_000,
    maxTickets: 2_999,
    sold: 2_610,
    maxPerPerson: 50,
    drawAt: inDays(2),
    image: "/images/prizes/ullswater-glamping.jpg",
    paper: "pink",
    description: [
      "Three nights in a luxury safari tent above Ullswater for four, with an Ullswater 'Steamers' cruise and a guided walk up Helvellyn via Striding Edge (or a gentler route, your call).",
    ],
    highlights: ["3 nights for 4 guests", "Ullswater 'Steamers' cruise", "Guided Helvellyn walk", "£900 cash alternative"],
    question: { text: "Ullswater is the second largest lake in which national park?", options: ["Peak District", "Lake District", "Snowdonia"], answer: 1 },
  },
  {
    slug: "instant-win-bonanza",
    drawType: "live",
    title: "Instant win bonanza: 250 prizes",
    teaser: "1 in 20 tickets wins instantly. End prize £2,500",
    category: "instant",
    price: 99,
    wasPrice: 199,
    value: 250_000,
    maxTickets: 4_999,
    sold: 1_980,
    maxPerPerson: 150,
    drawAt: inDays(6),
    featured: true,
    bundles: [{ buy: 5, free: 2 }, { buy: 10, free: 5 }, { buy: 20, free: 10 }],
    instantWins: [
      { prize: "£500 cash", value: 50_000, tickets: [250, 2_500, 4_250], claimed: [250] },
      { prize: "£100 cash", value: 10_000, tickets: [11, 222, 999, 1_500, 2_750, 3_800, 4_900], claimed: [11, 999] },
      { prize: "£25 site credit", value: 2_500, tickets: [5, 66, 140, 333, 480, 777, 1_234, 1_777, 2_048, 3_141, 3_500, 4_321], claimed: [5, 66, 140, 777, 1_234] },
      { prize: "Free tickets x10", value: 1_990, tickets: [9, 99, 909, 1_999, 2_999, 3_999, 4_999], claimed: [9, 909] },
    ],
    image: "/images/prizes/instant-win-bonanza.jpg",
    paper: "lilac",
    description: [
      "Over 250 instant prizes hidden in the ticket numbers. If your ticket matches one, you win straight away and we'll pay out within 24 hours. Every ticket is also in the end draw for £2,500.",
    ],
    highlights: ["250+ instant prizes", "Find out the moment you buy", "£2,500 end prize", "Cash paid within 24 hours"],
    question: { text: "How many days are there in a leap year?", options: ["365", "366", "364"], answer: 1 },
  },
  {
    slug: "iphone-17-pro",
    drawType: "auto",
    title: "iPhone 17 Pro Max, 1TB",
    teaser: "Or £1,300 cash, your choice",
    category: "tech",
    price: 39,
    wasPrice: 59,
    value: 159_900,
    cashAlternative: 130_000,
    maxTickets: 3_999,
    sold: 1_206,
    maxPerPerson: 100,
    drawAt: inDays(8),
    image: "/images/prizes/iphone-17-pro.jpg",
    paper: "peach",
    description: ["The newest iPhone in your choice of colour, unlocked and delivered free. Or £1,300 cash."],
    highlights: ["1TB, any colour", "Unlocked", "£1,300 cash alternative"],
    question: { text: "Which company makes the iPhone?", options: ["Apple", "Samsung", "Google"], answer: 0 },
  },
  {
    slug: "coniston-boat-day",
    drawType: "auto",
    title: "Private boat & lakeside lunch on Coniston",
    teaser: "A skippered day on the water for six",
    category: "lakes",
    price: 49,
    value: 60_000,
    cashAlternative: 45_000,
    maxTickets: 1_999,
    sold: 640,
    maxPerPerson: 50,
    drawAt: inDays(9),
    image: "/images/prizes/coniston-boat-day.jpg",
    paper: "mint",
    description: ["A skippered motor launch for the day on Coniston Water with a picnic hamper, then a three-course lunch at a lakeside inn for six."],
    highlights: ["Skippered boat for 6", "Picnic hamper", "3-course lakeside lunch"],
    question: { text: "Which children's book was inspired by Coniston Water?", options: ["Swallows and Amazons", "The Hobbit", "Black Beauty"], answer: 0 },
  },
  {
    slug: "e-mtb",
    drawType: "live",
    title: "Full-suspension electric mountain bike",
    teaser: "Grizedale's trails, the easy way up",
    category: "cars",
    price: 89,
    value: 520_000,
    cashAlternative: 400_000,
    maxTickets: 5_999,
    sold: 2_301,
    maxPerPerson: 100,
    drawAt: inDays(15),
    image: "/images/prizes/e-mtb.jpg",
    paper: "pink",
    description: ["A top-spec full-suspension e-MTB with a 750Wh battery, plus helmet and a day's guided ride at Grizedale Forest."],
    highlights: ["750Wh battery", "Helmet & accessories", "Guided Grizedale ride", "£4,000 cash alternative"],
    question: { text: "Grizedale Forest sits between Coniston Water and which lake?", options: ["Windermere", "Derwentwater", "Wastwater"], answer: 0 },
  },
  {
    slug: "1k-friday-cash",
    drawType: "live",
    title: "£1,000 Friday cash",
    teaser: "Every Friday at 8pm, live",
    category: "cash",
    price: 25,
    value: 100_000,
    maxTickets: 5_999,
    sold: 4_998,
    maxPerPerson: 200,
    drawAt: inDays(4),
    image: "/images/prizes/1k-friday-cash.jpg",
    paper: "lemon",
    description: ["Our weekly 25p cash draw. A thousand pounds, every Friday, drawn live."],
    highlights: ["Just 25p a ticket", "Drawn live every Friday", "Paid within 24 hours"],
    question: { text: "What is 12 + 8?", options: ["18", "20", "22"], answer: 1 },
  },
];

export function getCompetition(slug: string) {
  return competitions.find((c) => c.slug === slug);
}

/** Free tickets earned by buying `qty`: the biggest bundle that fits. */
export function freeTicketsFor(c: Competition, qty: number) {
  return (c.bundles ?? []).filter((b) => qty >= b.buy).reduce((best, b) => Math.max(best, b.free), 0);
}

export function lineTotal(c: Competition, qty: number) {
  return c.price * qty;
}

export function ticketsLeft(c: Competition) {
  return c.maxTickets - c.sold;
}

export function instantWinsFound(c: Competition) {
  return (c.instantWins ?? []).reduce((n, w) => n + w.claimed.length, 0);
}

export function instantWinCount(c: Competition) {
  return (c.instantWins ?? []).reduce((n, w) => n + w.tickets.length, 0);
}

// ---- Past results, shown on /winners and /draws -------------------------------

export type Winner = {
  name: string;
  town: string;
  prize: string;
  ticket: number;
  date: string;
  quote?: string;
};

export const winners: Winner[] = [
  // PLACEHOLDER: replace with real winners (with their permission).
  { name: "Sarah M.", town: "Kendal", prize: "Lake-view lodge week, Derwentwater", ticket: 1_482, date: "2026-09-26", quote: "Watched the live draw in my pyjamas and screamed the house down." },
  { name: "Dave P.", town: "Preston", prize: "£10,000 tax-free cash", ticket: 8_831, date: "2026-09-19", quote: "Money was in my account the next morning. Unreal." },
  { name: "Aisha K.", town: "Manchester", prize: "Volkswagen California camper", ticket: 20_117, date: "2026-09-12", quote: "First thing we did was drive it to Buttermere." },
  { name: "Tom R.", town: "Carlisle", prize: "£1,000 Friday cash", ticket: 3_006, date: "2026-10-02" },
  { name: "Gemma L.", town: "Lancaster", prize: "PlayStation 5 Pro bundle", ticket: 744, date: "2026-09-28", quote: "Bought 5 tickets on a whim." },
  { name: "Liam O.", town: "Leeds", prize: "£500 instant win", ticket: 250, date: "2026-10-04" },
  { name: "Jo W.", town: "Keswick", prize: "Ullswater glamping weekend", ticket: 1_093, date: "2026-09-05", quote: "Lived here 20 years and never been on the steamers. Now I have!" },
  { name: "Priya S.", town: "Newcastle", prize: "£250 instant win", ticket: 2_047, date: "2026-10-05" },
];

export type DrawResult = {
  competition: string;
  date: string;
  ticketsSold: number;
  winningTicket: number;
  winner: string;
  /** Link to the recording of the live draw. */
  video?: string;
};

export const drawResults: DrawResult[] = [
  // PLACEHOLDER: replace with real results. Link each to its live-draw recording.
  { competition: "£1,000 Friday cash", date: "2026-10-02", ticketsSold: 5_999, winningTicket: 3_006, winner: "Tom R., Carlisle", video: "https://facebook.com/" },
  { competition: "PlayStation 5 Pro bundle", date: "2026-09-28", ticketsSold: 2_999, winningTicket: 744, winner: "Gemma L., Lancaster", video: "https://facebook.com/" },
  { competition: "Lake-view lodge week, Derwentwater", date: "2026-09-26", ticketsSold: 4_999, winningTicket: 1_482, winner: "Sarah M., Kendal", video: "https://facebook.com/" },
  { competition: "£1,000 Friday cash", date: "2026-09-25", ticketsSold: 5_870, winningTicket: 5_112, winner: "Chris B., Barrow", video: "https://facebook.com/" },
  { competition: "£10,000 tax-free cash", date: "2026-09-19", ticketsSold: 19_999, winningTicket: 8_831, winner: "Dave P., Preston", video: "https://facebook.com/" },
  { competition: "Volkswagen California camper", date: "2026-09-12", ticketsSold: 29_999, winningTicket: 20_117, winner: "Aisha K., Manchester", video: "https://facebook.com/" },
  { competition: "Ullswater glamping weekend", date: "2026-09-05", ticketsSold: 2_999, winningTicket: 1_093, winner: "Jo W., Keswick", video: "https://facebook.com/" },
];
