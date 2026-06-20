"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { Plan, PlanPriority, PlanScope, Subtask } from "@/lib/types";
import { playOnCreate } from "@/lib/sounds";
import * as actions from "@/lib/plans-actions";
import { markHabitDay as markHabitDayAction } from "@/lib/habits-actions";

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
      emit();
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

/* ─── Background polling (cross-device sync) ──────────────── */

const POLL_INTERVAL_MS = 20 * 1000;
let pollTimer: number | null = null;
let pollSubscribers = 0;

// Mutation hisoblagichi — optimistik update kelganda polling natijasini
// ignor qilish uchun. Aks holda race: polling server'dan eski (mutation'gacha
// bo'lgan) ma'lumot qaytarib, lokal optimistik o'zgarishni bekor qiladi.
let pendingMutations = 0;
function withPending<T>(p: Promise<T>): Promise<T> {
  pendingMutations++;
  return p.finally(() => {
    pendingMutations = Math.max(0, pendingMutations - 1);
  });
}

function startPolling() {
  if (pollTimer !== null || typeof window === "undefined") return;
  pollTimer = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    if (pendingMutations > 0) return; // mutation in-flight — skip
    void actions
      .listPlans()
      .then((rows) => {
        // Mutation fetch davomida boshlanmagan ekanini ham tekshiramiz
        if (pendingMutations > 0) return;
        if (rowsEqual(rows, memoryState)) return;
        memoryState = rows;
        emit();
      })
      .catch(() => { /* unauthenticated or transient */ });
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

function rowsEqual(a: Plan[], b: Plan[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.title !== y.title ||
      x.status !== y.status ||
      x.scheduledFor !== y.scheduledFor ||
      x.time !== y.time ||
      x.duration !== y.duration ||
      x.priority !== y.priority ||
      x.notifyLeadMin !== y.notifyLeadMin ||
      x.completedAt !== y.completedAt ||
      x.deletedAt !== y.deletedAt
    ) return false;
  }
  return true;
}

function maybeRefreshOnVisible() {
  if (document.visibilityState !== "visible") return;
  if (pendingMutations > 0) return; // mutation in-flight — skip
  // On tab focus, fetch immediately rather than waiting for the next tick
  void actions
    .listPlans()
    .then((rows) => {
      if (pendingMutations > 0) return;
      if (!rowsEqual(rows, memoryState)) {
        memoryState = rows;
        emit();
      }
    })
    .catch(() => { /* ignore */ });
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
  subtasks?: Subtask[];
  scope?: PlanScope;
  scheduledFor: string;
  time?: string;
  duration?: number;
  priority?: PlanPriority;
  notifyLeadMin?: number;
};

/* ─── Optimistic mutators ─────────────────────────────────── */

export function createPlan(input: CreatePlanInput): string {
  const now = new Date().toISOString();
  const id = input.id ?? nextId();
  const plan: Plan = {
    id,
    title: input.title.trim(),
    notes: input.notes,
    subtasks: input.subtasks,
    scope: input.scope ?? "DAILY",
    status: "TODO",
    scheduledFor: input.scheduledFor,
    time: input.time,
    duration: input.duration,
    priority: input.priority,
    notifyLeadMin: input.notifyLeadMin,
    createdAt: now,
    order: memoryState.length,
  };
  memoryState = [...memoryState, plan];
  emit();
  playOnCreate();

  void withPending(
    actions.createPlan({ ...input, id })
      .then((server) => {
        memoryState = memoryState.map((p) => (p.id === id ? server : p));
        emit();
      })
      .catch(() => {
        memoryState = memoryState.filter((p) => p.id !== id);
        emit();
      })
  );

  return id;
}

/** Odatni biror kun uchun bajarilgan deb belgilash — optimistik.
 *  O'tib ketgan kunlarda occurrence Plan mavjud bo'lmaydi, shuning uchun
 *  darhol vaqtinchalik DONE plan qo'shamiz, keyin server bilan moslaymiz. */
