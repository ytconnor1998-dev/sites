"use client";

import { competitions, freeTicketsFor, getCompetition, lineTotal, type Competition } from "@/config/competitions";
import { createStore } from "./store";

export type BasketItem = { slug: string; qty: number; answer: number };

const store = createStore<BasketItem[]>("wtl-basket", []);

export const useBasket = store.use;

export function addToBasket(slug: string, qty: number, answer: number) {
  const c = getCompetition(slug);
  if (!c) return;
  store.set((items) => {
    const existing = items.find((i) => i.slug === slug);
    if (existing) {
      return items.map((i) => (i.slug === slug ? { ...i, qty: Math.min(c.maxPerPerson, i.qty + qty), answer } : i));
    }
    return [...items, { slug, qty: Math.min(c.maxPerPerson, qty), answer }];
  });
}

export function setQty(slug: string, qty: number) {
  store.set((items) => items.map((i) => (i.slug === slug ? { ...i, qty: Math.max(1, qty) } : i)));
}

export function removeFromBasket(slug: string) {
  store.set((items) => items.filter((i) => i.slug !== slug));
}

export function clearBasket() {
  store.set([]);
}

export type BasketLine = BasketItem & { comp: Competition; free: number; total: number };

export function basketLines(items: BasketItem[]): BasketLine[] {
  return items.flatMap((i) => {
    const comp = competitions.find((c) => c.slug === i.slug);
    if (!comp) return [];
    return [{ ...i, comp, free: freeTicketsFor(comp, i.qty), total: lineTotal(comp, i.qty) }];
  });
}
