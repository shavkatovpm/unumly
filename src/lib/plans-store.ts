"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Plan, PlanPriority, PlanScope } from "@/lib/types";

const STORAGE_KEY = "unumly:plans:v1";

type State = Plan[];

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
    // ignore
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
        memoryState = parsed as State;
        emit();
      }
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

export type CreatePlanInput = {
  id?: string; // optional — used by sync (mirror an idea with same id)
  title: string;
  notes?: string;
  scope?: PlanScope;
  scheduledFor: string;
  time?: string;
  duration?: number;
  priority?: PlanPriority;
};

/* ─── Module-level mutators (callable from anywhere, including other stores) ─── */

export function createPlan(input: CreatePlanInput): string {
  const now = new Date().toISOString();
  const plan: Plan = {
    id: input.id ?? nextId(),
    title: input.title.trim(),
    notes: input.notes,
    scope: input.scope ?? "DAILY",
    status: "TODO",
    scheduledFor: input.scheduledFor,
    time: input.time,
    duration: input.duration,
    priority: input.priority,
    createdAt: now,
    order: memoryState.length,
  };
  memoryState = [...memoryState, plan];
  persist();
  emit();
  return plan.id;
}

export function upsertPlan(plan: Plan): void {
  const exists = memoryState.find((p) => p.id === plan.id);
  if (exists) {
    memoryState = memoryState.map((p) => (p.id === plan.id ? { ...p, ...plan } : p));
  } else {
    memoryState = [...memoryState, plan];
  }
  persist();
  emit();
}

export function updatePlan(id: string, patch: Partial<Plan>): void {
  memoryState = memoryState.map((p) => (p.id === id ? { ...p, ...patch } : p));
  persist();
  emit();
}

export function togglePlanStatus(id: string): void {
  let newDone = false;
  memoryState = memoryState.map((p) => {
    if (p.id !== id) return p;
    const done = p.status === "DONE";
    newDone = !done;
    return {
      ...p,
      status: done ? "TODO" : "DONE",
      completedAt: done ? undefined : new Date().toISOString(),
    };
  });
  persist();
  emit();
  // Notify any cross-store listeners (e.g. ideas-store) about the toggle
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("unumly:plan-toggled", { detail: { id, done: newDone } })
    );
  }
}

export function removePlan(id: string): void {
  memoryState = memoryState.filter((p) => p.id !== id);
  persist();
  emit();
}

export function removeManyPlans(ids: string[]): void {
  if (ids.length === 0) return;
  const set = new Set(ids);
  memoryState = memoryState.filter((p) => !set.has(p.id));
  persist();
  emit();
}

export function getPlanById(id: string): Plan | undefined {
  return memoryState.find((p) => p.id === id);
}

/* ─── React hook ─── */

export function usePlans() {
  const plans = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    hydrateOnce();
  }, []);

  return {
    plans,
    create: createPlan,
    update: updatePlan,
    toggleStatus: togglePlanStatus,
    remove: removePlan,
    removeMany: removeManyPlans,
  };
}
