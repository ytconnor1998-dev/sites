import type { Metadata } from "next";
import { Prose } from "@/components/Prose";
import { PageHero } from "@/components/Section";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Terms & conditions" };

// PLACEHOLDER: a starting draft only. Have a solicitor who knows UK prize competitions review it before launch.
export default function TermsPage() {
  const c = site.company;
  return (
    <>
      <PageHero title="Terms & conditions" intro="Draft for review. Please read before entering." />
      <Prose>
        <h2>1. The promoter</h2>
        <p>
          The promoter is {c.legalName} (company no. {c.number}), {c.address} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). Contact: <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
        <h2>2. Who can enter</h2>
        <p>
          Entrants must be {site.minAge} or over and resident in the United Kingdom. Our staff, their households and anyone professionally connected to a
          competition can&rsquo;t enter. We may ask for proof of age and identity before awarding a prize.
        </p>
        <h2>3. How to enter</h2>
        <p>
          Enter online by buying tickets and answering the question, or for free by post (see the free postal entry page). Each competition shows its ticket
          price, the maximum number of tickets, the maximum per person and its closing date. Only entries with the correct answer are entered into the draw. No
          refunds are given for incorrect answers.
        </p>
        <h2>4. The draw</h2>
        <p>
          Each competition closes when all tickets are sold or at the advertised closing date, whichever comes first, and is drawn on that date whether or not
          it has sold out. The winner is chosen at random from all correct entries using a certified random number generator. Live draws are streamed on our
          Facebook page.
        </p>
        <h2>5. Instant wins</h2>
        <p>
          Instant-win ticket numbers are set before a competition opens and published on the competition page. Each pays out once. Instant wins are subject to
          a correct answer.
        </p>
        <h2>6. Prizes</h2>
        <p>
          We&rsquo;ll contact winners by phone and email within 24 hours of the draw. If we can&rsquo;t reach a winner within 14 days, we may redraw. Where a cash
          alternative is shown, the winner may choose it instead. Prizes can&rsquo;t be transferred. Holiday prizes are subject to availability.
        </p>
        <h2>7. Publicity</h2>
        <p>
          We publish winners&rsquo; first name, surname initial and town. With the winner&rsquo;s agreement, we may also share a photo or video. Winners may ask not
          to take part in publicity.
        </p>
        <h2>8. Our liability</h2>
        <p>
          Nothing in these terms limits our liability for death or personal injury caused by negligence, for fraud, or any liability that can&rsquo;t be limited
          by law. Your statutory rights are not affected.
        </p>
        <h2>9. Law</h2>
        <p>These terms are governed by the law of England and Wales.</p>
      </Prose>
    </>
  );
}
