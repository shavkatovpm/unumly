"use client";

import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { isEditableElement } from "@/lib/utils";

/* Telefon oynalari uchun: klaviaturaning kech keladigan signallariga
   (--tg-vh, visualViewport) qarab ikki marta o'lchanmaslik uchun yozish
   boshlanishi bilan klaviatura joyi oldindan ajratiladi. Oyna va tugmalar
   klaviatura chiqib bo'lgach qimirlamaydi. */

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const KEYBOARD_MIN = 120;
const KEYBOARD_RATIO = 0.42; // o'lchanmaguncha: telefon klaviaturasining odatiy ulushi
const KEYBOARD_KEY = "unumly:keyboard-height";
const SETTLE_MS = 400;

// Klaviaturasiz ekran balandligi (oynalar orasida saqlanadi).
let screenHeight = 0;
let keyboardCache: number | null = null;

function loadKeyboardHeight(): number | null {
  if (keyboardCache === null) {
    try {
      keyboardCache = Number(localStorage.getItem(KEYBOARD_KEY)) || null;
    } catch {
      keyboardCache = null;
    }
  }
  return keyboardCache;
}

function saveKeyboardHeight(height: number) {
  keyboardCache = height;
  try {
    localStorage.setItem(KEYBOARD_KEY, String(height));
  } catch {}
}

export type KeyboardArea = {
  /** Klaviaturasiz balandlik; o'lchanmaguncha null. */
  fullHeight: number | null;
  /** Yozish paytida klaviatura ustidagi balandlik, aks holda fullHeight. */
  visibleHeight: number | null;
  /** iOS sahifani yuqoriga sursa — shunga moslanadi. */
  top: number;
  typing: boolean;
  /** Ochilib bo'ldi: endi o'lcham o'zgarishi silliq bo'lishi mumkin. */
  settled: boolean;
};

export function useKeyboardArea(ref: RefObject<HTMLElement | null>, active: boolean): KeyboardArea {
  const [fullHeight, setFullHeight] = useState<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [typing, setTyping] = useState(false);
  const [top, setTop] = useState(0);
  const [settled, setSettled] = useState(false);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const vv = window.visualViewport;
    const current = () => vv?.height ?? window.innerHeight;

    screenHeight = isEditableElement(document.activeElement) ? Math.max(screenHeight, current()) : current();
    setFullHeight(screenHeight);
    setKeyboardHeight(loadKeyboardHeight() ?? Math.round(screenHeight * KEYBOARD_RATIO));

    const sync = () => setTyping(touch && el.contains(document.activeElement) && isEditableElement(document.activeElement));
    const onFocusOut = () => window.setTimeout(sync, 0);
    sync();
    el.addEventListener("focusin", sync);
    el.addEventListener("focusout", onFocusOut);

    function update() {
      const h = current();
      const measured = Math.round(screenHeight - h);
      if (!touch || measured <= KEYBOARD_MIN) screenHeight = h;
      setFullHeight(screenHeight);
      setTop(Math.max(0, vv?.offsetTop ?? 0));
      if (!touch || measured <= KEYBOARD_MIN) return;
      saveKeyboardHeight(measured);
      // Keyingi ochilishda aniq o'lcham; ochiq oyna faqat tugma yopilib qolsa o'zgaradi.
      setKeyboardHeight((cur) => Math.max(cur, measured));
    }
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    const timer = window.setTimeout(() => setSettled(true), SETTLE_MS);

    return () => {
      window.clearTimeout(timer);
      el.removeEventListener("focusin", sync);
      el.removeEventListener("focusout", onFocusOut);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      setSettled(false);
      setTyping(false);
    };
  }, [ref, active]);

  return {
    fullHeight,
    visibleHeight: fullHeight === null ? null : typing ? fullHeight - keyboardHeight : fullHeight,
    top,
    typing,
    settled,
  };
}
