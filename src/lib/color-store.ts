"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const KEY = "unumly:theme:v1";

export type ThemeId = "mono" | "noir";

const DEFAULT: ThemeId = "mono";

let current: ThemeId = DEFAULT;
let hydrated = false;
let systemListenerAttached = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function applyToDom(id: ThemeId) {
  if (typeof document === "undefined") return;
  if (id === DEFAULT) {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = id;
  }
}

function hasUserOverride(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw === "mono" || raw === "noir";
  } catch {
    return false;
  }
}

function systemTheme(): ThemeId {
  if (typeof window === "undefined" || !window.matchMedia) return DEFAULT;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "noir" : "mono";
}

function attachSystemListener() {
  if (systemListenerAttached || typeof window === "undefined" || !window.matchMedia) return;
  systemListenerAttached = true;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => {
    // Only follow the system if the user hasn't explicitly chosen
    if (hasUserOverride()) return;
    current = e.matches ? "noir" : "mono";
    applyToDom(current);
    emit();
  };
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", handler);
  } else if (typeof (mq as MediaQueryList & { addListener?: (cb: (e: MediaQueryListEvent) => void) => void }).addListener === "function") {
    (mq as MediaQueryList & { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener(handler);
  }
}

function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY) as ThemeId | null;
    if (raw === "mono" || raw === "noir") {
      current = raw;
    } else {
      current = systemTheme();
    }
    applyToDom(current);
    emit();
  } catch {
    // ignore
  }
  attachSystemListener();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): ThemeId {
  return current;
}

function getServerSnapshot(): ThemeId {
  return DEFAULT;
}

export function useTheme(): {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  toggle: () => void;
} {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    hydrateOnce();
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    current = next;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(KEY, next);
      }
    } catch {
      // ignore
    }
    applyToDom(next);
    emit();
  }, []);

  const toggle = useCallback(() => {
    setTheme(current === "mono" ? "noir" : "mono");
  }, [setTheme]);

  return { theme, setTheme, toggle };
}
