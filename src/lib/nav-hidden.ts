"use client";

import { useEffect, useSyncExternalStore } from "react";

/* Mobil pastki nav'ni vaqtincha yashirish (masalan, Pomodoro fokus rejimida).
   Bir nechta joy so'rashi mumkin — hisoblagich bilan. */

let count = 0;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }

export function useNavHiddenValue(): boolean {
  return useSyncExternalStore(subscribe, () => count > 0, () => false);
}

/** `hidden` true bo'lgan paytda (va komponent ochiq turganda) nav yashirinadi. */
export function useHideNav(hidden: boolean): void {
  useEffect(() => {
    if (!hidden) return;
    count++; emit();
    return () => { count = Math.max(0, count - 1); emit(); };
  }, [hidden]);
}
