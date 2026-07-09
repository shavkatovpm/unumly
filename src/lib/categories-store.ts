"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category, CategoryColor } from "@/lib/types";
import * as actions from "@/lib/categories-actions";

/* ════════════════════════════════════════════════════════════
   Categories store — in-memory cache backed by server actions.
   Optimistic UI: mutators update local state immediately and fire
   the server action in the background; failed calls roll back.
   Cache hydrates on first hook usage and polls for cross-device sync.

   Scope-aware (pages-store pattern): `undefined` projectId = shaxsiy
   (asosiy Reja), aks holda shu Loyihaning o'z toifalar to'plami — har
   biri alohida keshda, bir vaqtning o'zida bir nechtasi ochiq bo'lishi
   mumkin.
   ════════════════════════════════════════════════════════════ */

type State = Category[];

const PERSONAL = "__personal__";
function scopeKey(projectId?: string): string {
  return projectId ?? PERSONAL;
}

type Scope = {
  categories: State;
  hydrated: boolean;
  hydrating: boolean;
  pollTimer: number | null;
  pollSubscribers: number;
  pendingMutations: number;
};

const scopes = new Map<string, Scope>();
const listeners = new Map<string, Set<() => void>>();

function getScope(key: string): Scope {
  let s = scopes.get(key);
  if (!s) {
    s = { categories: [], hydrated: false, hydrating: false, pollTimer: null, pollSubscribers: 0, pendingMutations: 0 };
    scopes.set(key, s);
  }
  return s;
}

function emit(key: string) {
  for (const l of listeners.get(key) ?? []) l();
}
function subscribe(key: string, cb: () => void) {
  let set = listeners.get(key);
  if (!set) { set = new Set(); listeners.set(key, set); }
  set.add(cb);
  return () => { set!.delete(cb); if (set!.size === 0) listeners.delete(key); };
}

function nextId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function hydrateOnce(key: string, projectId?: string) {
  const s = getScope(key);
  if (s.hydrated || s.hydrating || typeof window === "undefined") return;
  s.hydrating = true;
  void actions
    .listCategories(projectId)
    .then((rows) => {
      s.categories = rows;
      s.hydrated = true;
      emit(key);
    })
    .catch(() => {
      s.hydrated = true;
      emit(key);
    })
    .finally(() => {
      s.hydrating = false;
    });
}

/** Force a re-fetch from the server (used after first-login import).
 *  Faqat shaxsiy (asosiy Reja) uchun. */
export async function refreshCategories(): Promise<void> {
  const s = getScope(PERSONAL);
  try {
    s.categories = await actions.listCategories();
    s.hydrated = true;
    emit(PERSONAL);
  } catch {
    /* swallow */
  }
}

/* ─── Background polling (cross-device sync) ──────────────── */

const POLL_INTERVAL_MS = 20 * 1000;

function withPending<T>(s: Scope, p: Promise<T>): Promise<T> {
  s.pendingMutations++;
  return p.finally(() => {
    s.pendingMutations = Math.max(0, s.pendingMutations - 1);
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

function fetchAndReconcile(key: string, projectId?: string) {
  const s = getScope(key);
  if (s.pendingMutations > 0) return;
  void actions
    .listCategories(projectId)
    .then((rows) => {
      if (s.pendingMutations > 0) return;
      if (rowsEqual(rows, s.categories)) return;
      s.categories = rows;
      emit(key);
    })
    .catch(() => { /* unauthenticated or transient */ });
}

function startPolling(key: string, projectId?: string) {
  const s = getScope(key);
  if (s.pollTimer !== null || typeof window === "undefined") return;
  s.pollTimer = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    fetchAndReconcile(key, projectId);
  }, POLL_INTERVAL_MS);
}

function stopPolling(key: string) {
  const s = getScope(key);
  if (s.pollTimer !== null) {
    window.clearInterval(s.pollTimer);
    s.pollTimer = null;
  }
}

/* ─── Optimistic mutators ─────────────────────────────────── */

function createCategory(key: string, projectId: string | undefined, input: { label: string; color: CategoryColor }): string {
  const s = getScope(key);
  const id = nextId();
  const cat: Category = {
    id,
    label: input.label.trim(),
    color: input.color,
    order: s.categories.length,
  };
  s.categories = [...s.categories, cat];
  emit(key);

  void withPending(
    s,
    actions
      .createCategory({ id, label: cat.label, color: cat.color, projectId })
      .then((server) => {
        s.categories = s.categories.map((c) => (c.id === id ? server : c));
        emit(key);
      })
      .catch(() => {
        s.categories = s.categories.filter((c) => c.id !== id);
        emit(key);
      })
  );

  return id;
}

function updateCategory(key: string, id: string, patch: Partial<Category>): void {
  const s = getScope(key);
  const prev = s.categories.find((c) => c.id === id);
  if (!prev) return;
  s.categories = s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c));
  emit(key);

  void withPending(
    s,
    actions
      .updateCategory(id, {
        ...(patch.label !== undefined && { label: patch.label }),
        ...(patch.color !== undefined && { color: patch.color }),
        ...(patch.order !== undefined && { order: patch.order }),
      })
      .then((server) => {
        s.categories = s.categories.map((c) => (c.id === id ? server : c));
        emit(key);
      })
      .catch(() => {
        s.categories = s.categories.map((c) => (c.id === id ? prev : c));
        emit(key);
      })
  );
}

function removeCategory(key: string, id: string): void {
  const s = getScope(key);
  const prev = s.categories.find((c) => c.id === id);
  if (!prev) return;
  s.categories = s.categories.filter((c) => c.id !== id);
  emit(key);

  void withPending(
    s,
    actions.removeCategory(id).catch(() => {
      s.categories = [...s.categories, prev];
      emit(key);
    })
  );
}

/* ─── React hook ──────────────────────────────────────────── */

/** `projectId` berilmasa — shaxsiy (asosiy Reja); berilsa — shu loyihaning
 *  o'z, mustaqil toifalar to'plami (bo'sh boshlanadi, sukut toifalar
 *  urug'lantirilmaydi). */
export function useCategories(projectId?: string) {
  const key = scopeKey(projectId);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const unsub = subscribe(key, () => forceRender((n) => n + 1));
    hydrateOnce(key, projectId);
    const s = getScope(key);
    s.pollSubscribers++;
    startPolling(key, projectId);
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      fetchAndReconcile(key, projectId);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      unsub();
      s.pollSubscribers--;
      document.removeEventListener("visibilitychange", onVisible);
      if (s.pollSubscribers <= 0) {
        s.pollSubscribers = 0;
        stopPolling(key);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const s = getScope(key);
  const sorted = useMemo(
    () => [...s.categories].sort((a, b) => a.order - b.order),
    [s.categories]
  );
  return {
    categories: sorted,
    create: (input: { label: string; color: CategoryColor }) => createCategory(key, projectId, input),
    update: (id: string, patch: Partial<Category>) => updateCategory(key, id, patch),
    remove: (id: string) => removeCategory(key, id),
  };
}

export function useHydratedCategories(projectId?: string): boolean {
  const key = scopeKey(projectId);
  const [, forceRender] = useState(0);
  useEffect(() => subscribe(key, () => forceRender((n) => n + 1)), [key]);
  return getScope(key).hydrated;
}
