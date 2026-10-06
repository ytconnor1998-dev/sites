"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that rolls into place like the counter on a draw machine.
 * Rolls when it first scrolls into view, and again whenever `value` changes.
 */
export function Odometer({ value, pad = 0, className = "", prefix = "" }: { value: number; pad?: number; className?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const text = value.toLocaleString("en-GB", { minimumIntegerDigits: pad || 1, useGrouping: pad === 0 });
  return (
    <span ref={ref} className={`tabular inline-flex items-end leading-none ${className}`} aria-label={`${prefix}${text}`}>
      {prefix && (
        <span aria-hidden="true" className="leading-none whitespace-pre">
          {prefix}
        </span>
      )}
      {[...text].map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} aria-hidden="true" className="relative inline-block h-[1em] overflow-hidden leading-none">
            <span
              className="flex flex-col transition-transform ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{
                transform: `translateY(-${shown ? Number(ch) + 10 : 0}em)`,
                transitionDuration: `${1200 + i * 180}ms`,
              }}
            >
              {Array.from({ length: 20 }, (_, n) => (
                <span key={n} className="h-[1em]">
                  {n % 10}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} aria-hidden="true" className="leading-none">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