export function markHabitDay(habitId: string, date: string, title: string): void {
  // Shu habit+sana uchun plan allaqachon bo'lsa — qaytamiz (server ham idempotent).
  if (memoryState.some((p) => p.habitId === habitId && p.scheduledFor === date)) return;
  const id = nextId();
  const now = new Date().toISOString();
  const optimistic: Plan = {
    id,
    title: title.trim(),
    scope: "DAILY",
    status: "DONE",
    scheduledFor: date,
    completedAt: now,
    createdAt: now,
    order: 0,
    habitId,
  };
  memoryState = [...memoryState, optimistic];
  emit();

  void withPending(
    markHabitDayAction(habitId, date)
      .then(() => actions.listPlans())
      .then((rows) => { memoryState = rows; emit(); })
      .catch(() => { memoryState = memoryState.filter((p) => p.id !== id); emit(); })
  );
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

  void withPending(
    actions.upsertPlan({
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
    })
  );
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
    ...(patch.subtasks !== undefined && { subtasks: patch.subtasks }),
    ...(patch.scope !== undefined && { scope: patch.scope }),
    ...(patch.status !== undefined && { status: patch.status }),
    ...(patch.priority !== undefined && { priority: patch.priority ?? null }),
    ...(patch.scheduledFor !== undefined && { scheduledFor: patch.scheduledFor }),
    ...(patch.time !== undefined && { time: patch.time ?? null }),
    ...(patch.duration !== undefined && { duration: patch.duration ?? null }),
    ...(patch.notifyLeadMin !== undefined && { notifyLeadMin: patch.notifyLeadMin ?? null }),
    ...(patch.order !== undefined && { order: patch.order }),
    ...(patch.completedAt !== undefined && { completedAt: patch.completedAt ?? null }),
  };

  void withPending(
    actions.updatePlan(id, serverPatch)
      .then((server) => {
        memoryState = memoryState.map((p) => (p.id === id ? server : p));
        emit();
      })
      .catch(() => {
        memoryState = memoryState.map((p) => (p.id === id ? prev : p));
        emit();
      })
  );
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

  void withPending(
    actions.togglePlanStatus(id)
      .then((server) => {
        memoryState = memoryState.map((p) => (p.id === id ? server : p));
        emit();
      })
      .catch(() => {
        memoryState = memoryState.map((p) => (p.id === id ? prev : p));
        emit();
      })
  );
}

/** Soft delete — moves a plan to trash. Trash auto-purges after 30 days. */
export function removePlan(id: string): void {
  const prev = memoryState.find((p) => p.id === id);
  if (!prev) return;
  const now = new Date().toISOString();
  memoryState = memoryState.map((p) => (p.id === id ? { ...p, deletedAt: now } : p));
  emit();

  void withPending(
    actions.removePlan(id).catch(() => {
      memoryState = memoryState.map((p) => (p.id === id ? prev : p));
      emit();
    })
  );
}

export function removeManyPlans(ids: string[]): void {
  if (ids.length === 0) return;
  const set = new Set(ids);
  const prevs = memoryState.filter((p) => set.has(p.id));
  const now = new Date().toISOString();
  memoryState = memoryState.map((p) => (set.has(p.id) ? { ...p, deletedAt: now } : p));
  emit();

  void withPending(
    actions.removeManyPlans(ids).catch(() => {
      const back = new Map(prevs.map((p) => [p.id, p]));
      memoryState = memoryState.map((p) => back.get(p.id) ?? p);
      emit();
    })
  );
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

  void withPending(
    actions.restorePlan(id).catch(() => {
      memoryState = memoryState.map((p) => (p.id === id ? prev : p));
      emit();
    })
  );
}

export function purgePlan(id: string): void {
  const prev = memoryState.find((p) => p.id === id);
  if (!prev) return;
  memoryState = memoryState.filter((p) => p.id !== id);
  emit();

  void withPending(
    actions.purgePlan(id).catch(() => {
      memoryState = [...memoryState, prev];
      emit();
    })
  );
}

export function purgeManyPlans(ids: string[]): void {
  if (ids.length === 0) return;
  const set = new Set(ids);
  const prevs = memoryState.filter((p) => set.has(p.id));
  memoryState = memoryState.filter((p) => !set.has(p.id));
  emit();

  void withPending(
    actions.purgeManyPlans(ids).catch(() => {
      memoryState = [...memoryState, ...prevs];
      emit();
    })
  );
}

export function getPlanById(id: string): Plan | undefined {
  return memoryState.find((p) => p.id === id);
}

/* ─── React hooks ─────────────────────────────────────────── */

function useStoreLifecycle() {
  useEffect(() => {
    hydrateOnce();
    pollSubscribers++;
    startPolling();
    document.addEventListener("visibilitychange", maybeRefreshOnVisible);
    return () => {
      pollSubscribers--;
      document.removeEventListener("visibilitychange", maybeRefreshOnVisible);
      if (pollSubscribers <= 0) {
        pollSubscribers = 0;
        stopPolling();
      }
    };
  }, []);
}

/** Active (non-deleted) plans only. Use this for Bugun/Agenda/Kalendar/Reja. */
export function usePlans() {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useStoreLifecycle();
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
  useStoreLifecycle();
  return useMemo(
    () => all.filter((p) => p.status === "DONE" && !p.deletedAt),
    [all]
  );
}

export function useDeletedPlans() {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useStoreLifecycle();
  return useMemo(() => all.filter((p) => !!p.deletedAt), [all]);
}

/** Whether the initial hydrate-from-server has completed (success or failure). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false
  );
}
