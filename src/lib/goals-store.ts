"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { Goal, GoalStatus } from "@/lib/types";
import * as actions from "@/lib/goals-actions";
import { refreshPlans } from "@/lib/plans-store";

/* Maqsad (OKR) — in-memory cache backed by server actions. Mutatsiyalar
   serverdan to'liq yangilangan Goal qaytaradi; biz uni state'da almashtiramiz.
   Qadam belgilash/jadvallash Plan occurrence'ga ta'sir qiladi — shu sabab
   refreshPlans() ham chaqiriladi (Bugun/Agenda/Kalendar darhol yangilanadi). */

type State = Goal[];
let memoryState: State = [];
let hydrated = false;
let hydrating = false;
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }
function nextId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); }

function hydrateOnce() {
  if (hydrated || hydrating || typeof window === "undefined") return;
  hydrating = true;
  void actions.listGoals()
    .then((rows) => { hydrated = true; if (pending === 0) memoryState = rows; emit(); })
    .catch(() => { hydrated = true; emit(); })
    .finally(() => { hydrating = false; });
}

export async function refreshGoals(): Promise<void> {
  try { memoryState = await actions.listGoals(); hydrated = true; emit(); } catch { /* */ }
}

const POLL_MS = 20 * 1000;
let pollTimer: number | null = null;
let subs = 0;
let pending = 0;
function withPending<T>(p: Promise<T>): Promise<T> { pending++; return p.finally(() => { pending = Math.max(0, pending - 1); }); }
function fetchReconcile() {
  if (pending > 0) return;
  void actions.listGoals().then((rows) => {
    if (pending > 0) return;
    if (JSON.stringify(rows) !== JSON.stringify(memoryState)) { memoryState = rows; emit(); }
  }).catch(() => {});
}
function startPoll() { if (pollTimer !== null || typeof window === "undefined") return; pollTimer = window.setInterval(() => { if (document.visibilityState !== "visible") return; fetchReconcile(); }, POLL_MS); }
function stopPoll() { if (pollTimer !== null) { window.clearInterval(pollTimer); pollTimer = null; } }
function onVisible() { if (document.visibilityState === "visible") fetchReconcile(); }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnapshot() { return memoryState; }
const EMPTY: State = [];
function getServerSnapshot() { return EMPTY; }

/* ─── Helpers ─── */
function replaceGoal(g: Goal) { memoryState = memoryState.map((x) => (x.id === g.id ? g : x)); emit(); }
function mapGoal(id: string, fn: (g: Goal) => Goal) { memoryState = memoryState.map((g) => (g.id === id ? fn(g) : g)); emit(); }
function findGoalIdBySub(subGoalId: string): string | undefined { return memoryState.find((g) => g.subGoals.some((s) => s.id === subGoalId))?.id; }
function findGoalIdByStep(stepId: string): string | undefined {
  return memoryState.find((g) => g.subGoals.some((s) => s.steps.some((st) => st.id === stepId)))?.id;
}
/** Optimistik: nested tree ichida bitta qadamni o'zgartirish. */
function patchStep(stepId: string, fn: (st: import("@/lib/types").GoalStep) => import("@/lib/types").GoalStep) {
  memoryState = memoryState.map((g) => ({
    ...g,
    subGoals: g.subGoals.map((s) => ({ ...s, steps: s.steps.map((st) => (st.id === stepId ? fn(st) : st)) })),
  }));
  emit();
}
/** Xatoda serverdan tiklash. */
function recover() { void refreshGoals(); }
/** Massivda elementni boshqasidan oldinga (yoki oxiriga) ko'chirish. */
function moveBefore<T extends { id: string }>(arr: T[], draggedId: string, beforeId: string | null): T[] {
  const from = arr.findIndex((x) => x.id === draggedId);
  if (from < 0) return arr;
  const item = arr[from];
  const rest = arr.filter((x) => x.id !== draggedId);
  if (beforeId === null) return [...rest, item];
  const to = rest.findIndex((x) => x.id === beforeId);
  if (to < 0) return arr;
  return [...rest.slice(0, to), item, ...rest.slice(to)];
}

