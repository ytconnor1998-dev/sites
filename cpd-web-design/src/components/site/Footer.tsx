"use client";

import Link from "next/link";
import { CookieSettingsButton } from "@/components/ui/CookieBanner";
import { EmailLink } from "@/components/ui/EmailLink";
import { contact, site, whatsappUrl } from "@/config/site";
import { industries } from "@/content/industries";
import { fill, useHref, useL, useT } from "@/lib/i18n";

export function Footer() {
  const t = useT();
  const href = useHref();
  const tr = useL();
  const year = new Date().getFullYear();
  const link = "hover:text-ink hover:underline";
  return (
    <footer className="bg-paper">
      <div className="mx-auto grid max-w-[1280px] gap-8 border-t border-line px-5 pt-12 pb-28 text-sm sm:px-8 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:pb-12">
        <div>
          <p className="text-lg font-semibold tracking-tight">{site.name}</p>
          <p className="mt-1 text-muted">{t.footer.based}</p>
          <p className="mt-4 text-muted">
            © {year} {site.name}
            {site.vatNumber && ` · ${t.footer.vat} ${site.vatNumber}`}
          </p>
        </div>
        <ul className="space-y-1.5 text-muted">
          <li>
            <EmailLink className={`inline-flex items-center gap-1.5 ${link}`} />
          </li>
          <li>
            <a className={link} href={whatsappUrl(fill(t.contact.waPreset, { name: site.owner.name }))} target="_blank" rel="noopener noreferrer">
              WhatsApp {contact.phoneDisplay}
            </a>
          </li>
          <li>
            <a className={link} href={contact.instagram} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          </li>
        </ul>
        <nav aria-label={t.industryPage.footerTitle}>
          <p className="font-semibold text-ink">{t.industryPage.footerTitle}</p>
          <ul className="mt-2 space-y-1.5 text-muted">
            {industries.map((i) => (
              <li key={i.slug}>
                <Link className={link} href={href(`/websites/${i.slug}`)}>
                  {tr(i.name)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t.footer.legalNav}>
          <ul className="space-y-1.5 text-muted">
            <li>
              <Link className={link} href={href("/privacy")}>
                {t.footer.privacy}
              </Link>
            </li>
            <li>
              <Link className={link} href={href("/cookies")}>
                {t.footer.cookies}
              </Link>
            </li>
            <li>
              <Link className={link} href={href("/terms")}>
                {t.footer.terms}
              </Link>
            </li>
            <li>
              <Link className={link} href={href("/legal")}>
                {t.footer.legal}
              </Link>
            </li>
            <li>
              <CookieSettingsButton className={link}>{t.footer.cookieSettings}</CookieSettingsButton>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
