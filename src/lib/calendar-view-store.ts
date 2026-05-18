"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const KEY = "unumly:kalendar-view:v1";

export type CalendarView = "kun" | "hafta" | "oy" | "yil";

const DEFAULT: CalendarView = "kun";
const ALL: CalendarView[] = ["kun", "hafta", "oy", "yil"];

let current: CalendarView = DEFAULT;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY) as CalendarView | null;
    if (raw && ALL.includes(raw)) {
      current = raw;
      emit();
    }
  } catch {
    // ignore
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): CalendarView {
  return current;
}

function getServerSnapshot(): CalendarView {
  return DEFAULT;
}

export function useCalendarView(): [CalendarView, (v: CalendarView) => void] {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    hydrateOnce();
  }, []);

  const setValue = useCallback((next: CalendarView) => {
    current = next;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(KEY, next);
      }
    } catch {
      // ignore
    }
    emit();
  }, []);

  return [value, setValue];
}
