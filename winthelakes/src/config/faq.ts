import { site } from "./site";

/** Questions shown on /faq (and the first few on the home page). */
export const faq: { q: string; a: string }[] = [
  {
    q: "Is this gambling?",
    a: `No. These are prize competitions. To enter you answer a question, and there's a free postal entry route on every competition, so nobody has to pay to take part. You must be ${site.minAge} or over and a UK resident.`,
  },
  {
    q: "How is the winner picked?",
    a: "When the competition sells out or the timer runs out, we draw a ticket number with a certified random number generator. Live draws are streamed on Facebook so you can watch it happen; auto draws happen at the advertised time and the result is published on the draw results page.",
  },
  {
    q: "What's an instant win?",
    a: "Some ticket numbers are winners in their own right. If one of your tickets matches, you'll see it straight away after checkout when you reveal your tickets, and we'll pay out within 24 hours. All your tickets still go into the main draw.",
  },
  {
    q: "What if I get the question wrong?",
    a: "Your tickets are still issued but they won't be entered into the draw, and you can't win an instant prize with them. Take your time and check your answer before you pay.",
  },
  {
    q: "Do you draw if the competition doesn't sell out?",
    a: "Yes. Every competition is drawn on the date shown, sold out or not. We never extend a draw date.",
  },
  {
    q: "How do I get my prize?",
    a: "We'll call and email you after the draw. Cash is paid by bank transfer within 24 hours. Holidays and experiences come with a booking voucher, and cars and bikes are delivered to your door anywhere in mainland UK.",
  },
  {
    q: "Can I take cash instead of the prize?",
    a: "Where a cash alternative is listed on the competition page, yes. Just tell us when we call.",
  },
  {
    q: "Can I enter for free?",
    a: "Yes. Send your entry by post (details on the free entry page). Postal entries have exactly the same chance of winning as paid ones.",
  },
  {
    q: "Can I set limits on what I spend?",
    a: "Yes. In My account you can set a monthly spend limit or take a break from entering for a set time. See our safer play page for more.",
  },
  {
    q: "What happens to my site credit?",
    a: "Some instant wins pay out as site credit. It's added to your account and used automatically at checkout. Site credit doesn't expire.",
  },
];
