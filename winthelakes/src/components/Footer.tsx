import Link from "next/link";
import { categories } from "@/config/competitions";
import { site } from "@/config/site";
import { LogoMark } from "./Logo";

const cols = [
  {
    title: "Competitions",
    links: [{ href: "/competitions", label: "All competitions" }, ...categories.map((c) => ({ href: `/competitions?c=${c.id}`, label: c.label }))],
  },
  {
    title: "Results",
    links: [
      { href: "/winners", label: "Winners" },
      { href: "/draws", label: "Draw results" },
      { href: "/draws#entry-lists", label: "Entry lists" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/faq", label: "Questions" },
      { href: "/free-entry", label: "Enter free by post" },
      { href: "/safer-play", label: "Safer play" },
      { href: `mailto:${site.email}`, label: "Email us" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-28 bg-ink text-map">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <LogoMark className="h-10 w-10" />
          <p className="mt-4 max-w-[30ch] text-sm leading-relaxed text-map/75">
            Prize competitions run from Windermere. Main prizes are drawn live on{" "}
            <a href={site.social.facebook} className="link text-map" rel="noopener" target="_blank">
              Facebook
            </a>
            .
          </p>
        </div>
        {cols.map((col) => (
          <div key={col.title}>
            <h2 className="text-sm font-semibold">{col.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-map/70 hover:text-map hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-map/15">
        <div className="mx-auto max-w-6xl space-y-1 px-4 py-6 text-xs text-map/65 sm:px-6">
          <p>
            You must be {site.minAge} or over and live in the UK to enter. Every competition can be entered free by post.
          </p>
          <p>
            © {new Date().getFullYear()} {site.company.legalName}, company number {site.company.number}, {site.company.address}.
          </p>
        </div>
      </div>
    </footer>
  );
}
