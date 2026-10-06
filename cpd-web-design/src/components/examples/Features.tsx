"use client";

import { Layers, X } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import type { FeatureDef } from "@/content/examples/types";
import { useHref, useL } from "@/lib/i18n";

type Ctx = { show: boolean; features: FeatureDef[] };
const FeatureCtx = createContext<Ctx>({ show: false, features: [] });

const ui = {
  badge: { en: "Example site by CPD Web Design", it: "Sito di esempio di CPD Web Design" },
  cta: { en: "Get one like this free", it: "Ottienine uno così, gratis" },
  show: { en: "Show features", it: "Mostra funzioni" },
  hide: { en: "Hide features", it: "Nascondi funzioni" },
};

/**
 * Wraps a demo site: provides the "Features" overlay state and renders the
 * floating CPD badge + toggle. Feature labels come from the demo's data file.
 */
export function ExampleChrome({ features, children }: { features: FeatureDef[]; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const tr = useL();
  const href = useHref();

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShow(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show]);

  return (
    <FeatureCtx.Provider value={{ show, features }}>
      {children}

      {/* Floating CPD badge + feature toggle. Uses CPD branding on purpose. */}
      <div
        className="fixed bottom-3 left-3 z-[70] flex max-w-[calc(100vw-5.5rem)] flex-col gap-2 font-[family-name:var(--font-schibsted)] sm:bottom-5 sm:left-5 sm:max-w-none sm:flex-row sm:items-stretch"
        role="region"
        aria-label={tr(ui.badge)}
      >
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          className={`inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-[4px] border-2 border-[#14257F] px-4 text-sm font-semibold shadow-lg transition-colors ${
            show ? "bg-[#FFC94D] text-[#14257F]" : "bg-[#FFFFFF] text-[#14257F] hover:bg-white"
          }`}
        >
          {show ? <X aria-hidden className="size-4" /> : <Layers aria-hidden className="size-4" />}
          {show ? tr(ui.hide) : tr(ui.show)}
          <span className="rounded-full bg-[#14257F] px-2 py-0.5 text-xs text-[#FFFFFF]">{features.length}</span>
        </button>
        <Link
          href={href("/#contact")}
          className="group inline-flex min-h-11 items-center gap-3 rounded-[4px] bg-[#14257F] py-1.5 pr-4 pl-1.5 text-[#FFFFFF] shadow-lg"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[3px] bg-[#2340D9] text-[11px] font-black tracking-tight text-[#FFC94D]">CPD</span>
          <span className="text-xs leading-tight sm:text-sm">
            <span className="block opacity-80">{tr(ui.badge)}</span>
            <span className="block font-semibold text-[#FFC94D] group-hover:underline">{tr(ui.cta)}</span>
          </span>
        </Link>
      </div>
    </FeatureCtx.Provider>
  );
}

/**
 * Marks a part of a demo page as a feature. When the overlay is on, it gets an
 * outline and a label explaining what it does and which plan includes it.
 */
export function FeatureZone({
  id,
  children,
  className = "",
  as: Comp = "div",
  labelPosition = "top-left",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "header" | "footer" | "nav" | "aside";
  labelPosition?: "top-left" | "top-right" | "bottom-left" | "below" | "below-right" | "below-nav";
}) {
  const { show, features } = useContext(FeatureCtx);
  const tr = useL();
  const index = features.findIndex((f) => f.id === id);
  const feature = features[index];

  const pos = {
    "top-left": "top-3 left-3",
    "top-right": "top-3 right-3",
    "bottom-left": "bottom-3 left-3",
    below: "top-full left-0 mt-2",
    "below-right": "top-full right-0 mt-2",
    "below-nav": "top-24 left-3",
  }[labelPosition];

  return (
    <Comp className={`relative ${className}`}>
      {children}
      {show && feature && (
        <>
          <span aria-hidden className="pointer-events-none absolute inset-1 z-40 rounded-md border-2 border-dashed border-[#D9346B] bg-[#D9346B]/[0.04]" />
          <span
            role="note"
            className={`absolute ${pos} z-50 w-max max-w-[min(17rem,calc(100vw-2rem))] rounded-md bg-[#14257F] p-3 text-left font-[family-name:var(--font-schibsted)] text-[#FFFFFF] shadow-xl`}
          >
            <span className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#D9346B] text-xs font-bold text-[#14257F]">{index + 1}</span>
              <span className="text-sm leading-tight font-bold">{tr(feature.label)}</span>
            </span>
            <span className="mt-1.5 block text-xs leading-snug text-[#D5DDF7]">{tr(feature.description)}</span>
          </span>
        </>
      )}
    </Comp>
  );
}
