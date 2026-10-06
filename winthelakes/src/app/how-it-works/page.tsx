import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/Prose";
import { PageHero } from "@/components/Section";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "How it works", description: "How to enter Win the Lakes competitions, how instant wins work, and how winners are drawn." };

export default function HowPage() {
  return (
    <>
      <PageHero title="How it works" />
      <Prose>
        <h2>1. Pick a prize</h2>
        <p>
          Choose a competition and how many tickets you want. Each competition has a fixed number of tickets, so you always know your odds: with 10 tickets in a
          competition of 5,000, your chance is 1 in 500. Bigger bundles add free tickets.
        </p>
        <h2>2. Answer the question</h2>
        <p>
          Every competition has a question. Only correct answers are entered into the draw. This is what makes it a prize competition rather than a lottery.
          Prefer not to pay? <Link href="/free-entry">Enter free by post</Link>: postal entries have the same chance of winning.
        </p>
        <h2>3. Reveal your instant wins</h2>
        <p>
          Some competitions have winning ticket numbers set in advance. After checkout you scratch to reveal your tickets: any matching number wins immediately.
          Cash is paid within 24 hours and site credit goes straight into your wallet. The list of instant-win numbers, and which have been found, is on every
          competition page.
        </p>
        <h2>4. Watch the draw</h2>
        <p>
          Main prizes are drawn on the advertised date, sold out or not. Live draws are streamed on our Facebook page using a certified random number generator;
          auto draws run at the set time. Results and recordings are on the <Link href="/draws">draw results</Link> page and we contact winners straight away.
        </p>
        <h2>Who can enter</h2>
        <p>
          You must be {site.minAge} or over and a UK resident. Staff and their households can&rsquo;t enter. See the full <Link href="/terms">terms and conditions</Link>.
        </p>
      </Prose>
    </>
  );
}
