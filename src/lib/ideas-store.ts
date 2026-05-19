"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { Idea } from "@/lib/types";

// Map old hardcoded enum values → new default category IDs, for migration
const LEGACY_CATEGORY_MAP: Record<string, string> = {
  ish: "ish",
  "o'rganish": "organish",
  shaxsiy: "ish",        // orphan migrated to Ish (no Shaxsiy default)
  salomatlik: "ish",     // orphan migrated to Ish
};

const STORAGE_KEY = "unumly:ideas:v1";

type State = Idea[];

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
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Migrate old `category` field → new `categoryId`
        const migrated = (parsed as Array<Record<string, unknown>>).map((item) => {
          const rec = { ...item } as Record<string, unknown>;
          if (!rec.categoryId && typeof rec.category === "string") {
            rec.categoryId = LEGACY_CATEGORY_MAP[rec.category] ?? rec.category;
            delete rec.category;
          }
          return rec as unknown as Idea;
        });
        memoryState = migrated;
        persist();
        emit();
      }
    }
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

export type CreateIdeaInput = {
  title: string;
  categoryId: string;
  notes?: string;
};

export function useIdeas() {
  const ideas = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    hydrateOnce();
  }, []);

  const create = useCallback((input: CreateIdeaInput): string => {
    const now = new Date().toISOString();
    const idea: Idea = {
      id: nextId(),
      title: input.title.trim(),
      categoryId: input.categoryId,
      notes: input.notes,
      done: false,
      createdAt: now,
      order: memoryState.length,
    };
    memoryState = [...memoryState, idea];
    persist();
    emit();
    return idea.id;
  }, []);

  const update = useCallback((id: string, patch: Partial<Idea>) => {
    memoryState = memoryState.map((i) => (i.id === id ? { ...i, ...patch } : i));
    persist();
    emit();
  }, []);

  const toggleDone = useCallback((id: string) => {
    memoryState = memoryState.map((i) =>
      i.id === id ? { ...i, done: !i.done } : i
    );
    persist();
    emit();
  }, []);

  const remove = useCallback((id: string) => {
    memoryState = memoryState.filter((i) => i.id !== id);
    persist();
    emit();
  }, []);

  return { ideas, create, update, toggleDone, remove };
}
