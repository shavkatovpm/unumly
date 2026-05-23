"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { QuickList } from "@/lib/tezkor-types";
import * as actions from "@/lib/tezkor-actions";

/* ════════════════════════════════════════════════════════════
   Tezkor store — in-memory cache backed by server actions.
   Mirrors plans-store: optimistic mutations + background polling
   so bot-added items appear in the app in near-real-time.
   ════════════════════════════════════════════════════════════ */

type State = QuickList[];

let memoryState: State = [];
let hydrated = false;
let hydrating = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function hydrateOnce() {
  if (hydrated || hydrating || typeof window === "undefined") return;
  hydrating = true;
  void actions
    .listLists()
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

export async function refreshLists(): Promise<void> {
  try {
    const rows = await actions.listLists();
    memoryState = rows;
    hydrated = true;
    emit();
  } catch {
    /* swallow */
  }
}

/* ─── Background polling (catch bot-added items) ──────────── */

const POLL_INTERVAL_MS = 15 * 1000;
let pollTimer: number | null = null;
let pollSubscribers = 0;
let pendingMutations = 0;

function withPending<T>(p: Promise<T>): Promise<T> {
  pendingMutations++;
  return p.finally(() => {
    pendingMutations = Math.max(0, pendingMutations - 1);
  });
}

function listsEqual(a: QuickList[], b: QuickList[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.name !== y.name ||
      x.closedAt !== y.closedAt ||
      x.deletedAt !== y.deletedAt ||
      x.updatedAt !== y.updatedAt ||
      x.items.length !== y.items.length
    ) return false;
    for (let j = 0; j < x.items.length; j++) {
      const xi = x.items[j];
      const yi = y.items[j];
      if (
        xi.id !== yi.id ||
        xi.text !== yi.text ||
        xi.done !== yi.done ||
        xi.order !== yi.order
      ) return false;
    }
  }
  return true;
}

