"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { Category, CategoryColor } from "@/lib/types";
import * as actions from "@/lib/categories-actions";

/* ════════════════════════════════════════════════════════════
   Categories store — in-memory cache backed by server actions.
   Optimistic UI: mutators update local state immediately and fire
   the server action in the background; failed calls roll back.
   Cache hydrates on first hook usage and polls for cross-device sync.
   Mirrors plans-store.
   ════════════════════════════════════════════════════════════ */

type State = Category[];

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
    .listCategories()
    .then((rows) => {
      memoryState = rows;
      hydrated = true;
      emit();
    })
    .catch(() => {
      hydrated = true;
      emit();
    })
    .finally(() => {
      hydrating = false;
    });
}

/** Force a re-fetch from the server (used after first-login import). */
export async function refreshCategories(): Promise<void> {
  try {
    memoryState = await actions.listCategories();
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
let pendingMutations = 0;

function withPending<T>(p: Promise<T>): Promise<T> {
  pendingMutations++;
  return p.finally(() => {
    pendingMutations = Math.max(0, pendingMutations - 1);
  });
}

function rowsEqual(a: Category[], b: Category[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x.id !== y.id || x.label !== y.label || x.color !== y.color || x.order !== y.order)
      return false;
  }
  return true;
}

function fetchAndReconcile() {
  if (pendingMutations > 0) return;
  void actions
    .listCategories()
    .then((rows) => {
      if (pendingMutations > 0) return;
      if (rowsEqual(rows, memoryState)) return;
      memoryState = rows;
      emit();
    })
    .catch(() => { /* unauthenticated or transient */ });
}

function startPolling() {
  if (pollTimer !== null || typeof window === "undefined") return;
  pollTimer = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    fetchAndReconcile();
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

function maybeRefreshOnVisible() {
  if (document.visibilityState !== "visible") return;
  fetchAndReconcile();
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

/* ─── Optimistic mutators ─────────────────────────────────── */

function createCategory(input: { label: string; color: CategoryColor }): string {
  const id = nextId();
  const cat: Category = {
    id,
    label: input.label.trim(),
    color: input.color,
    order: memoryState.length,
  };
  memoryState = [...memoryState, cat];
  emit();

  void withPending(
    actions
      .createCategory({ id, label: cat.label, color: cat.color })
      .then((server) => {
        memoryState = memoryState.map((c) => (c.id === id ? server : c));
        emit();
      })
      .catch(() => {
        memoryState = memoryState.filter((c) => c.id !== id);
        emit();
      })
  );

  return id;
}

function updateCategory(id: string, patch: Partial<Category>): void {
  const prev = memoryState.find((c) => c.id === id);
  if (!prev) return;
  memoryState = memoryState.map((c) => (c.id === id ? { ...c, ...patch } : c));
  emit();

  void withPending(
    actions
      .updateCategory(id, {
        ...(patch.label !== undefined && { label: patch.label }),
        ...(patch.color !== undefined && { color: patch.color }),
        ...(patch.order !== undefined && { order: patch.order }),
      })
      .then((server) => {
        memoryState = memoryState.map((c) => (c.id === id ? server : c));
        emit();
      })
      .catch(() => {
        memoryState = memoryState.map((c) => (c.id === id ? prev : c));
        emit();
      })
  );
}

function removeCategory(id: string): void {
  const prev = memoryState.find((c) => c.id === id);
  if (!prev) return;
  memoryState = memoryState.filter((c) => c.id !== id);
  emit();

  void withPending(
    actions.removeCategory(id).catch(() => {
      memoryState = [...memoryState, prev];
      emit();
    })
  );
}

/* ─── React hook ──────────────────────────────────────────── */

export function useCategories() {
  const categories = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order),
    [categories]
  );
  return {
    categories: sorted,
    create: createCategory,
    update: updateCategory,
    remove: removeCategory,
  };
}

export function useHydratedCategories(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated, () => false);
}
