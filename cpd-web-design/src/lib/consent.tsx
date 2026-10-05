"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * Cookie consent, following the Italian Garante's cookie guidelines (June 2021):
 * nothing optional runs until the visitor opts in, rejecting is as easy as
 * accepting, and the choice is remembered for 6 months before asking again.
 *
 * Categories: "necessary" is always on (language + this choice, in localStorage).
 * "external" covers third-party content that sets cookies: Google Maps on the demos.
 * If you add analytics later, add a category here, gate the script on it,
 * and list it in the cookie policy (src/content/legal.ts).
 */
export type Consent = { external: boolean };

const STORAGE_KEY = "cpd-consent";
const VERSION = 1; // bump to ask everyone again after adding a category
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 182; // ~6 months

type Stored = Consent & { v: number; at: number };

type ConsentContextValue = {
  /** null until the visitor has chosen (or before storage has been read). */
  consent: Consent | null;
  /** True once storage has been read on the client. */
  ready: boolean;
  save: (consent: Consent) => void;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
};

const ConsentContext = createContext<ConsentContextValue>({
  consent: null,
  ready: false,
  save: () => {},
  settingsOpen: false,
  openSettings: () => {},
  closeSettings: () => {},
});

function read(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (s.v !== VERSION || typeof s.at !== "number" || Date.now() - s.at > MAX_AGE_MS) return null;
    return { external: s.external === true };
  } catch {
    return null;
  }
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    // Reading browser-only storage after hydration is intentional here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(read());
    setReady(true);
  }, []);

  const save = useCallback((next: Consent) => {
    setConsent(next);
    setSettingsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, v: VERSION, at: Date.now() } satisfies Stored));
    } catch {
      /* storage blocked: the choice lasts for this visit only */
    }
  }, []);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  return (
    <ConsentContext.Provider value={{ consent, ready, save, settingsOpen, openSettings, closeSettings }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  return useContext(ConsentContext);
}
