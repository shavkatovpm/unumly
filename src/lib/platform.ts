"use client";

import { useEffect, useState } from "react";

/** SSR'da false; mijozda navigator orqali aniqlanadi. */
export function detectMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const p =
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent ||
    "";
  return /mac/i.test(p);
}

/**
 * Mac'mi yo'qmi — gidratatsiya nomuvofiqligini oldini olish uchun mount'dan
 * keyin aniqlanadi (server doim "false" qaytaradi).
 */
export function useIsMac(): boolean {
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(detectMac()), []);
  return mac;
}

/** Modifikator belgisi: Mac → ⌘, boshqalar → Ctrl. */
export function modLabel(mac: boolean): string {
  return mac ? "⌘" : "Ctrl";
}

/** Shift belgisi: Mac → ⇧, boshqalar → Shift. */
export function shiftLabel(mac: boolean): string {
  return mac ? "⇧" : "Shift";
}
