"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { Category, CategoryColor } from "@/lib/types";

const STORAGE_KEY = "unumly:categories:v1";
const SEEDED_KEY = "unumly:categories:seeded";

const DEFAULTS: Category[] = [
  { id: "ish",       label: "Ish",       color: "red",  order: 0 },
  { id: "organish",  label: "O'rganish", color: "blue", order: 1 },
];

type State = Category[];

let memoryState: State = [];
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
  } catch {
    /* ignore */
  }
}

function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const seeded = window.localStorage.getItem(SEEDED_KEY) === "1";
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryState = parsed as State;
      }
    }
    // Seed defaults only on the very first init (so user can delete defaults later)
    if (!seeded && memoryState.length === 0) {
      memoryState = [...DEFAULTS];
      persist();
      window.localStorage.setItem(SEEDED_KEY, "1");
    }
    emit();
  } catch {
    /* ignore */
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): State {
  return memoryState;
}

const EMPTY_STATE: State = [];
function getServerSnapshot(): State {
  return EMPTY_STATE;
}

function nextId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useCategories() {
  const categories = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    hydrateOnce();
  }, []);

  const create = useCallback(
    (input: { label: string; color: CategoryColor }): string => {
      const cat: Category = {
        id: nextId(),
        label: input.label.trim(),
        color: input.color,
        order: memoryState.length,
      };
      memoryState = [...memoryState, cat];
      persist();
      emit();
      return cat.id;
    },
    []
  );

  const update = useCallback((id: string, patch: Partial<Category>) => {
    memoryState = memoryState.map((c) => (c.id === id ? { ...c, ...patch } : c));
    persist();
    emit();
  }, []);

  const remove = useCallback((id: string) => {
    memoryState = memoryState.filter((c) => c.id !== id);
    persist();
    emit();
  }, []);

  const sorted = [...categories].sort((a, b) => a.order - b.order);
  return { categories: sorted, create, update, remove };
}
