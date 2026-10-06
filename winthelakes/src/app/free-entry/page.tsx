import type { Metadata } from "next";
import { Prose } from "@/components/Prose";
import { PageHero } from "@/components/Section";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Free postal entry", description: "How to enter any Win the Lakes competition for free by post." };

export default function FreeEntryPage() {
  return (
    <>
      <PageHero eyebrow="No purchase necessary" title="Free postal entry" intro="You can enter every competition for free. Postal entries have exactly the same chance of winning as paid ones." />
      <Prose>
        <h2>How to enter by post</h2>
        <p>Send an unenclosed postcard (first or second class) to:</p>
        <p className="rounded-2xl border border-line bg-deep p-5 font-bold !text-mist">
          {site.company.legalName}
          <br />
          {site.company.address.split(", ").map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </p>
        <p>On the postcard, write clearly:</p>
        <ol>
          <li>The name of the competition you&rsquo;re entering</li>
          <li>Your answer to its question</li>
          <li>Your full name, address, phone number and date of birth</li>
          <li>The email address on your Win the Lakes account</li>
        </ol>
        <h2>The rules</h2>
        <ul>
          <li>One postcard = one entry. Limit of one postcard per person per competition per day.</li>
          <li>It must arrive before the competition closes. We aren&rsquo;t responsible for post that&rsquo;s lost or late.</li>
          <li>Illegible, incomplete or bulk entries (several in one envelope) aren&rsquo;t accepted.</li>
          <li>You&rsquo;ll get a ticket number by email, and it&rsquo;s shown in the entry list.</li>
          <li>Free entries can&rsquo;t win instant prizes that were already won before the entry was processed.</li>
        </ul>
      </Prose>
    </>
  );
}
