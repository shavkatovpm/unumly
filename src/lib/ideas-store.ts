"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Idea, Plan } from "@/lib/types";
import {
  getPlanById,
  removePlan,
  togglePlanStatus,
  upsertPlan,
} from "@/lib/plans-store";
import * as actions from "@/lib/ideas-actions";

/* ════════════════════════════════════════════════════════════
   Ideas store (Reja board) — in-memory cache backed by server
   actions. Optimistic UI with rollback + cross-device polling,
   mirroring plans-store. Scheduled ideas are still mirrored to a
   Plan (same id) so they also surface in Bugun/Agenda/Kalendar.
   ════════════════════════════════════════════════════════════ */

type State = Idea[];

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

/* ─── Reja "Bajarilgan" dropdowndan yashirish (lokal) ───────────
   "Tozalash" bosilganda bajarilgan g'oyalarni reja dropdownidan
   yashiramiz. Bu faqat reja ko'rinishiga taalluqli — g'oya bazada
   (completedAt bilan) qoladi va Arxiv → Bajarilganlarda ko'rinaveradi.
   ──────────────────────────────────────────────────────────── */
const DISMISSED_KEY = "unumly:idea-done-dismissed";
let dismissedSet: Set<string> = new Set();
let dismissedLoaded = false;

function loadDismissed() {
  if (dismissedLoaded || typeof window === "undefined") return;
  dismissedLoaded = true;
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    if (raw) dismissedSet = new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
}

function persistDismissed() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissedSet]));
  } catch {
    /* ignore */
  }
}

function undismiss(id: string) {
  loadDismissed();
  if (dismissedSet.delete(id)) persistDismissed();
}

/** G'oya reja dropdownidan yashirilganmi? */
export function isIdeaDismissed(id: string): boolean {
  loadDismissed();
  return dismissedSet.has(id);
}

/** Bajarilgan g'oyalarni reja "Bajarilgan" dropdownidan yashirish
 *  (7 kun kutmasdan). Bazadan o'chmaydi — Arxivda qolaveradi. */
export function dismissDoneIdeas(ids: string[]): void {
  loadDismissed();
  let changed = false;
  for (const id of ids) {
    if (!dismissedSet.has(id)) {
      dismissedSet.add(id);
      changed = true;
    }
  }
  if (changed) {
    persistDismissed();
    emit();
  }
}