function startPolling() {
  if (pollTimer !== null || typeof window === "undefined") return;
  pollTimer = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    if (pendingMutations > 0) return;
    void actions
      .listLists()
      .then((rows) => {
        if (pendingMutations > 0) return;
        if (listsEqual(rows, memoryState)) return;
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

function maybeRefreshOnVisible() {
  if (document.visibilityState !== "visible") return;
  if (pendingMutations > 0) return;
  void actions
    .listLists()
    .then((rows) => {
      if (pendingMutations > 0) return;
      if (!listsEqual(rows, memoryState)) {
        memoryState = rows;
        emit();
      }
    })
    .catch(() => { /* ignore */ });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot(): State { return memoryState; }
const EMPTY: State = [];
function getServerSnapshot(): State { return EMPTY; }

/* ─── Optimistic mutators ─────────────────────────────────── */

export function createList(input: { name: string; items: string[] }): string {
  const tempId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

  const now = new Date().toISOString();
  const optimistic: QuickList = {
    id: tempId,
    name: input.name.trim(),
    source: "app",
    createdAt: now,
    updatedAt: now,
    items: input.items.map((t, i) => ({
      id: `${tempId}-i${i}`,
      listId: tempId,
      text: t.trim(),
      done: false,
      order: i,
      createdAt: now,
    })),
  };
  memoryState = [optimistic, ...memoryState];
  emit();

  void withPending(
    actions.createList({ id: tempId, name: input.name, items: input.items })
      .then((server) => {
        memoryState = memoryState.map((l) => (l.id === tempId ? server : l));
        emit();
      })
      .catch(() => {
        memoryState = memoryState.filter((l) => l.id !== tempId);
        emit();
      })
  );
  return tempId;
}

export function renameList(id: string, name: string): void {
  const prev = memoryState.find((l) => l.id === id);
  if (!prev) return;
  memoryState = memoryState.map((l) => (l.id === id ? { ...l, name } : l));
  emit();
  void withPending(
    actions.renameList(id, name)
      .then((server) => {
        memoryState = memoryState.map((l) => (l.id === id ? server : l));
        emit();
      })
      .catch(() => {
        memoryState = memoryState.map((l) => (l.id === id ? prev : l));
        emit();
      })
  );
}

export function addItems(listId: string, texts: string[]): void {
  const prev = memoryState.find((l) => l.id === listId);
  if (!prev) return;
  const cleaned = texts.map((t) => t.trim()).filter(Boolean);
  if (cleaned.length === 0) return;
  const baseOrder = (prev.items[prev.items.length - 1]?.order ?? -1) + 1;
  const now = new Date().toISOString();
  const newItems = cleaned.map((text, i) => ({
    id: `${listId}-tmp-${Date.now()}-${i}`,
    listId,
    text,
    done: false,
    order: baseOrder + i,
    createdAt: now,
  }));
  memoryState = memoryState.map((l) =>
    l.id === listId ? { ...l, items: [...l.items, ...newItems] } : l
  );
  emit();

  void withPending(
    actions.addItems(listId, cleaned)
      .then((server) => {
        memoryState = memoryState.map((l) => (l.id === listId ? server : l));
        emit();
      })
      .catch(() => {
        memoryState = memoryState.map((l) => (l.id === listId ? prev : l));
        emit();
      })
  );
}

export function toggleItem(itemId: string): void {
  let prevList: QuickList | undefined;
  memoryState = memoryState.map((l) => {
    if (!l.items.some((i) => i.id === itemId)) return l;
    prevList = l;
    return {
      ...l,
      items: l.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)),
    };
  });
  if (!prevList) return;
  emit();

  void withPending(
    actions.toggleItem(itemId).catch(() => {
      if (!prevList) return;
      memoryState = memoryState.map((l) => (l.id === prevList!.id ? prevList! : l));
      emit();
    })
  );
}

export function updateItemText(itemId: string, text: string): void {
  let prevList: QuickList | undefined;
  memoryState = memoryState.map((l) => {
    if (!l.items.some((i) => i.id === itemId)) return l;
    prevList = l;
    return {
      ...l,
      items: l.items.map((i) => (i.id === itemId ? { ...i, text } : i)),
    };
  });
  if (!prevList) return;
  emit();

  void withPending(
    actions.updateItemText(itemId, text).catch(() => {
      if (!prevList) return;
      memoryState = memoryState.map((l) => (l.id === prevList!.id ? prevList! : l));
      emit();
    })
  );
}

export function removeItem(itemId: string): void {
  let prevList: QuickList | undefined;
  memoryState = memoryState.map((l) => {
    if (!l.items.some((i) => i.id === itemId)) return l;
    prevList = l;
    return { ...l, items: l.items.filter((i) => i.id !== itemId) };
  });
  if (!prevList) return;
  emit();

  void withPending(
    actions.removeItem(itemId).catch(() => {
      if (!prevList) return;
      memoryState = memoryState.map((l) => (l.id === prevList!.id ? prevList! : l));
      emit();
    })
  );
}

export function removeList(id: string): void {
  const prev = memoryState.find((l) => l.id === id);
  if (!prev) return;
  const now = new Date().toISOString();
  memoryState = memoryState.map((l) => (l.id === id ? { ...l, deletedAt: now } : l));
  emit();
  void withPending(
    actions.removeList(id).catch(() => {
      memoryState = memoryState.map((l) => (l.id === id ? prev : l));
      emit();
    })
  );
}

export function restoreList(id: string): void {
  const prev = memoryState.find((l) => l.id === id);
  if (!prev) return;
  memoryState = memoryState.map((l) => {
    if (l.id !== id) return l;
    const { deletedAt: _ignored, ...rest } = l;
    void _ignored;
    return rest;
  });
  emit();
  void withPending(
    actions.restoreList(id).catch(() => {
      memoryState = memoryState.map((l) => (l.id === id ? prev : l));
      emit();
    })
  );
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

/** Active (non-deleted) lists. */
export function useQuickLists() {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useStoreLifecycle();
  const lists = useMemo(() => all.filter((l) => !l.deletedAt), [all]);
  return {
    lists,
    createList,
    renameList,
    addItems,
    toggleItem,
    updateItemText,
    removeItem,
    removeList,
    restoreList,
  };
}

export function useHydratedLists(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated, () => false);
}
