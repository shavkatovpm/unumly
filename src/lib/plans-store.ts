"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
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
  title: string;
  scope?: PlanScope;
  scheduledFor: string;
  time?: string;
  duration?: number;
  priority?: PlanPriority;
};

export function usePlans() {
  const plans = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    hydrateOnce();
  }, []);

  const create = useCallback((input: CreatePlanInput): string => {
    const now = new Date().toISOString();
    const plan: Plan = {
      id: nextId(),
      title: input.title.trim(),
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
  }, []);

  const update = useCallback((id: string, patch: Partial<Plan>) => {
    memoryState = memoryState.map((p) => (p.id === id ? { ...p, ...patch } : p));
    persist();
    emit();
  }, []);

  const toggleStatus = useCallback((id: string) => {
    memoryState = memoryState.map((p) => {
      if (p.id !== id) return p;
      const done = p.status === "DONE";
      return {
        ...p,
        status: done ? "TODO" : "DONE",
        completedAt: done ? undefined : new Date().toISOString(),
      };
    });
    persist();
    emit();
  }, []);

  const remove = useCallback((id: string) => {
    memoryState = memoryState.filter((p) => p.id !== id);
    persist();
    emit();
  }, []);

  const removeMany = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const set = new Set(ids);
    memoryState = memoryState.filter((p) => !set.has(p.id));
    persist();
    emit();
  }, []);

  return { plans, create, update, toggleStatus, remove, removeMany };
}
