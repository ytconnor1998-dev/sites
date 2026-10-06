"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { translations, type Dict } from "@/content/translations";

export type Lang = "en" | "it";
export const LANGS: Lang[] = ["en", "it"];

/** A bilingual string. Used in config and demo data files. */
export type L = { en: string; it: string };

const STORAGE_KEY = "cpd-lang";

type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

const LangContext = createContext<LangContextValue>({ lang: "en", setLang: () => {} });
/** Lets a page with its own language URL (/ or /it) take over the site-wide language. */
const ClaimContext = createContext<(lang: Lang) => void>(() => {});

function savedLang(): Lang | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "en" || saved === "it" ? saved : null;
  } catch {
    return null;
  }
}

/**
 * Site-wide language. Main pages have a URL per language (see RouteLang);
 * the example sites switch language in place.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const claimed = useRef(false);

  const claim = useCallback((next: Lang) => {
    claimed.current = true;
    setLangState(next);
  }, []);

  // On first load (example sites only): saved choice → browser language → English.
  useEffect(() => {
    if (claimed.current) return;
    let initial: Lang = "en";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "it") initial = saved;
      else if (navigator.language?.toLowerCase().startsWith("it")) initial = "it";
    } catch {
      /* storage blocked: keep English */
    }
    // Syncing from browser-only storage after hydration is intentional here.
    if (initial !== "en") setLangState(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <ClaimContext.Provider value={claim}>
      <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
    </ClaimContext.Provider>
  );
}

/** "/privacy" → "/it/privacy" and back. Example sites have one URL for both languages. */
export function localePath(path: string, lang: Lang) {
  const stripped = path.replace(/^\/it(?=\/|#|$)/, "");
  const bare = stripped.startsWith("/") ? stripped : `/${stripped}`;
  if (lang === "en" || bare.startsWith("/examples/")) return bare;
  return bare === "/" ? "/it" : bare.startsWith("/#") ? `/it${bare.slice(1)}` : `/it${bare}`;
}

/** Internal link helper: `const href = useHref(); href("/privacy")`. */
export function useHref() {
  const { lang } = useLang();
  return useCallback((path: string) => localePath(path, lang), [lang]);
}

/**
 * Wraps a page that exists at its own language URL. Renders in that language on the
 * server (so Google indexes both), and the language switch goes to the other URL.
 * Visitors who chose Italian before, or whose browser is Italian, are sent from / to /it.
 */
export function RouteLang({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const claim = useContext(ClaimContext);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    claim(lang);
    document.documentElement.lang = lang;
    if (lang !== "en") return;
    const saved = savedLang();
    const wantsIt = saved === "it" || (!saved && navigator.language?.toLowerCase().startsWith("it"));
    if (wantsIt) router.replace(localePath(pathname, "it") + window.location.hash);
  }, [claim, lang, pathname, router]);

  const setLang = useCallback(
    (next: Lang) => {
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      if (next !== lang) router.push(localePath(pathname, next) + window.location.hash);
    },
    [lang, pathname, router],
  );

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <div lang={lang}>{children}</div>
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/** Main-site copy for the active language (from src/content/translations.ts). */
export function useT(): Dict {
  const { lang } = useLang();
  return translations[lang];
}

/** Returns a picker for bilingual values: `const tr = useL(); tr(item.name)`. */
export function useL() {
  const { lang } = useLang();
  return useCallback((value: L) => value[lang], [lang]);
}

/** Simple {placeholder} interpolation. */
export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}

export function formatEuro(amount: number, lang: Lang) {
  return new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    // Always "1.500 €": Node (which pre-renders the pages) and browsers disagree on 4-digit numbers otherwise.
    useGrouping: "always",
  } as Intl.NumberFormatOptions).format(amount);
}
