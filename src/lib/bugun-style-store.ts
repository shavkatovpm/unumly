"use client";

import { useEffect, useSyncExternalStore } from "react";

/* Bugun'dagi task ro'yxatining ko'rinishi — "classic" (hozirgi, ixcham) yoki
   "wide" (kattaroq, alohida karta har bir task uchun, katta ekran uchun
   mo'ljallangan). Faqat vizual tanlov — localStorage'da saqlanadi (server
   sinxronizatsiyasi shart emas, workspace-store.ts'dagi tema tanlovi bilan
   bir xil naqsh). Default har doim "classic".*/

export type BugunTaskStyle = "classic" | "wide";

const STORAGE_KEY = "unumly:bugun:taskStyle";
const DEFAULT_STYLE: BugunTaskStyle = "classic";

let style: BugunTaskStyle = DEFAULT_STYLE;
let hydrated = false;
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnapshot() { return style; }
function getServerSnapshot(): BugunTaskStyle { return DEFAULT_STYLE; }

function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "wide") { style = "wide"; emit(); }
  } catch { /* ignore */ }
}

export function setBugunTaskStyle(next: BugunTaskStyle) {
  style = next;
  emit();
  try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
}

export function useBugunTaskStyle(): BugunTaskStyle {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { hydrateOnce(); }, []);
  return value;
}
