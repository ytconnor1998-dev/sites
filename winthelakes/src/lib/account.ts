"use client";

import { createStore } from "./store";

/**
 * DEMO ONLY: the player's account lives in their browser. On a live site this is
 * a real login backed by your database.
 */
export type Account = {
  name: string;
  email: string;
  /** Site credit in pence, spent automatically at checkout. */
  credit: number;
  /** Safer play: monthly spend limit in pence (0 = no limit). */
  monthlyLimit: number;
  /** Safer play: no entries allowed until this date (ISO), if set. */
  breakUntil: string | null;
  /** Spend this calendar month, in pence, keyed "2026-10". */
  spent: Record<string, number>;
};

const empty: Account = { name: "", email: "", credit: 0, monthlyLimit: 0, breakUntil: null, spent: {} };
const store = createStore<Account>("wtl-account", empty);

export const useAccount = store.use;
export const updateAccount = (patch: Partial<Account> | ((a: Account) => Partial<Account>)) =>
  store.set((a) => ({ ...a, ...(typeof patch === "function" ? patch(a) : patch) }));
export const getAccount = store.get;

export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export function spentThisMonth(a: Account) {
  return a.spent[monthKey()] ?? 0;
}

export function onBreak(a: Account) {
  return !!a.breakUntil && new Date(a.breakUntil).getTime() > Date.now();
}

/** Value in pence of an instant-win prize that pays out as site credit, else 0. */
export function creditValue(prize: string) {
  const m = /£([\d,]+)\s+site credit/i.exec(prize);
  return m ? Number(m[1].replace(/,/g, "")) * 100 : 0;
}

/** True if someone born on `dob` (YYYY-MM-DD) has had their `years`th birthday. */
export function isAtLeast(dob: string, years: number) {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return d <= cutoff;
}
