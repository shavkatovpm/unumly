"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { Plan, PlanPriority, PlanScope } from "@/lib/types";

const STORAGE_KEY = "unumly:plans:v1";
const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

function purgeExpiredTrash(plans: State): State {
  const cutoff = Date.now() - TRASH_TTL_MS;
  return plans.filter((p) => {
    if (!p.deletedAt) return true;
    const t = Date.parse(p.deletedAt);
    if (Number.isNaN(t)) return true;
    return t >= cutoff;
  });
}

function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const purged = purgeExpiredTrash(parsed as State);
        memoryState = purged;
        if (purged.length !== (parsed as State).length) {
          persist();
        }
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

/** Soft delete — moves a plan to trash. Trash auto-purges after 30 days. */
export function removePlan(id: string): void {
  const now = new Date().toISOString();
  memoryState = memoryState.map((p) =>
    p.id === id ? { ...p, deletedAt: now } : p
  );
  persist();
  emit();
}

export function removeManyPlans(ids: string[]): void {
  if (ids.length === 0) return;
  const set = new Set(ids);
  const now = new Date().toISOString();
  memoryState = memoryState.map((p) =>
    set.has(p.id) ? { ...p, deletedAt: now } : p
  );
  persist();
  emit();
}

/** Restore a soft-deleted plan back to its previous state. */
export function restorePlan(id: string): void {
  memoryState = memoryState.map((p) => {
    if (p.id !== id) return p;
    const { deletedAt: _deletedAt, ...rest } = p;
    void _deletedAt;
    return rest;
  });
  persist();
  emit();
}

/** Hard delete — permanently removes from storage. */
export function purgePlan(id: string): void {
  memoryState = memoryState.filter((p) => p.id !== id);
  persist();
  emit();
}

export function purgeManyPlans(ids: string[]): void {
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

/** Active (non-deleted) plans only. Use this for Bugun/Agenda/Kalendar/Reja. */
export function usePlans() {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    hydrateOnce();
  }, []);

  const plans = useMemo(() => all.filter((p) => !p.deletedAt), [all]);

  return {
    plans,
    create: createPlan,
    update: updatePlan,
    toggleStatus: togglePlanStatus,
    remove: removePlan,
    removeMany: removeManyPlans,
    restore: restorePlan,
    purge: purgePlan,
    purgeMany: purgeManyPlans,
  };
}

/** All completed (status === DONE) plans not in trash. Used by /bajarilgan. */
export function useCompletedPlans() {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    hydrateOnce();
  }, []);

  return useMemo(
    () => all.filter((p) => p.status === "DONE" && !p.deletedAt),
    [all]
  );
}

/** All soft-deleted plans. Used by /ochirilgan. */
export function useDeletedPlans() {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    hydrateOnce();
  }, []);

  return useMemo(() => all.filter((p) => !!p.deletedAt), [all]);
}
