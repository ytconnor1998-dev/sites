"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useConsent } from "@/lib/consent";
import { useHref, useT } from "@/lib/i18n";

/**
 * Shown on the first visit and whenever "Cookie settings" is clicked.
 * Accept and Reject are the same size and weight, and the X rejects,
 * as the Garante's guidelines ask. It doesn't block the page.
 */
export function CookieBanner() {
  const t = useT().cookieBanner;
  const href = useHref();
  const { consent, ready, save, settingsOpen, closeSettings } = useConsent();
  const [expanded, setExpanded] = useState(false);
  const [external, setExternal] = useState(false);
  const panel = useRef<HTMLElement>(null);

  const visible = ready && (consent === null || settingsOpen);

  // Opened from "Cookie settings": show the current choices and move focus here.
  useEffect(() => {
    if (!settingsOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpanded(true);
    setExternal(consent?.external ?? false);
    panel.current?.focus();
  }, [settingsOpen, consent]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (consent === null) save({ external: false });
      else closeSettings();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, consent, save, closeSettings]);

  if (!visible) return null;

  const button = "inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full border-2 border-ink px-4 text-sm font-semibold transition-colors hover:bg-ink hover:text-white";
  const close = () => (consent === null ? save({ external: false }) : closeSettings());

  return (
    <section
      ref={panel}
      tabIndex={-1}
      aria-labelledby="cookie-banner-title"
      className="fixed inset-x-3 bottom-3 z-[70] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-line bg-white p-5 text-ink shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)] outline-none sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-[25rem]"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id="cookie-banner-title" className="text-lg font-semibold">
          {t.title}
        </h2>
        <button type="button" onClick={close} aria-label={t.close} className="-m-2 inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-ink/5">
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        {t.body}{" "}
        <Link href={href("/cookies")} className="text-ink underline underline-offset-4">
          {t.policy}
        </Link>
      </p>

      {expanded && (
        <fieldset className="mt-4 space-y-3 border-t border-line pt-4">
          <legend className="sr-only">{t.title}</legend>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked disabled className="mt-1 size-4 shrink-0 accent-[var(--color-cobalt)]" />
            <span>
              <span className="block font-medium">
                {t.necessary} <span className="text-sm font-normal text-muted">({t.alwaysOn})</span>
              </span>
              <span className="block text-sm text-muted">{t.necessaryBody}</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={external} onChange={(e) => setExternal(e.target.checked)} className="mt-1 size-4 shrink-0 accent-[var(--color-cobalt)]" />
            <span>
              <span className="block font-medium">{t.external}</span>
              <span className="block text-sm text-muted">{t.externalBody}</span>
            </span>
          </label>
        </fieldset>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={button} onClick={() => save({ external: false })}>
          {t.reject}
        </button>
        <button type="button" className={button} onClick={() => save({ external: true })}>
          {t.accept}
        </button>
        {expanded ? (
          <button type="button" className={`${button} basis-full`} onClick={() => save({ external })}>
            {t.save}
          </button>
        ) : (
          <button type="button" className="min-h-11 basis-full cursor-pointer text-sm font-medium underline underline-offset-4" onClick={() => setExpanded(true)} aria-expanded={false}>
            {t.customise}
          </button>
        )}
      </div>
    </section>
  );
}

/** "Cookie settings" link-style button, for the footer and the cookie policy. */
export function CookieSettingsButton({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const { openSettings } = useConsent();
  return (
    <button type="button" onClick={openSettings} className={`cursor-pointer ${className}`}>
      {children}
    </button>
  );
}