/* ─── Goal ─── */
export function createGoal(input: { title: string; icon?: string | null; deadline?: string | null }): string {
  const id = nextId();
  const optimistic: Goal = { id, title: input.title.trim(), icon: input.icon ?? undefined, deadline: input.deadline ?? undefined, status: "ACTIVE", order: memoryState.length, createdAt: new Date().toISOString(), subGoals: [] };
  memoryState = [...memoryState, optimistic];
  emit();
  void withPending(actions.createGoal({ id, title: optimistic.title, icon: input.icon ?? null, deadline: input.deadline ?? null })
    .then(replaceGoal).catch(() => { memoryState = memoryState.filter((g) => g.id !== id); emit(); }));
  return id;
}

export function updateGoal(id: string, patch: { title?: string; icon?: string | null; deadline?: string | null; status?: GoalStatus }): void {
  const prev = memoryState.find((g) => g.id === id);
  if (!prev) return;
  mapGoal(id, (g) => ({ ...g, ...(patch.title !== undefined && { title: patch.title }), ...(patch.icon !== undefined && { icon: patch.icon ?? undefined }), ...(patch.deadline !== undefined && { deadline: patch.deadline ?? undefined }), ...(patch.status !== undefined && { status: patch.status }) }));
  void withPending(actions.updateGoal(id, patch).then(replaceGoal).catch(() => { replaceGoal(prev); }));
}

export function removeGoal(id: string): void {
  const prev = memoryState;
  memoryState = memoryState.filter((g) => g.id !== id);
  emit();
  void withPending(actions.removeGoal(id).then(() => refreshPlans()).catch(() => { memoryState = prev; emit(); }));
}

/* ─── SubGoal ─── */
export function addSubGoal(goalId: string, title: string): void {
  const sid = nextId();
  mapGoal(goalId, (g) => ({ ...g, subGoals: [...g.subGoals, { id: sid, goalId, title: title.trim(), order: g.subGoals.length, steps: [] }] }));
  void withPending(actions.createSubGoal({ id: sid, goalId, title: title.trim() }).then(replaceGoal).catch(recover));
}
export function updateSubGoal(subGoalId: string, title: string): void {
  const gid = findGoalIdBySub(subGoalId);
  if (gid) mapGoal(gid, (g) => ({ ...g, subGoals: g.subGoals.map((s) => (s.id === subGoalId ? { ...s, title: title.trim() } : s)) }));
  void withPending(actions.updateSubGoal(subGoalId, { title: title.trim() }).then(replaceGoal).catch(recover));
}
export function removeSubGoal(subGoalId: string): void {
  const gid = findGoalIdBySub(subGoalId);
  if (gid) mapGoal(gid, (g) => ({ ...g, subGoals: g.subGoals.filter((s) => s.id !== subGoalId) }));
  void withPending(actions.removeSubGoal(subGoalId).then((g) => { if (g) replaceGoal(g); return refreshPlans(); }).catch(recover));
}

