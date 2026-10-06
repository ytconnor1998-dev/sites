"use client";

import { getCompetition, type Competition } from "@/config/competitions";
import type { BasketLine } from "./basket";
import { createStore } from "./store";

export type Entry = {
  orderId: string;
  slug: string;
  title: string;
  tickets: number[];
  correct: boolean;
  instantWins: { ticket: number; prize: string }[];
  paid: number;
  createdAt: string;
};

const store = createStore<Entry[]>("wtl-entries", []);
export const useEntries = store.use;

/**
 * DEMO ONLY: picks random unused ticket numbers in the browser. On a live site the
 * server allocates numbers (so no two people get the same one) and checks instant wins.
 */
function allocate(c: Competition, count: number) {
  const taken = new Set(store.get().filter((e) => e.slug === c.slug).flatMap((e) => e.tickets));
  const picked = new Set<number>();
  // In the demo, make sure people can see an instant win: unclaimed winning numbers are
  // a little more likely to come up than they would be for real.
  const unclaimed = (c.instantWins ?? []).flatMap((w) => w.tickets.filter((t) => !w.claimed.includes(t) && !taken.has(t)));
  if (unclaimed.length && Math.random() < 0.35) picked.add(unclaimed[Math.floor(Math.random() * unclaimed.length)]);
  while (picked.size < count) {
    const n = 1 + Math.floor(Math.random() * c.maxTickets);
    if (!taken.has(n)) picked.add(n);
  }
  return [...picked].sort((a, b) => a - b);
}

export function placeOrder(lines: BasketLine[]) {
  const orderId = `WTL-${Date.now().toString(36).toUpperCase()}`;
  const createdAt = new Date().toISOString();
  const made: Entry[] = lines.map((l) => {
    const c = getCompetition(l.slug)!;
    const tickets = allocate(c, l.qty + l.free);
    const instantWins = (c.instantWins ?? []).flatMap((w) =>
      tickets.filter((t) => w.tickets.includes(t) && !w.claimed.includes(t)).map((t) => ({ ticket: t, prize: w.prize })),
    );
    return {
      orderId,
      slug: c.slug,
      title: c.title,
      tickets,
      correct: l.answer === c.question.answer,
      instantWins,
      paid: l.total,
      createdAt,
    };
  });
  store.set((prev) => [...made, ...prev]);
  return { orderId, entries: made };
}
