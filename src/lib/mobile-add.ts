"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/* Mobil pastki nav (glass dock) markazidagi "+" tugmasi — har bir sahifa
   o'z qo'shish amalini shu orqali ulaydi (sahifalarda alohida FAB yo'q). */

/** "+" bosilganda yuboriladi. Sahifa o'z qo'shish oynasini ochsa —
 *  preventDefault() qiladi; aks holda "Yangi task" oynasi ochiladi. */
export const MOBILE_ADD_EVENT = "unumly:mobile-add";
export const OPEN_NEW_TASK_EVENT = "unumly:open-new-task";

/** Sahifaning "+" amali. `enabled` — bir sahifada bir nechta tab bo'lsa,
 *  faqat ochiq tab ushlaydi. */
export function useMobileAdd(onAdd: () => void, enabled = true): void {
  const onAddRef = useRef(onAdd);
  useEffect(() => { onAddRef.current = onAdd; });
  useEffect(() => {
    if (!enabled) return;
    function handler(e: Event) {
      e.preventDefault();
      onAddRef.current();
    }
    window.addEventListener(MOBILE_ADD_EVENT, handler);
    return () => window.removeEventListener(MOBILE_ADD_EVENT, handler);
  }, [enabled]);
}

/* "+" bosilganda bitta amal o'rniga tanlovlar (masalan Moliya: Kirim /
   Chiqim) — nav ularni "+" ustida yelpig'ich bo'lib ochadi. Bir vaqtda
   faqat bitta sahifa/tab ro'yxatdan o'tkazadi. */

export type MobileAddChoice = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  color: string;
  onPick: () => void;
};

let choices: MobileAddChoice[] | null = null;
const choiceListeners = new Set<() => void>();
function subscribeChoices(cb: () => void) { choiceListeners.add(cb); return () => { choiceListeners.delete(cb); }; }
function getChoices() { return choices; }
function getServerChoices(): MobileAddChoice[] | null { return null; }
function setChoices(next: MobileAddChoice[] | null) { choices = next; for (const l of choiceListeners) l(); }

export function useMobileAddChoicesValue(): MobileAddChoice[] | null {
  return useSyncExternalStore(subscribeChoices, getChoices, getServerChoices);
}

export function useMobileAddChoices(list: MobileAddChoice[], enabled = true): void {
  const listRef = useRef(list);
  useEffect(() => { listRef.current = list; });
  useEffect(() => {
    if (!enabled) return;
    // Label/rang/ikona ro'yxatdan o'tganda olinadi; onPick har doim eng so'nggisi.
    const own = listRef.current.map((c, i) => ({ ...c, onPick: () => listRef.current[i]?.onPick() }));
    setChoices(own);
    return () => { if (choices === own) setChoices(null); };
  }, [enabled]);
}

export function triggerMobileAdd() {
  const ev = new Event(MOBILE_ADD_EVENT, { cancelable: true });
  window.dispatchEvent(ev);
  if (!ev.defaultPrevented) window.dispatchEvent(new Event(OPEN_NEW_TASK_EVENT));
}
