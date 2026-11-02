"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { GoalHorizon, HorizonGoal, HorizonGoalStep } from "@/lib/types";
import * as actions from "@/lib/horizon-goals-actions";
import { appData } from "@/lib/app-data";
import { dropPlanLocally, refreshPlans } from "@/lib/plans-store";
import { lowerHorizon, moveTargetPeriod } from "@/lib/horizon-goals";

/* Davriy maqsadlar — in-memory cache backed by server actions. O'zgarish darhol
   ko'rinadi (optimistik), keyin serverdan qaytgan maqsad bilan almashtiriladi;
   xatoda serverdan tiklanadi. Polling: Bugunda task belgilansa ham progress
   mos kelishi uchun (debts-store bilan bir xil naqsh). */

let memoryState: HorizonGoal[] = [];
let hydrated = false;
let hydrating = false;
let pending = 0;
const listeners = new Set<() => void>();
const EMPTY: HorizonGoal[] = [];
function emit() { for (const l of listeners) l(); }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function newId() { return crypto.randomUUID(); }

function hydrateOnce() {
  if (hydrated || hydrating || typeof window === "undefined") return;
  hydrating = true;
  void appData()
    .then((d) => d?.horizonGoals ?? actions.listHorizonGoals())
    .then((rows) => { if (pending === 0) memoryState = rows; })
    .catch(() => {})
    .finally(() => { hydrated = true; hydrating = false; emit(); });
}

export function preloadHorizonGoals() { hydrateOnce(); }

function reconcile() {
  if (pending > 0) return;
  void actions.listHorizonGoals().then((rows) => {
    if (pending > 0) return;
    if (JSON.stringify(rows) !== JSON.stringify(memoryState)) { memoryState = rows; emit(); }
  }).catch(() => {});
}

function patch(id: string, fn: (g: HorizonGoal) => HorizonGoal) {
  memoryState = memoryState.map((g) => (g.id === id ? fn(g) : g));
  emit();
}
function goalOfStep(stepId: string) {
  return memoryState.find((g) => g.steps.some((s) => s.id === stepId));
}
function patchStep(stepId: string, fn: (s: HorizonGoalStep) => HorizonGoalStep) {
  const goal = goalOfStep(stepId);
  if (!goal) return;
  patch(goal.id, (g) => {
    const steps = g.steps.map((s) => (s.id === stepId ? fn(s) : s));
    return { ...g, steps, done: steps.length ? steps.every((s) => s.done) : g.done };
  });
}

/** Server javobini qo'llaydi; o'zgarish boshqa maqsadlarga ham ta'sir qilishi
 *  mumkin (manba, o'tkazilganlar) — shu sabab keyin to'liq sinxronlanadi. */
function run(p: Promise<HorizonGoal>, afterPlans = false) {
  pending++;
  p.then((g) => {
    pending--;
    if (pending === 0) { memoryState = memoryState.map((x) => (x.id === g.id ? g : x)); emit(); }
    reconcile();
    if (afterPlans) void refreshPlans();
  }).catch(() => { pending--; reconcile(); });
}

/** Pastga o'tkazilganda yangi maqsadni darhol ko'rsatish uchun. */
function optimisticChild(source: { horizon: GoalHorizon; periodStart: string; title: string }, today: string, link: Partial<HorizonGoal>): string {
  const id = newId();
  const lower = lowerHorizon(source.horizon);
  const target = moveTargetPeriod(source.horizon, source.periodStart, today);
  if (lower && target) {
    memoryState = [...memoryState, { id, horizon: lower, periodStart: target, title: source.title, done: false, order: 1e6, steps: [], ...link }];
    emit();
  }
  return id;
}

export const horizonGoalsApi = {
  create(input: { horizon: GoalHorizon; periodStart: string; title: string }) {
    const id = newId();
    memoryState = [...memoryState, { ...input, id, title: input.title.trim(), done: false, order: 1e6, steps: [] }];
    emit();
    run(actions.createHorizonGoal({ id, ...input }));
  },
  rename(id: string, title: string) {
    patch(id, (g) => ({ ...g, title: title.trim() }));
    run(actions.renameHorizonGoal(id, title), true);
  },
  setDone(id: string, done: boolean) {
    patch(id, (g) => ({ ...g, done, steps: g.steps.map((s) => ({ ...s, done })) }));
    run(actions.setHorizonGoalDone(id, done), true);
  },
  remove(id: string) {
    memoryState = memoryState.filter((g) => g.id !== id);
    emit();
    pending++;
    actions.removeHorizonGoal(id).finally(() => { pending--; reconcile(); });
  },
  moveGoal(goal: HorizonGoal, today: string) {
    if (goal.horizon === "WEEK") patch(goal.id, (g) => ({ ...g, scheduledFor: today }));
    const childId = optimisticChild(goal, today, { parentId: goal.id });
    run(actions.moveHorizonGoal(goal.id, today, childId), true);
  },
  /** Bugun'dagi taskni maqsadga qaytaradi. */
  returnPlan(planId: string) {
    dropPlanLocally(planId);
    pending++;
    actions.returnPlanToGoal(planId)
      .catch(() => {})
      .finally(() => { pending--; reconcile(); void refreshPlans(); });
  },
  addStep(goalId: string, title: string) {
    const id = newId();
    patch(goalId, (g) => ({
      ...g,
      done: false,
      steps: [...g.steps, { id, goalId, title: title.trim(), done: false, order: g.steps.length }],
    }));
    run(actions.addHorizonStep({ id, goalId, title }));
  },
  renameStep(id: string, title: string) {
    patchStep(id, (s) => ({ ...s, title: title.trim() }));
    run(actions.renameHorizonStep(id, title), true);
  },
  setStepDone(id: string, done: boolean) {
    patchStep(id, (s) => ({ ...s, done }));
    run(actions.setHorizonStepDone(id, done), true);
  },
  removeStep(id: string) {
    const goal = goalOfStep(id);
    if (!goal) return;
    patch(goal.id, (g) => {
      const steps = g.steps.filter((s) => s.id !== id);
      return { ...g, steps, done: steps.length ? steps.every((s) => s.done) : g.done };
    });
    run(actions.removeHorizonStep(id), true);
  },
  moveStep(step: HorizonGoalStep, goal: HorizonGoal, today: string) {
    if (goal.horizon === "WEEK") patchStep(step.id, (s) => ({ ...s, scheduledFor: today }));
    const childId = optimisticChild({ ...goal, title: step.title }, today, { sourceStepId: step.id });
    run(actions.moveHorizonStep(step.id, today, childId), true);
  },
};

export function useHorizonGoals() {
  const goals = useSyncExternalStore(subscribe, () => memoryState, () => EMPTY);
  const ready = useSyncExternalStore(subscribe, () => hydrated, () => false);
  useEffect(() => {
    hydrateOnce();
    if (hydrated) reconcile();
    const onVisible = () => { if (document.visibilityState === "visible") reconcile(); };
    const timer = window.setInterval(onVisible, 20_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return { goals, ready };
}

/** Bitta davr maqsadlari, tartibi bilan. */
export function usePeriodGoals(goals: HorizonGoal[], horizon: GoalHorizon, periodStart: string | null) {
  return useMemo(
    () => goals.filter((g) => g.horizon === horizon && g.periodStart === periodStart).sort((a, b) => a.order - b.order),
    [goals, horizon, periodStart]
  );
}
