"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { Habit } from "@/lib/types";
import * as actions from "@/lib/habits-actions";
import { refreshPlans, markHabitDay as markHabitDayPlan } from "@/lib/plans-store";

/* Habits — in-memory cache backed by server actions. Each mutation also
   regenerates the rolling 1-week occurrence window (as Plan rows) and
   refreshes the plans cache, so Bugun/Agenda/Kalendar update immediately. */

type State = Habit[];
let memoryState: State = [];
let hydrated = false;
let hydrating = false;
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }
function nextId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); }

/** Client-local rolling window: today .. today+6 (YYYY-MM-DD). */
export function occurrenceWindow(): string[] {
  const out: string[] = [];
  const t = new Date(); t.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(t); d.setDate(d.getDate() + i);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
}

/** Regenerate occurrences for the window, then refresh the plans cache. */
export async function syncOccurrences(): Promise<void> {
  try { await actions.syncHabitOccurrences(occurrenceWindow()); await refreshPlans(); } catch { /* */ }
}

function hydrateOnce() {
  if (hydrated || hydrating || typeof window === "undefined") return;
  hydrating = true;
  void actions.listHabits()
    .then((rows) => { memoryState = rows; hydrated = true; emit(); })
    .catch(() => { hydrated = true; emit(); })
    .finally(() => { hydrating = false; });
}

export async function refreshHabits(): Promise<void> {
  try { memoryState = await actions.listHabits(); hydrated = true; emit(); } catch { /* */ }
}

const POLL_MS = 20 * 1000;
let pollTimer: number | null = null;
let subs = 0;
let pending = 0;
function withPending<T>(p: Promise<T>): Promise<T> { pending++; return p.finally(() => { pending = Math.max(0, pending - 1); }); }
function rowsEqual(a: State, b: State) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x.id !== y.id || x.title !== y.title || x.categoryId !== y.categoryId || x.time !== y.time || x.order !== y.order || x.archivedAt !== y.archivedAt || x.days.join(",") !== y.days.join(",")) return false;
  }
  return true;
}
function fetchReconcile() { if (pending > 0) return; void actions.listHabits().then((rows) => { if (pending > 0) return; if (!rowsEqual(rows, memoryState)) { memoryState = rows; emit(); } }).catch(() => {}); }
function startPoll() { if (pollTimer !== null || typeof window === "undefined") return; pollTimer = window.setInterval(() => { if (document.visibilityState !== "visible") return; fetchReconcile(); }, POLL_MS); }
function stopPoll() { if (pollTimer !== null) { window.clearInterval(pollTimer); pollTimer = null; } }
function onVisible() { if (document.visibilityState === "visible") fetchReconcile(); }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnapshot() { return memoryState; }
const EMPTY: State = [];
function getServerSnapshot() { return EMPTY; }

export type CreateHabitInput = { title: string; categoryId: string | null; days: number[]; time?: string; notifyLeadMin?: number };

export function createHabit(input: CreateHabitInput): string {
  const id = nextId();
  const habit: Habit = { id, title: input.title.trim(), categoryId: input.categoryId, days: [...input.days], time: input.time, notifyLeadMin: input.notifyLeadMin, order: memoryState.length };
  memoryState = [...memoryState, habit];
  emit();
  void withPending(actions.createHabit({ id, title: habit.title, categoryId: habit.categoryId, days: habit.days, time: habit.time, notifyLeadMin: habit.notifyLeadMin })
    .then((server) => { memoryState = memoryState.map((h) => (h.id === id ? server : h)); emit(); return syncOccurrences(); })
    .catch(() => { memoryState = memoryState.filter((h) => h.id !== id); emit(); }));
  return id;
}

export function updateHabit(id: string, patch: Partial<Habit>): void {
  const prev = memoryState.find((h) => h.id === id);
  if (!prev) return;
  memoryState = memoryState.map((h) => (h.id === id ? { ...h, ...patch } : h));
  emit();
  void withPending(actions.updateHabit(id, {
    ...(patch.title !== undefined && { title: patch.title }),
    ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
    ...(patch.days !== undefined && { days: patch.days }),
    ...(patch.time !== undefined && { time: patch.time ?? null }),
    ...(patch.notifyLeadMin !== undefined && { notifyLeadMin: patch.notifyLeadMin ?? null }),
    ...(patch.order !== undefined && { order: patch.order }),
    ...(patch.archivedAt !== undefined && { archivedAt: patch.archivedAt ?? null }),
  }).then((server) => { memoryState = memoryState.map((h) => (h.id === id ? server : h)); emit(); return syncOccurrences(); })
    .catch(() => { memoryState = memoryState.map((h) => (h.id === id ? prev : h)); emit(); }));
}

export function archiveHabit(id: string): void {
  const prev = memoryState.find((h) => h.id === id);
  if (!prev) return;
  memoryState = memoryState.map((h) => (h.id === id ? { ...h, archivedAt: new Date().toISOString() } : h));
  emit();
  void withPending(actions.archiveHabit(id).then(() => refreshPlans()).catch(() => { memoryState = memoryState.map((h) => (h.id === id ? prev : h)); emit(); }));
}

export function restoreHabit(id: string): void {
  const prev = memoryState.find((h) => h.id === id);
  if (!prev) return;
  memoryState = memoryState.map((h) => (h.id === id ? { ...h, archivedAt: undefined } : h));
  emit();
  void withPending(actions.updateHabit(id, { archivedAt: null })
    .then((server) => { memoryState = memoryState.map((h) => (h.id === id ? server : h)); emit(); return syncOccurrences(); })
    .catch(() => { memoryState = memoryState.map((h) => (h.id === id ? prev : h)); emit(); }));
}

/** Odat Kalendarida occurrence yo'q kunni bajarilgan deb belgilash (backfill). */
/** Optimistik: plans-store darhol vaqtinchalik DONE plan qo'shadi va server
 *  bilan moslaydi (UI darhol belgilanadi, kechikishsiz). */
export function markHabitDay(habitId: string, date: string): void {
  const habit = memoryState.find((h) => h.id === habitId);
  markHabitDayPlan(habitId, date, habit?.title ?? "");
}

export function removeHabit(id: string): void {
  const prev = memoryState.find((h) => h.id === id);
  if (!prev) return;
  memoryState = memoryState.filter((h) => h.id !== id);
  emit();
  void withPending(actions.removeHabit(id).then(() => refreshPlans()).catch(() => { memoryState = [...memoryState, prev]; emit(); }));
}

export function useHabits() {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    hydrateOnce(); subs++; startPoll();
    document.addEventListener("visibilitychange", onVisible);
    return () => { subs--; document.removeEventListener("visibilitychange", onVisible); if (subs <= 0) { subs = 0; stopPoll(); } };
  }, []);
  const habits = useMemo(() => all.filter((h) => !h.archivedAt), [all]);
  const archived = useMemo(() => all.filter((h) => h.archivedAt), [all]);
  return { habits, archived, create: createHabit, update: updateHabit, archive: archiveHabit, restore: restoreHabit, remove: removeHabit };
}

export function useHydratedHabits(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated, () => false);
}
