"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny localStorage-backed store shared across tabs.
 *
 * DEMO ONLY: the basket and "my tickets" live in the visitor's browser. A real
 * competition site must allocate tickets, take payment and record entries on a
 * server (see README → "Going live").
 */
export function createStore<T>(key: string, initial: T) {
  const listeners = new Set<() => void>();
  let cache: T = initial;
  let loaded = false;

  function read(): T {
    if (!loaded && typeof window !== "undefined") {
      loaded = true;
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) cache = JSON.parse(raw) as T;
      } catch {
        /* storage blocked: keep in memory */
      }
    }
    return cache;
  }

  function set(next: T | ((prev: T) => T)) {
    cache = typeof next === "function" ? (next as (prev: T) => T)(read()) : next;
    try {
      window.localStorage.setItem(key, JSON.stringify(cache));
    } catch {
      /* storage blocked: keep in memory */
    }
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      loaded = false;
      listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function use(): T {
    return useSyncExternalStore(subscribe, read, () => initial);
  }

  return { use, set, get: read };
}
