"use client";

import Link from "next/link";
import { CookieSettingsButton } from "@/components/ui/CookieBanner";
import { contact, site } from "@/config/site";
import { useT } from "@/lib/i18n";

export function Footer() {
  const t = useT();
  const year = new Date().getFullYear();
  const link = "hover:text-ink hover:underline";
  return (
    <footer className="bg-paper">
      <div className="mx-auto grid max-w-[1280px] gap-8 border-t border-line px-5 py-12 text-sm sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-lg font-semibold tracking-tight">{site.name}</p>
          <p className="mt-1 text-muted">{t.footer.based}</p>
          <p className="mt-4 text-muted">
            © {year} {site.name} · {t.footer.vat} {site.vatNumber}
          </p>
        </div>
        <ul className="space-y-1.5 text-muted">
          <li>
            <a className={link} href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
          </li>
          <li>
            <a className={link} href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer">
              WhatsApp {contact.phoneDisplay}
            </a>
          </li>
          <li>
            <a className={link} href={contact.instagram} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          </li>
        </ul>
        <nav aria-label={t.footer.legalNav}>
          <ul className="space-y-1.5 text-muted">
            <li>
              <Link className={link} href="/privacy">
                {t.footer.privacy}
              </Link>
            </li>
            <li>
              <Link className={link} href="/cookies">
                {t.footer.cookies}
              </Link>
            </li>
            <li>
              <Link className={link} href="/terms">
                {t.footer.terms}
              </Link>
            </li>
            <li>
              <Link className={link} href="/legal">
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
