"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A scratch-off panel: drag (mouse or finger) to scratch, or press "Reveal".
 * The content underneath is always in the DOM for screen readers.
 */
export function ScratchCard({ children, onReveal, label = "Scratch to reveal" }: { children: React.ReactNode; onReveal?: () => void; label?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const drawing = useRef(false);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const g = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    g.addColorStop(0, "#c9d6dc");
    g.addColorStop(0.5, "#8fa3ad");
    g.addColorStop(1, "#d9e3e8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, rect.width, rect.height);
    // Mountain pattern on the foil
    ctx.fillStyle = "#ffffff30";
    for (let x = -40; x < rect.width; x += 70) {
      ctx.beginPath();
      ctx.moveTo(x, rect.height);
      ctx.lineTo(x + 35, rect.height - 40);
      ctx.lineTo(x + 70, rect.height);
      ctx.fill();
    }
    ctx.fillStyle = "#0a141c";
    ctx.font = "800 20px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label.toUpperCase(), rect.width / 2, rect.height / 2);
  }, [label]);

  function finish() {
    if (revealed) return;
    setRevealed(true);
    onReveal?.();
  }

  function scratch(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || revealed) return;
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const r = c.getBoundingClientRect();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(e.clientX - r.left, e.clientY - r.top, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  function checkCleared() {
    const c = canvas.current;
    if (!c || revealed) return;
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let clear = 0;
    for (let i = 3; i < data.length; i += 64) if (data[i] === 0) clear++;
    if (clear / (data.length / 64) > 0.45) finish();
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div aria-live="polite">{children}</div>
      <canvas
        ref={canvas}
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full cursor-grab touch-none transition-opacity duration-500 ${revealed ? "pointer-events-none opacity-0" : ""}`}
        onPointerDown={(e) => {
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          scratch(e);
        }}
        onPointerMove={scratch}
        onPointerUp={() => {
          drawing.current = false;
          checkCleared();
        }}
      />
      {!revealed && (
        <button type="button" onClick={finish} className="eyebrow absolute right-3 bottom-3 rounded-full bg-night px-3 py-1.5 text-[0.62rem] text-mist">
          Reveal
        </button>
      )}
    </div>
  );
}
