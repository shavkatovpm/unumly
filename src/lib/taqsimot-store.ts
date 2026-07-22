"use client";

import { useEffect, useSyncExternalStore } from "react";
import * as focusActions from "@/lib/taqsimot-actions";
import * as settingsActions from "@/lib/user-settings-actions";
import { DEFAULT_WEEKLY_CAPACITY } from "@/lib/kategoriya";

/* Loyihalar taqsimoti — sig'im/foiz sozlamalari + joriy haftalik tally
   (ProjectFocusLog). projects-store.ts bilan bir xil naqsh: xotiradagi
   cache, optimistik yangilash, server action bilan orqa fonda moslashtirish. */

const DEFAULT_PCT: Record<string, number> = { A: 50, B: 30, C: 15, D: 5 };

let capacity: number[] = DEFAULT_WEEKLY_CAPACITY;
let categoryPct: Record<string, number> = DEFAULT_PCT;
let focus: Record<string, number> = {};
let hydrated = false;
let hydrating = false;
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

function hydrateOnce() {
  if (hydrated || hydrating || typeof window === "undefined") return;
  hydrating = true;
  void Promise.all([settingsActions.getTaqsimotSettings(), focusActions.getFocusCounts()])
    .then(([settings, counts]) => {
      if (settings) {
        capacity = settings.weeklyCapacity;
        categoryPct = settings.categoryPct;
      }
      focus = counts;
      hydrated = true;
      emit();
    })
    .catch(() => {
      hydrated = true;
      emit();
    })
    .finally(() => {
      hydrating = false;
    });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getCapacity() { return capacity; }
function getPct() { return categoryPct; }
function getFocus() { return focus; }
function serverCapacity() { return DEFAULT_WEEKLY_CAPACITY; }
function serverPct() { return DEFAULT_PCT; }
const EMPTY_FOCUS: Record<string, number> = {};
function serverFocus() { return EMPTY_FOCUS; }

export function setCapacityDay(i: number, val: number) {
  const prev = capacity;
  capacity = capacity.map((v, idx) => (idx === i ? val : v));
  emit();
  void settingsActions
    .updateTaqsimotSettings({ weeklyCapacity: capacity })
    .catch(() => {
      capacity = prev;
      emit();
    });
}

export function setCategoryPct(kat: string, val: number) {
  const prev = categoryPct;
  categoryPct = { ...categoryPct, [kat]: val };
  emit();
  void settingsActions
    .updateTaqsimotSettings({ categoryPct })
    .catch(() => {
      categoryPct = prev;
      emit();
    });
}

export function incFocus(id: string) {
  const prev = focus;
  focus = { ...focus, [id]: (focus[id] ?? 0) + 1 };
  emit();
  void focusActions
    .incFocus(id)
    .then((count) => {
      focus = { ...focus, [id]: count };
      emit();
    })
    .catch(() => {
      focus = prev;
      emit();
    });
}

export function decFocus(id: string) {
  const prev = focus;
  focus = { ...focus, [id]: Math.max(0, (focus[id] ?? 0) - 1) };
  emit();
  void focusActions
    .decFocus(id)
    .then((count) => {
      focus = { ...focus, [id]: count };
      emit();
    })
    .catch(() => {
      focus = prev;
      emit();
    });
}

export function useTaqsimotSettings() {
  const cap = useSyncExternalStore(subscribe, getCapacity, serverCapacity);
  const pct = useSyncExternalStore(subscribe, getPct, serverPct);
  useEffect(() => {
    hydrateOnce();
  }, []);
  return { capacity: cap, categoryPct: pct, setCapacityDay, setCategoryPct };
}

export function useFocusCounts() {
  const f = useSyncExternalStore(subscribe, getFocus, serverFocus);
  useEffect(() => {
    hydrateOnce();
  }, []);
  return { focus: f, inc: incFocus, dec: decFocus };
}

export function useHydratedTaqsimot(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated, () => false);
}
