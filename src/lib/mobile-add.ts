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

/* Mono oyna ochiq paytda nav'dagi "+" × bo'ladi va shu oynani yopadi. */

let sheetClose: (() => void) | null = null;
const sheetListeners = new Set<() => void>();
function subscribeSheet(cb: () => void) { sheetListeners.add(cb); return () => { sheetListeners.delete(cb); }; }
function setSheetClose(next: (() => void) | null) { sheetClose = next; for (const l of sheetListeners) l(); }

export function useMobileSheetCloseValue(): (() => void) | null {
  return useSyncExternalStore(subscribeSheet, () => sheetClose, () => null);
}

export function useMobileSheetClose(onClose: () => void): void {
  const ref = useRef(onClose);
  useEffect(() => { ref.current = onClose; });
  useEffect(() => {
    const own = () => ref.current();
    setSheetClose(own);
    return () => { if (sheetClose === own) setSheetClose(null); };
  }, []);
}

export function triggerMobileAdd() {
  const ev = new Event(MOBILE_ADD_EVENT, { cancelable: true });
  window.dispatchEvent(ev);
  if (!ev.defaultPrevented) window.dispatchEvent(new Event(OPEN_NEW_TASK_EVENT));
}
