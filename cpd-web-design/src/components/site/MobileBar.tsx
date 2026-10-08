"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { site, whatsappUrl } from "@/config/site";
import { useConsent } from "@/lib/consent";
import { fill, useHref, useT } from "@/lib/i18n";
import { btn } from "./Section";

/**
 * Phones only: a slim bar fixed to the bottom with WhatsApp and the free mockup.
 * Hidden while the cookie banner is open and while the contact section is on screen.
 */
export function MobileBar() {
  const t = useT();
  const href = useHref();
  const { ready, consent, settingsOpen } = useConsent();
  const [contactVisible, setContactVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById("contact");
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setContactVisible(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const show = ready && consent !== null && !settingsOpen && !contactVisible;

  return (
    <div
      aria-hidden={!show}
      inert={!show}
      className={`fixed inset-x-0 bottom-0 z-[55] border-t border-line bg-paper/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-200 lg:hidden ${show ? "translate-y-0" : "translate-y-full"}`}
    >
      <div className="mx-auto flex max-w-md gap-2">
        <a
          href={whatsappUrl(fill(t.contact.waPreset, { name: site.owner.name }))}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn.secondary} min-h-11 flex-1 gap-2 px-4 text-sm`}
        >
          <MessageCircle aria-hidden className="size-4" />
          WhatsApp
        </a>
        <Link href={href("/#contact")} className={`${btn.primary} min-h-11 flex-[1.4] px-4 text-sm`}>
          {t.nav.cta}
        </Link>
      </div>
    </div>
  );
}
