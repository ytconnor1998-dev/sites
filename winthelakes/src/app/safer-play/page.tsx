import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/Prose";
import { PageHero } from "@/components/Section";

export const metadata: Metadata = { title: "Safer play", description: "Tools to help you stay in control: spend limits, breaks, and where to find support." };

export default function SaferPlayPage() {
  return (
    <>
      <PageHero title="Safer play" intro="Competitions should be fun. If they stop being fun, we're here to help." />
      <Prose>
        <h2>Tools in your account</h2>
        <ul>
          <li>
            <strong>Monthly spend limit:</strong> set a maximum you can spend each calendar month. Checkout stops you going over it.
          </li>
          <li>
            <strong>Take a break:</strong> block yourself from entering for 24 hours, a week, a month or six months. Breaks can&rsquo;t be cancelled early.
          </li>
          <li>
            <strong>Close your account:</strong> email us and we&rsquo;ll close it and stop all marketing.
          </li>
        </ul>
        <p>
          <Link href="/account">Go to My account → Safer play</Link>
        </p>
        <h2>Signs to look out for</h2>
        <ul>
          <li>Spending more than you can afford, or chasing losses</li>
          <li>Borrowing money to enter</li>
          <li>Hiding how much you spend from people close to you</li>
        </ul>
        <h2>Free, confidential support</h2>
        <ul>
          <li>
            <a href="https://www.gamcare.org.uk/" target="_blank" rel="noopener">GamCare</a>: 0808 8020 133, 24 hours a day
          </li>
          <li>
            <a href="https://www.begambleaware.org/" target="_blank" rel="noopener">BeGambleAware</a>
          </li>
          <li>
            <a href="https://www.gamblingtherapy.org/" target="_blank" rel="noopener">Gambling Therapy</a>
          </li>
        </ul>
      </Prose>
    </>
  );
}
