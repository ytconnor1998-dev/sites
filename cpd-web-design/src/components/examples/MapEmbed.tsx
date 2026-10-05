"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { useConsent } from "@/lib/consent";
import { useL } from "@/lib/i18n";

const labels = {
  load: { en: "Show interactive map", it: "Mostra mappa interattiva" },
  note: { en: "Loads Google Maps, which sets cookies", it: "Carica Google Maps, che imposta cookie" },
  title: { en: "Map", it: "Mappa" },
};

/**
 * Click-to-load Google Map: keeps the page fast (no 1MB+ iframe on load) and
 * sets no Google cookies until the visitor opts in, either by allowing
 * "External content" in the cookie banner or by clicking this map.
 * No API key needed for this embed style.
 */
export function MapEmbed({ query, className = "", tone = { bg: "#e8e0d2", fg: "#15120e" } }: { query: string; className?: string; tone?: { bg: string; fg: string } }) {
  const tr = useL();
  const { consent } = useConsent();
  const [clicked, setClicked] = useState(false);
  const loaded = clicked || consent?.external === true;
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: tone.bg, color: tone.fg }}>
      {loaded ? (
        <iframe title={`${tr(labels.title)}: ${query}`} src={src} className="absolute inset-0 size-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      ) : (
        <>
          {/* Stylised street-grid placeholder */}
          <svg aria-hidden className="absolute inset-0 size-full opacity-25" preserveAspectRatio="none" viewBox="0 0 400 300">
            <g stroke="currentColor" fill="none">
              <path d="M-10 60 L410 110" strokeWidth="10" />
              <path d="M-10 210 Q200 160 410 240" strokeWidth="6" />
              <path d="M90 -10 L140 310" strokeWidth="6" />
              <path d="M260 -10 Q240 150 300 310" strokeWidth="9" />
              <path d="M-10 150 L410 170" strokeWidth="2" />
              <path d="M30 -10 L60 310 M190 -10 L200 310 M340 -10 L370 310" strokeWidth="2" />
            </g>
          </svg>
          <div className="relative flex size-full flex-col items-center justify-center gap-3 p-6 text-center">
            <MapPin aria-hidden className="size-9" />
            <button type="button" onClick={() => setClicked(true)} className="min-h-11 cursor-pointer rounded-full border-2 border-current px-5 font-semibold" style={{ background: tone.bg }}>
              {tr(labels.load)}
            </button>
            <span className="text-xs opacity-80">{tr(labels.note)}</span>
          </div>
        </>
      )}
    </div>
  );
}

export const directionsUrl = (query: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
