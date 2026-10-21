"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/* Mobil pastki nav ko'rinishi — "classic" (hozirgi, to'liq kenglik),
   "glassDock" (suzuvchi glass bar + markazda ko'tarilgan "+") yoki
   "glassSplit" (glass kapsula + yonida alohida "+" doira). Faqat vizual
   tanlov — localStorage'da saqlanadi (bugun-style-store.ts bilan bir xil
   naqsh). Default har doim "classic". */

export type MobileNavStyle = "classic" | "glassDock" | "glassSplit";

const STORAGE_KEY = "unumly:mobilenav:style";
const DEFAULT_STYLE: MobileNavStyle = "classic";
const VALID: MobileNavStyle[] = ["classic", "glassDock", "glassSplit"];

/** Glass nav'dagi "+" bosilganda yuboriladi. Sahifa o'z qo'shish oynasini
 *  ochsa — preventDefault() qiladi; aks holda "Yangi task" oynasi ochiladi. */
export const MOBILE_ADD_EVENT = "unumly:mobile-add";
export const OPEN_NEW_TASK_EVENT = "unumly:open-new-task";

let style: MobileNavStyle = DEFAULT_STYLE;
let hydrated = false;
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnapshot() { return style; }
function getServerSnapshot(): MobileNavStyle { return DEFAULT_STYLE; }

function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) as MobileNavStyle | null;
    if (saved && saved !== style && VALID.includes(saved)) { style = saved; emit(); }
  } catch { /* ignore */ }
}

export function setMobileNavStyle(next: MobileNavStyle) {
  style = next;
  emit();
  try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
}

export function useMobileNavStyle(): MobileNavStyle {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { hydrateOnce(); }, []);
  return value;
}

/** Glass nav'ning "+" tugmasi — sahifa o'z FAB'i o'rniga shu orqali ochadi.
 *  Qaytaradi: FAB yashirilishi kerakmi (glass uslub tanlangan). */
export function useMobileAdd(onAdd: () => void): boolean {
  const navStyle = useMobileNavStyle();
  const onAddRef = useRef(onAdd);
  useEffect(() => { onAddRef.current = onAdd; });
  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      onAddRef.current();
    }
    window.addEventListener(MOBILE_ADD_EVENT, handler);
    return () => window.removeEventListener(MOBILE_ADD_EVENT, handler);
  }, []);
  return navStyle !== "classic";
}

export function triggerMobileAdd() {
  const ev = new Event(MOBILE_ADD_EVENT, { cancelable: true });
  window.dispatchEvent(ev);
  if (!ev.defaultPrevented) window.dispatchEvent(new Event(OPEN_NEW_TASK_EVENT));
}
