import type { Metadata } from "next";
import { Prose } from "@/components/Prose";
import { PageHero } from "@/components/Section";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Privacy policy" };

// PLACEHOLDER: a starting draft only. Update it to match the payment provider and tools you actually use.
export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy policy" intro="Draft for review." />
      <Prose>
        <h2>Who we are</h2>
        <p>
          {site.company.legalName}, {site.company.address}, is the data controller. Contact: <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
        <h2>What we collect and why</h2>
        <ul>
          <li>Your name, email, phone, address and date of birth: to run your entries, check you&rsquo;re eligible, and contact you if you win (contract).</li>
          <li>Order and payment records: to process payments and meet our accounting obligations (legal obligation). Card details are handled by our payment provider and never stored by us.</li>
          <li>Safer play settings and spending: to apply the limits you set (contract and legitimate interest).</li>
          <li>Marketing emails: only if you opt in (consent). You can unsubscribe at any time.</li>
        </ul>
        <h2>Who we share it with</h2>
        <p>Our hosting, payment and email providers, under contract, and only what they need. We publish winners&rsquo; first name, surname initial and town. We never sell your data.</p>
        <h2>How long we keep it</h2>
        <p>Account data while your account is open, and order records for six years for tax purposes.</p>
        <h2>Your rights</h2>
        <p>
          You can ask to see, correct, delete or move your data, or object to how we use it. You can also complain to the Information Commissioner&rsquo;s Office
          (ico.org.uk).
        </p>
        <h2>Cookies</h2>
        <p>
          We use only what&rsquo;s needed for the site to work: your basket, account and preferences are stored in your browser. We don&rsquo;t use advertising or
          tracking cookies. If we add analytics, we&rsquo;ll ask first.
        </p>
      </Prose>
    </>
  );
}
