"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { HabitCategory } from "@/lib/types";
import * as actions from "@/lib/habit-categories-actions";

/* Habit categories — in-memory cache backed by server actions (mirrors
   categories-store). Optimistic mutations + cross-device polling. */

type State = HabitCategory[];
let memoryState: State = [];
let hydrated = false;
let hydrating = false;
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }
function nextId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); }

function hydrateOnce() {
  if (hydrated || hydrating || typeof window === "undefined") return;
  hydrating = true;
  void actions.listHabitCategories()
    .then((rows) => { memoryState = rows; hydrated = true; emit(); })
    .catch(() => { hydrated = true; emit(); })
    .finally(() => { hydrating = false; });
}

export async function refreshHabitCategories(): Promise<void> {
  try { memoryState = await actions.listHabitCategories(); hydrated = true; emit(); } catch { /* */ }
}

const POLL_MS = 20 * 1000;
let pollTimer: number | null = null;
let subs = 0;
let pending = 0;
function withPending<T>(p: Promise<T>): Promise<T> { pending++; return p.finally(() => { pending = Math.max(0, pending - 1); }); }
function rowsEqual(a: State, b: State) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) { const x = a[i], y = b[i]; if (x.id !== y.id || x.label !== y.label || x.icon !== y.icon || x.order !== y.order) return false; } return true; }
function fetchReconcile() { if (pending > 0) return; void actions.listHabitCategories().then((rows) => { if (pending > 0) return; if (!rowsEqual(rows, memoryState)) { memoryState = rows; emit(); } }).catch(() => {}); }
function startPoll() { if (pollTimer !== null || typeof window === "undefined") return; pollTimer = window.setInterval(() => { if (document.visibilityState !== "visible") return; fetchReconcile(); }, POLL_MS); }
function stopPoll() { if (pollTimer !== null) { window.clearInterval(pollTimer); pollTimer = null; } }
function onVisible() { if (document.visibilityState === "visible") fetchReconcile(); }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnapshot() { return memoryState; }
const EMPTY: State = [];
function getServerSnapshot() { return EMPTY; }

function createCategory(input: { label: string; icon: string }): string {
  const id = nextId();
  const cat: HabitCategory = { id, label: input.label.trim(), icon: input.icon, order: memoryState.length };
  memoryState = [...memoryState, cat];
  emit();
  void withPending(actions.createHabitCategory({ id, label: cat.label, icon: cat.icon })
    .then((server) => { memoryState = memoryState.map((c) => (c.id === id ? server : c)); emit(); })
    .catch(() => { memoryState = memoryState.filter((c) => c.id !== id); emit(); }));
  return id;
}

function updateCategory(id: string, patch: Partial<HabitCategory>): void {
  const prev = memoryState.find((c) => c.id === id);
  if (!prev) return;
  memoryState = memoryState.map((c) => (c.id === id ? { ...c, ...patch } : c));
  emit();
  void withPending(actions.updateHabitCategory(id, {
    ...(patch.label !== undefined && { label: patch.label }),
    ...(patch.icon !== undefined && { icon: patch.icon }),
    ...(patch.order !== undefined && { order: patch.order }),
  }).then((server) => { memoryState = memoryState.map((c) => (c.id === id ? server : c)); emit(); })
    .catch(() => { memoryState = memoryState.map((c) => (c.id === id ? prev : c)); emit(); }));
}

function removeCategory(id: string): void {
  const prev = memoryState.find((c) => c.id === id);
  if (!prev) return;
  memoryState = memoryState.filter((c) => c.id !== id);
  emit();
  void withPending(actions.removeHabitCategory(id).catch(() => { memoryState = [...memoryState, prev]; emit(); }));
}

export function useHabitCategories() {
  const categories = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    hydrateOnce(); subs++; startPoll();
    document.addEventListener("visibilitychange", onVisible);
    return () => { subs--; document.removeEventListener("visibilitychange", onVisible); if (subs <= 0) { subs = 0; stopPoll(); } };
  }, []);
  const sorted = useMemo(() => [...categories].sort((a, b) => a.order - b.order), [categories]);
  return { categories: sorted, create: createCategory, update: updateCategory, remove: removeCategory };
}

export function useHydratedHabitCategories(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated, () => false);
}
