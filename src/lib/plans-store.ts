"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { Plan, PlanPriority, PlanScope } from "@/lib/types";
import { playOnCreate } from "@/lib/sounds";
import * as actions from "@/lib/plans-actions";

/* ════════════════════════════════════════════════════════════
   Plans store — in-memory cache backed by server actions.
   Optimistic UI: mutators update local state immediately and
   fire the server action in the background; failed calls roll
   the local state back. Reads come from cache; cache is
   hydrated on first hook usage via listPlans().
   ════════════════════════════════════════════════════════════ */

type State = Plan[];

let memoryState: State = [];
let hydrated = false;
let hydrating = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function nextId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function hydrateOnce() {
  if (hydrated || hydrating || typeof window === "undefined") return;
  hydrating = true;
  void actions
    .listPlans()
    .then((rows) => {
      memoryState = rows;
      hydrated = true;
      emit();
    })
    .catch(() => {
      // Unauthenticated or network — leave cache empty
      hydrated = true;
    })
    .finally(() => {
      hydrating = false;
    });
}

/** Force a re-fetch from the server (used after first-login import). */
export async function refreshPlans(): Promise<void> {
  try {
    const rows = await actions.listPlans();
    memoryState = rows;
    hydrated = true;
    emit();
  } catch {
    /* swallow */
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

const EMPTY: State = [];
function getServerSnapshot(): State {
  return EMPTY;
}

export type CreatePlanInput = {
  id?: string;
  title: string;
  notes?: string;
  scope?: PlanScope;
  scheduledFor: string;
  time?: string;
  duration?: number;
  priority?: PlanPriority;
};

/* ─── Optimistic mutators ─────────────────────────────────── */

export function createPlan(input: CreatePlanInput): string {
  const now = new Date().toISOString();
  const id = input.id ?? nextId();
  const plan: Plan = {
    id,
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
  emit();
  playOnCreate();

  void actions
    .createPlan({ ...input, id })
    .then((server) => {
      memoryState = memoryState.map((p) => (p.id === id ? server : p));
      emit();
    })
    .catch(() => {
      memoryState = memoryState.filter((p) => p.id !== id);
      emit();
    });

  return id;
}

export function upsertPlan(plan: Plan): void {
  const exists = memoryState.find((p) => p.id === plan.id);
  const prev = exists ? { ...exists } : null;
  if (exists) {
    memoryState = memoryState.map((p) => (p.id === plan.id ? { ...p, ...plan } : p));
  } else {
    memoryState = [...memoryState, plan];
  }
  emit();

  void actions
    .upsertPlan({
      id: plan.id,
      title: plan.title,
      notes: plan.notes,
      scope: plan.scope,
      priority: plan.priority,
      scheduledFor: plan.scheduledFor,
      time: plan.time,
      duration: plan.duration,
    })
    .then((server) => {
      memoryState = memoryState.map((p) => (p.id === plan.id ? server : p));
      emit();
    })
    .catch(() => {
      if (prev) {
        memoryState = memoryState.map((p) => (p.id === plan.id ? prev : p));
      } else {
        memoryState = memoryState.filter((p) => p.id !== plan.id);
      }
      emit();
    });
}

export function updatePlan(id: string, patch: Partial<Plan>): void {
  const prev = memoryState.find((p) => p.id === id);
  if (!prev) return;
  memoryState = memoryState.map((p) => (p.id === id ? { ...p, ...patch } : p));
  emit();

  // Convert TS Plan patch to server-action patch (Plan["priority"] → can be null)
  const serverPatch: actions.UpdatePlanPatch = {
    ...(patch.title !== undefined && { title: patch.title }),
    ...(patch.notes !== undefined && { notes: patch.notes ?? null }),
    ...(patch.scope !== undefined && { scope: patch.scope }),
    ...(patch.status !== undefined && { status: patch.status }),
    ...(patch.priority !== undefined && { priority: patch.priority ?? null }),
    ...(patch.scheduledFor !== undefined && { scheduledFor: patch.scheduledFor }),
    ...(patch.time !== undefined && { time: patch.time ?? null }),
    ...(patch.duration !== undefined && { duration: patch.duration ?? null }),
    ...(patch.order !== undefined && { order: patch.order }),
    ...(patch.completedAt !== undefined && { completedAt: patch.completedAt ?? null }),
  };

  void actions
    .updatePlan(id, serverPatch)
    .then((server) => {
      memoryState = memoryState.map((p) => (p.id === id ? server : p));
      emit();
    })
    .catch(() => {
      memoryState = memoryState.map((p) => (p.id === id ? prev : p));
      emit();
    });
}

export function togglePlanStatus(id: string): void {
  const prev = memoryState.find((p) => p.id === id);
  if (!prev) return;
  const nowDone = prev.status !== "DONE";
  const optimistic: Plan = {
    ...prev,
    status: nowDone ? "DONE" : "TODO",
    completedAt: nowDone ? new Date().toISOString() : undefined,
  };
  memoryState = memoryState.map((p) => (p.id === id ? optimistic : p));
  emit();
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("unumly:plan-toggled", { detail: { id, done: nowDone } })
    );
  }

  void actions
    .togglePlanStatus(id)
    .then((server) => {
      memoryState = memoryState.map((p) => (p.id === id ? server : p));
      emit();
    })
    .catch(() => {
      memoryState = memoryState.map((p) => (p.id === id ? prev : p));
      emit();
    });
}

/** Soft delete — moves a plan to trash. Trash auto-purges after 30 days. */
export function removePlan(id: string): void {
  const prev = memoryState.find((p) => p.id === id);
  if (!prev) return;
  const now = new Date().toISOString();
  memoryState = memoryState.map((p) => (p.id === id ? { ...p, deletedAt: now } : p));
  emit();

  void actions.removePlan(id).catch(() => {
    memoryState = memoryState.map((p) => (p.id === id ? prev : p));
    emit();
  });
}

export function removeManyPlans(ids: string[]): void {
  if (ids.length === 0) return;
  const set = new Set(ids);
  const prevs = memoryState.filter((p) => set.has(p.id));
  const now = new Date().toISOString();
  memoryState = memoryState.map((p) => (set.has(p.id) ? { ...p, deletedAt: now } : p));
  emit();

  void actions.removeManyPlans(ids).catch(() => {
    const back = new Map(prevs.map((p) => [p.id, p]));
    memoryState = memoryState.map((p) => back.get(p.id) ?? p);
    emit();
  });
}

export function restorePlan(id: string): void {
  const prev = memoryState.find((p) => p.id === id);
  if (!prev) return;
  memoryState = memoryState.map((p) => {
    if (p.id !== id) return p;
    const { deletedAt: _ignored, ...rest } = p;
    void _ignored;
    return rest;
  });
  emit();

  void actions.restorePlan(id).catch(() => {
    memoryState = memoryState.map((p) => (p.id === id ? prev : p));
    emit();
  });
}

export function purgePlan(id: string): void {
  const prev = memoryState.find((p) => p.id === id);
  if (!prev) return;
  memoryState = memoryState.filter((p) => p.id !== id);
  emit();

  void actions.purgePlan(id).catch(() => {
    memoryState = [...memoryState, prev];
    emit();
  });
}

export function purgeManyPlans(ids: string[]): void {
  if (ids.length === 0) return;
  const set = new Set(ids);
  const prevs = memoryState.filter((p) => set.has(p.id));
  memoryState = memoryState.filter((p) => !set.has(p.id));
  emit();

  void actions.purgeManyPlans(ids).catch(() => {
    memoryState = [...memoryState, ...prevs];
    emit();
  });
}

export function getPlanById(id: string): Plan | undefined {
  return memoryState.find((p) => p.id === id);
}

/* ─── React hooks ─────────────────────────────────────────── */

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

export function useDeletedPlans() {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    hydrateOnce();
  }, []);

  return useMemo(() => all.filter((p) => !!p.deletedAt), [all]);
}
