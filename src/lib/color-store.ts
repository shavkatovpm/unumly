"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/* Theme = oila (rang palitrasi) × rejim (light/dark). Oilalar globals.css'da
   [data-theme="..."][data-mode="..."] orqali belgilangan. */

export type ThemeFamily = "mono" | "ocean" | "graphite" | "raspberry" | "honey";
export type ThemeMode = "light" | "dark";

export const THEME_FAMILIES: { id: ThemeFamily; name: string }[] = [
  { id: "mono", name: "Mono" },
  { id: "ocean", name: "Ocean" },
  { id: "graphite", name: "Graphite" },
  { id: "raspberry", name: "Raspberry" },
  { id: "honey", name: "Honey" },
];
const FAMILY_IDS = THEME_FAMILIES.map((t) => t.id);

const FAMILY_KEY = "unumly:theme:family";
const MODE_KEY = "unumly:theme:mode";
const LEGACY_KEY = "unumly:theme:v1"; // eski: "mono" | "noir"

const DEFAULT_FAMILY: ThemeFamily = "mono";

let family: ThemeFamily = DEFAULT_FAMILY;
let mode: ThemeMode = "light";
let modeUserSet = false; // foydalanuvchi rejimni qo'lda tanladimi (system'ni kuzatish uchun)
let hydrated = false;
let systemListenerAttached = false;
const listeners = new Set<() => void>();

function emit() { for (const l of listeners) l(); }

function applyToDom() {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = family;
  document.documentElement.dataset.mode = mode;
}

function systemMode(): ThemeMode {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function attachSystemListener() {
  if (systemListenerAttached || typeof window === "undefined" || !window.matchMedia) return;
  systemListenerAttached = true;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => {
    if (modeUserSet) return; // foydalanuvchi tanlovi system'dan ustun
    mode = e.matches ? "dark" : "light";
    applyToDom();
    emit();
  };
  if (typeof mq.addEventListener === "function") mq.addEventListener("change", handler);
}

function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const f = window.localStorage.getItem(FAMILY_KEY);
    if (f && (FAMILY_IDS as string[]).includes(f)) family = f as ThemeFamily;

    const m = window.localStorage.getItem(MODE_KEY);
    if (m === "light" || m === "dark") {
      mode = m;
      modeUserSet = true;
    } else {
      // Eski sxemadan migratsiya: "noir" → dark, "mono" → light.
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy === "noir") { mode = "dark"; modeUserSet = true; }
      else if (legacy === "mono") { mode = "light"; modeUserSet = true; }
      else { mode = systemMode(); modeUserSet = false; }
    }
    applyToDom();
    emit();
  } catch {
    /* ignore */
  }
  attachSystemListener();
}

function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getFamilySnapshot(): ThemeFamily { return family; }
function getModeSnapshot(): ThemeMode { return mode; }
function getServerFamily(): ThemeFamily { return DEFAULT_FAMILY; }
function getServerMode(): ThemeMode { return "light"; }

export function useTheme() {
  const f = useSyncExternalStore(subscribe, getFamilySnapshot, getServerFamily);
  const m = useSyncExternalStore(subscribe, getModeSnapshot, getServerMode);

  useEffect(() => { hydrateOnce(); }, []);

  const setFamily = useCallback((next: ThemeFamily) => {
    family = next;
    try { window.localStorage.setItem(FAMILY_KEY, next); } catch { /* */ }
    applyToDom();
    emit();
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    mode = next;
    modeUserSet = true;
    try { window.localStorage.setItem(MODE_KEY, next); } catch { /* */ }
    applyToDom();
    emit();
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [setMode]);

  return { family: f, mode: m, isDark: m === "dark", setFamily, setMode, toggleMode };
}
