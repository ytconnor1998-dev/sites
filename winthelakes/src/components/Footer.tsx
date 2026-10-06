import Link from "next/link";
import { categories } from "@/config/competitions";
import { site } from "@/config/site";
import { Logo } from "./Logo";

const cols = [
  {
    title: "Competitions",
    links: [{ href: "/competitions", label: "All competitions" }, ...categories.map((c) => ({ href: `/competitions?c=${c.id}`, label: c.label }))],
  },
  {
    title: "Winners",
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
      { href: "/faq", label: "FAQ" },
      { href: "/free-entry", label: "Free postal entry" },
      { href: "/safer-play", label: "Safer play" },
      { href: `mailto:${site.email}`, label: "Contact us" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms & conditions" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-deep">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-fog">
            Prize competitions from the Lake District. Every main draw is streamed live and every winner is published.
          </p>
          <div className="mt-5 flex gap-2">
            {Object.entries(site.social).map(([name, href]) => (
              <a key={name} href={href} className="eyebrow rounded-full border border-line-2 px-3 py-1.5 text-[0.62rem] text-fog hover:border-lake hover:text-lake" rel="noopener" target="_blank">
                {name}
              </a>
            ))}
          </div>
        </div>
        {cols.map((col) => (
          <div key={col.title}>
            <h2 className="eyebrow text-lake">{col.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-fog transition-colors hover:text-mist">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-fog sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {site.company.legalName}. Company no. {site.company.number}. {site.company.address}.
          </p>
          <p>
            <strong className="text-mist">{site.minAge}+ only.</strong> Please play responsibly. Free entry route available on every competition.
          </p>
        </div>
      </div>
    </footer>
  );
}
