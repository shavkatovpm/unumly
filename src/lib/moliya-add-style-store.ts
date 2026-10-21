"use client";

import { useEffect, useSyncExternalStore } from "react";

/* Moliya'da yangi yozuv (kirim/chiqim) qo'shish oynasi ko'rinishi — faqat
   mobil uchun. "classic" (hozirgi forma) yoki "catFirst" (avval kategoriya,
   keyin summa). Faqat vizual tanlov — localStorage'da saqlanadi
   (bugun-style-store.ts bilan bir xil naqsh). Default har doim "classic". */

export type MoliyaAddStyle = "classic" | "catFirst";

const STORAGE_KEY = "unumly:moliya:addStyle";
const DEFAULT_STYLE: MoliyaAddStyle = "classic";
const VALID: MoliyaAddStyle[] = ["classic", "catFirst"];

let style: MoliyaAddStyle = DEFAULT_STYLE;
let hydrated = false;
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnapshot() { return style; }
function getServerSnapshot(): MoliyaAddStyle { return DEFAULT_STYLE; }

function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    let saved = window.localStorage.getItem(STORAGE_KEY);
    // Olib tashlangan "Avval summa" → "Avval kategoriya" (yangi oynani tanlagan edi).
    if (saved === "amountFirst") saved = "catFirst";
    if (saved && saved !== style && (VALID as string[]).includes(saved)) { style = saved as MoliyaAddStyle; emit(); }
  } catch { /* ignore */ }
}

export function setMoliyaAddStyle(next: MoliyaAddStyle) {
  style = next;
  emit();
  try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
}

export function useMoliyaAddStyle(): MoliyaAddStyle {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { hydrateOnce(); }, []);
  return value;
}
