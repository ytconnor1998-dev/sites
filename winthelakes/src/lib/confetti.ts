"use client";

const COLOURS = ["#f7c6d3", "#f6e27a", "#b9e4c9", "#bfddf3", "#d6cbef", "#f9cda8", "#ee5f1b"];

/** A burst of little paper tickets from a point on screen. Skipped if the visitor prefers reduced motion. */
export function confetti(x = window.innerWidth / 2, y = window.innerHeight / 2, count = 90) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "200" });
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const bits = Array.from({ length: count }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const v = 6 + Math.random() * 9;
    return {
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      w: 7 + Math.random() * 7,
      h: 4 + Math.random() * 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      c: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    };
  });

  const start = performance.now();
  function frame(t: number) {
    const age = t - start;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const b of bits) {
      b.vy += 0.32;
      b.vx *= 0.985;
      b.x += b.vx;
      b.y += b.vy;
      b.r += b.vr;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.r);
      ctx.globalAlpha = Math.max(0, 1 - age / 1800);
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    }
    if (age < 1800) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}
