"use client";

import { useEffect, useState } from "react";

export type Remaining = { days: number; hours: number; minutes: number; seconds: number; ended: boolean };

function remaining(target: number, now: number): Remaining {
  const ms = Math.max(0, target - now);
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60, ended: ms === 0 };
}

/** Ticks every second. Returns null until mounted, so server and client HTML match. */
export function useCountdown(iso: string): Remaining | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return now === null ? null : remaining(new Date(iso).getTime(), now);
}
