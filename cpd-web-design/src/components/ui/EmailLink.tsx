"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { contact } from "@/config/site";
import { useL, useT } from "@/lib/i18n";

/**
 * Email link that works for everyone: it opens the visitor's email app (mailto),
 * and also copies the address, because many computers have no email app set up
 * (Gmail in the browser, for example) and a mailto link then does nothing.
 */
export function EmailLink({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  const t = useT();
  const tr = useL();
  const [copied, setCopied] = useState(false);
  const address = tr(contact.email);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = () => {
    navigator.clipboard?.writeText(address).then(
      () => setCopied(true),
      () => {},
    );
  };

  return (
    <a href={`mailto:${address}?subject=${encodeURIComponent(t.contact.mailSubject)}`} onClick={copy} className={className}>
      {copied ? (
        <>
          <Check aria-hidden className="size-[1.15em] shrink-0" />
          <span>{t.contact.emailCopied}</span>
        </>
      ) : (
        (children ?? address)
      )}
      <span className="sr-only" aria-live="polite">
        {copied ? t.contact.emailCopied : ""}
      </span>
    </a>
  );
}