/* ─── Step ─── */
export function addStep(subGoalId: string, title: string): void {
  const stId = nextId();
  const gid = findGoalIdBySub(subGoalId);
  if (gid) mapGoal(gid, (g) => ({ ...g, subGoals: g.subGoals.map((s) => (s.id === subGoalId ? { ...s, steps: [...s.steps, { id: stId, subGoalId, title: title.trim(), done: false, order: s.steps.length }] } : s)) }));
  void withPending(actions.createStep({ id: stId, subGoalId, title: title.trim() }).then(replaceGoal).catch(recover));
}
export function updateStep(stepId: string, title: string): void {
  patchStep(stepId, (st) => ({ ...st, title: title.trim() }));
  void withPending(actions.updateStep(stepId, { title: title.trim() }).then(replaceGoal).catch(recover));
}
export function removeStep(stepId: string): void {
  const gid = findGoalIdByStep(stepId);
  if (gid) mapGoal(gid, (g) => ({ ...g, subGoals: g.subGoals.map((s) => ({ ...s, steps: s.steps.filter((st) => st.id !== stepId) })) }));
  void withPending(actions.removeStep(stepId).then((g) => { if (g) replaceGoal(g); return refreshPlans(); }).catch(recover));
}
export function toggleStep(stepId: string, done: boolean): void {
  patchStep(stepId, (st) => ({ ...st, done }));
  void withPending(actions.setStepDone(stepId, done).then((g) => { replaceGoal(g); return refreshPlans(); }).catch(recover));
}
export function scheduleStep(stepId: string, date: string, time?: string): void {
  patchStep(stepId, (st) => ({ ...st, scheduledFor: date, time }));
  void withPending(actions.scheduleStep(stepId, date, time).then((g) => { replaceGoal(g); return refreshPlans(); }).catch(recover));
}
export function unscheduleStep(stepId: string): void {
  patchStep(stepId, (st) => ({ ...st, scheduledFor: undefined, time: undefined, planId: undefined }));
  void withPending(actions.unscheduleStep(stepId).then((g) => { if (g) replaceGoal(g); return refreshPlans(); }).catch(recover));
}

/* ─── Tartiblash (drag reorder) ─── */
export function reorderSubGoals(goalId: string, draggedId: string, beforeId: string | null): void {
  const g = memoryState.find((x) => x.id === goalId);
  if (!g) return;
  const next = moveBefore(g.subGoals, draggedId, beforeId);
  mapGoal(goalId, (gg) => ({ ...gg, subGoals: next }));
  void withPending(actions.reorderSubGoals(goalId, next.map((s) => s.id)).then(replaceGoal).catch(recover));
}
export function reorderSteps(subGoalId: string, draggedId: string, beforeId: string | null): void {
  const gid = findGoalIdBySub(subGoalId);
  if (!gid) return;
  let nextIds: string[] = [];
  mapGoal(gid, (gg) => ({ ...gg, subGoals: gg.subGoals.map((s) => { if (s.id !== subGoalId) return s; const next = moveBefore(s.steps, draggedId, beforeId); nextIds = next.map((x) => x.id); return { ...s, steps: next }; }) }));
  void withPending(actions.reorderSteps(subGoalId, nextIds).then(replaceGoal).catch(recover));
}

/* ─── Progress ─── */
export function goalProgress(g: Goal): { done: number; total: number; pct: number } {
  let done = 0, total = 0;
  for (const s of g.subGoals) for (const st of s.steps) { total++; if (st.done) done++; }
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/* ─── Hook ─── */
export function useGoals() {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    hydrateOnce(); subs++; startPoll();
    document.addEventListener("visibilitychange", onVisible);
    return () => { subs--; document.removeEventListener("visibilitychange", onVisible); if (subs <= 0) { subs = 0; stopPoll(); } };
  }, []);
  const active = useMemo(() => all.filter((g) => g.status === "ACTIVE"), [all]);
  const done = useMemo(() => all.filter((g) => g.status === "DONE"), [all]);
  const archived = useMemo(() => all.filter((g) => g.status === "ARCHIVED"), [all]);
  return {
    active, done, archived,
    createGoal, updateGoal, removeGoal,
    archiveGoal: (id: string) => updateGoal(id, { status: "ARCHIVED" }),
    restoreGoal: (id: string) => updateGoal(id, { status: "ACTIVE" }),
    addSubGoal, updateSubGoal, removeSubGoal,
    addStep, updateStep, removeStep, toggleStep, scheduleStep, unscheduleStep,
    reorderSubGoals, reorderSteps,
  };
}

export function useGoalById(id: string | null): Goal | null {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => (id ? all.find((g) => g.id === id) ?? null : null), [all, id]);
}

export function useHydratedGoals(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated, () => false);
}