function hydrateOnce() {
  if (hydrated || hydrating || typeof window === "undefined") return;
  hydrating = true;
  void actions
    .listIdeas()
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
export async function refreshIdeas(): Promise<void> {
  try {
    memoryState = await actions.listIdeas();
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

function rowsEqual(a: Idea[], b: Idea[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.title !== y.title ||
      x.notes !== y.notes ||
      x.categoryId !== y.categoryId ||
      x.done !== y.done ||
      x.completedAt !== y.completedAt ||
      x.order !== y.order ||
      x.scheduledFor !== y.scheduledFor ||
      x.time !== y.time ||
      x.duration !== y.duration ||
      x.priority !== y.priority
    )
      return false;
  }
  return true;
}

function fetchAndReconcile() {
  if (pendingMutations > 0) return;
  void actions
    .listIdeas()
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

/* ─── Plan sync helpers ───────────────────────────────────── */

function planFromIdea(idea: Idea): Plan {
  return {
    id: idea.id,
    title: idea.title,
    notes: idea.notes,
    scope: "DAILY",
    status: idea.done ? "DONE" : "TODO",
    priority: idea.priority,
    scheduledFor: idea.scheduledFor!, // caller ensures present
    time: idea.time,
    duration: idea.duration,
    createdAt: idea.createdAt,
    completedAt: idea.done ? new Date().toISOString() : undefined,
    order: 0,
  };
}

function syncPlanFor(idea: Idea) {
  if (idea.scheduledFor) {
    upsertPlan(planFromIdea(idea));
  } else if (getPlanById(idea.id)) {
    removePlan(idea.id);
  }
}

export type CreateIdeaInput = {
  title: string;
  categoryId: string;
  notes?: string;
};

/* ─── Optimistic mutators ─────────────────────────────────── */

export function createIdea(input: CreateIdeaInput): string {
  const now = new Date().toISOString();
  const id = nextId();
  const idea: Idea = {
    id,
    title: input.title.trim(),
    categoryId: input.categoryId,
    notes: input.notes,
    done: false,
    createdAt: now,
    order: memoryState.length,
  };
  memoryState = [...memoryState, idea];
  emit();

  void withPending(
    actions
      .createIdea({ id, title: idea.title, categoryId: idea.categoryId, notes: idea.notes })
      .then((server) => {
        memoryState = memoryState.map((i) => (i.id === id ? server : i));
        emit();
      })
      .catch(() => {
        memoryState = memoryState.filter((i) => i.id !== id);
        emit();
      })
  );

  return id;
}

export function updateIdea(id: string, patch: Partial<Idea>): void {
  const prev = memoryState.find((i) => i.id === id);
  if (!prev) return;
  const updated: Idea = { ...prev, ...patch };
  if (patch.done !== undefined) {
    updated.completedAt = patch.done ? new Date().toISOString() : undefined;
    undismiss(id);
  }
  memoryState = memoryState.map((i) => (i.id === id ? updated : i));
  emit();
  syncPlanFor(updated);

  void withPending(
    actions
      .updateIdea(id, {
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.notes !== undefined && { notes: patch.notes ?? null }),
        ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
        ...(patch.done !== undefined && { done: patch.done }),
        ...(patch.order !== undefined && { order: patch.order }),
        ...(patch.scheduledFor !== undefined && { scheduledFor: patch.scheduledFor ?? null }),
        ...(patch.time !== undefined && { time: patch.time ?? null }),
        ...(patch.duration !== undefined && { duration: patch.duration ?? null }),
        ...(patch.priority !== undefined && { priority: patch.priority ?? null }),
      })
      .then((server) => {
        memoryState = memoryState.map((i) => (i.id === id ? server : i));
        emit();
      })
      .catch(() => {
        memoryState = memoryState.map((i) => (i.id === id ? prev : i));
        emit();
      })
  );
}

export function toggleIdeaDone(id: string): void {
  const prev = memoryState.find((i) => i.id === id);
  if (!prev) return;
  const nowDone = !prev.done;
  const updated: Idea = {
    ...prev,
    done: nowDone,
    completedAt: nowDone ? new Date().toISOString() : undefined,
  };
  undismiss(id);
  memoryState = memoryState.map((i) => (i.id === id ? updated : i));
  emit();

  // Mirror done state onto the linked plan (without re-emitting back to us)
  if (updated.scheduledFor) {
    const plan = getPlanById(updated.id);
    if (plan && (plan.status === "DONE") !== updated.done) {
      togglePlanStatus(updated.id);
    }
  }

  void withPending(
    actions
      .toggleIdeaDone(id)
      .then((server) => {
        memoryState = memoryState.map((i) => (i.id === id ? server : i));
        emit();
      })
      .catch(() => {
        memoryState = memoryState.map((i) => (i.id === id ? prev : i));
        emit();
      })
  );
}

export function removeIdea(id: string): void {
  const prev = memoryState.find((i) => i.id === id);
  if (!prev) return;
  undismiss(id);
  memoryState = memoryState.filter((i) => i.id !== id);
  emit();
  if (getPlanById(id)) removePlan(id);

  void withPending(
    actions.removeIdea(id).catch(() => {
      memoryState = [...memoryState, prev];
      emit();
    })
  );
}

export function getIdeaById(id: string): Idea | undefined {
  return memoryState.find((i) => i.id === id);
}

/* ─── Listen for plan toggles → mirror to idea ────────────── */

if (typeof window !== "undefined") {
  window.addEventListener("unumly:plan-toggled", (e: Event) => {
    const detail = (e as CustomEvent).detail as { id: string; done: boolean };
    const idea = memoryState.find((i) => i.id === detail.id);
    if (idea && idea.done !== detail.done) {
      memoryState = memoryState.map((i) =>
        i.id === detail.id ? { ...i, done: detail.done } : i
      );
      emit();
      // Persist the mirrored state so it survives a reload / other device.
      void withPending(actions.updateIdea(detail.id, { done: detail.done }).catch(() => {}));
    }
  });
}

/* ─── React hook ──────────────────────────────────────────── */

export function useIdeas() {
  const ideas = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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

  return {
    ideas,
    hydrated,
    create: createIdea,
    update: updateIdea,
    toggleDone: toggleIdeaDone,
    remove: removeIdea,
  };
}
