"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Idea, Plan, PlanPriority } from "@/lib/types";
import {
  createPlan,
  getPlanById,
  removePlan,
  togglePlanStatus,
  updatePlan,
  upsertPlan,
} from "@/lib/plans-store";

const STORAGE_KEY = "unumly:ideas:v1";

// Map old hardcoded enum values → new default category IDs, for migration
const LEGACY_CATEGORY_MAP: Record<string, string> = {
  ish: "ish",
  "o'rganish": "organish",
  shaxsiy: "ish",
  salomatlik: "ish",
};

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

/* ─── Plan sync helpers ─── */

function planFromIdea(idea: Idea): Plan {
  return {
    id: idea.id,
    title: idea.title,
    notes: idea.notes,
    scope: "DAILY",
    status: idea.done ? "DONE" : "TODO",
    priority: idea.priority,
    scheduledFor: idea.scheduledFor!, // caller ensures present
    time: idea.time,
    duration: idea.duration,
    createdAt: idea.createdAt,
    completedAt: idea.done ? new Date().toISOString() : undefined,
    order: 0,
  };
}

function syncPlanFor(idea: Idea) {
  if (idea.scheduledFor) {
    upsertPlan(planFromIdea(idea));
  } else if (getPlanById(idea.id)) {
    removePlan(idea.id);
  }
}

/* ─── Module-level mutators ─── */

export function createIdea(input: CreateIdeaInput): string {
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
}

export function updateIdea(id: string, patch: Partial<Idea>): void {
  let updated: Idea | undefined;
  memoryState = memoryState.map((i) => {
    if (i.id !== id) return i;
    updated = { ...i, ...patch };
    return updated;
  });
  persist();
  emit();
  if (updated) syncPlanFor(updated);
}

export function toggleIdeaDone(id: string): void {
  let updated: Idea | undefined;
  memoryState = memoryState.map((i) => {
    if (i.id !== id) return i;
    updated = { ...i, done: !i.done };
    return updated;
  });
  persist();
  emit();
  if (updated && updated.scheduledFor) {
    // Mirror done state on the linked plan (without re-emitting back to us)
    const plan = getPlanById(updated.id);
    if (plan && (plan.status === "DONE") !== updated.done) {
      togglePlanStatus(updated.id);
    }
  }
}

export function removeIdea(id: string): void {
  memoryState = memoryState.filter((i) => i.id !== id);
  persist();
  emit();
  if (getPlanById(id)) removePlan(id);
}

export function getIdeaById(id: string): Idea | undefined {
  return memoryState.find((i) => i.id === id);
}

/* ─── Listen for plan toggles → mirror to idea ─── */

if (typeof window !== "undefined") {
  window.addEventListener("unumly:plan-toggled", (e: Event) => {
    const detail = (e as CustomEvent).detail as { id: string; done: boolean };
    const idea = memoryState.find((i) => i.id === detail.id);
    if (idea && idea.done !== detail.done) {
      memoryState = memoryState.map((i) =>
        i.id === detail.id ? { ...i, done: detail.done } : i
      );
      persist();
      emit();
    }
  });
}

/* ─── React hook ─── */

export function useIdeas() {
  const ideas = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    hydrateOnce();
  }, []);

  return {
    ideas,
    create: createIdea,
    update: updateIdea,
    toggleDone: toggleIdeaDone,
    remove: removeIdea,
  };
}
