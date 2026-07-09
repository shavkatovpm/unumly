"use client";

import { useEffect, useState } from "react";
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
   mirroring plans-store.

   Scope-aware: `undefined` projectId = shaxsiy (asosiy Reja), aks holda
   shu Loyihaning o'z Reja bo'limi — har biri alohida keshda (pages-store
   pattern), bir vaqtning o'zida bir nechtasi ochiq bo'lishi mumkin.

   Sanali (scheduledFor) g'oyalar hali ham Plan (bir xil id) sifatida
   ko'zguланади — LEKIN faqat SHAXSIY g'oyalar uchun (Bugun/Agenda/
   Kalendarga chiqishi kerak bo'lgani uchun). Loyihaga tegishli g'oyalar
   ProjectTask kabi mustaqil qoladi — Plan/eslatma tizimiga aralashmaydi. */

type State = Idea[];

const PERSONAL = "__personal__";
function scopeKey(projectId?: string): string {
  return projectId ?? PERSONAL;
}

type Scope = {
  ideas: State;
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
    s = { ideas: [], hydrated: false, hydrating: false, pollTimer: null, pollSubscribers: 0, pendingMutations: 0 };
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

/* ─── Reja "Bajarilgan" dropdowndan yashirish (lokal) ───────────
   "Tozalash" bosilganda bajarilgan g'oyalarni reja dropdownidan
   yashiramiz. Bu faqat reja ko'rinishiga taalluqli — g'oya bazada
   (completedAt bilan) qoladi va Arxiv → Bajarilganlarda ko'rinaveradi.
   G'oya id'lari global noyob (cuid) — scope'dan qat'iy nazar bitta
   umumiy to'plam yetarli. ──────────────────────────────────────── */
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
    // Barcha ochiq scope'larni yangilaymiz — qaysi biriga tegishli ekanini
    // bilmaymiz, lekin bu arzon (faqat qayta render).
    for (const key of scopes.keys()) emit(key);
  }
}

function hydrateOnce(key: string, projectId?: string) {
  const s = getScope(key);
  if (s.hydrated || s.hydrating || typeof window === "undefined") return;
  s.hydrating = true;
  void actions
    .listIdeas(projectId)
    .then((rows) => {
      s.ideas = rows;
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
 *  Faqat shaxsiy (asosiy Reja) uchun — import faqat shaxsiy ma'lumot uchun. */
export async function refreshIdeas(): Promise<void> {
  const s = getScope(PERSONAL);
  try {
    s.ideas = await actions.listIdeas();
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

function fetchAndReconcile(key: string, projectId?: string) {
  const s = getScope(key);
  if (s.pendingMutations > 0) return;
  void actions
    .listIdeas(projectId)
    .then((rows) => {
      if (s.pendingMutations > 0) return;
      if (rowsEqual(rows, s.ideas)) return;
      s.ideas = rows;
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

/* ─── Plan sync helpers (faqat shaxsiy scope) ─────────────── */

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

/* ─── Optimistic mutators — barchasi (key, projectId) ni birinchi
   argument sifatida oladi; hook shu qiymatlarni "bog'lab" qaytaradi. ─── */

function createIdea(key: string, projectId: string | undefined, input: CreateIdeaInput): string {
  const s = getScope(key);
  const now = new Date().toISOString();
  const id = nextId();
  const idea: Idea = {
    id,
    title: input.title.trim(),
    categoryId: input.categoryId,
    notes: input.notes,
    done: false,
    createdAt: now,
    order: s.ideas.length,
  };
  s.ideas = [...s.ideas, idea];
  emit(key);

  void withPending(
    s,
    actions
      .createIdea({ id, title: idea.title, categoryId: idea.categoryId, notes: idea.notes, projectId })
      .then((server) => {
        s.ideas = s.ideas.map((i) => (i.id === id ? server : i));
        emit(key);
      })
      .catch(() => {
        s.ideas = s.ideas.filter((i) => i.id !== id);
        emit(key);
      })
  );

  return id;
}

function updateIdea(key: string, projectId: string | undefined, id: string, patch: Partial<Idea>): void {
  const s = getScope(key);
  const prev = s.ideas.find((i) => i.id === id);
  if (!prev) return;
  const updated: Idea = { ...prev, ...patch };
  if (patch.done !== undefined) {
    updated.completedAt = patch.done ? new Date().toISOString() : undefined;
    undismiss(id);
  }
  s.ideas = s.ideas.map((i) => (i.id === id ? updated : i));
  emit(key);
  if (!projectId) syncPlanFor(updated);

  void withPending(
    s,
    actions
      .updateIdea(id, {
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.notes !== undefined && { notes: patch.notes ?? null }),
        ...(patch.subtasks !== undefined && { subtasks: patch.subtasks }),
        ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
        ...(patch.done !== undefined && { done: patch.done }),
        ...(patch.order !== undefined && { order: patch.order }),
        ...(patch.scheduledFor !== undefined && { scheduledFor: patch.scheduledFor ?? null }),
        ...(patch.time !== undefined && { time: patch.time ?? null }),
        ...(patch.duration !== undefined && { duration: patch.duration ?? null }),
        ...(patch.priority !== undefined && { priority: patch.priority ?? null }),
      })
      .then((server) => {
        s.ideas = s.ideas.map((i) => (i.id === id ? server : i));
        emit(key);
      })
      .catch(() => {
        s.ideas = s.ideas.map((i) => (i.id === id ? prev : i));
        emit(key);
      })
  );
}

function toggleIdeaDone(key: string, projectId: string | undefined, id: string): void {
  const s = getScope(key);
  const prev = s.ideas.find((i) => i.id === id);
  if (!prev) return;
  const nowDone = !prev.done;
  const updated: Idea = {
    ...prev,
    done: nowDone,
    completedAt: nowDone ? new Date().toISOString() : undefined,
  };
  undismiss(id);
  s.ideas = s.ideas.map((i) => (i.id === id ? updated : i));
  emit(key);

  // Mirror done state onto the linked plan (faqat shaxsiy) without re-emitting back to us
  if (!projectId && updated.scheduledFor) {
    const plan = getPlanById(updated.id);
    if (plan && (plan.status === "DONE") !== updated.done) {
      togglePlanStatus(updated.id);
    }
  }

  void withPending(
    s,
    actions
      .toggleIdeaDone(id)
      .then((server) => {
        s.ideas = s.ideas.map((i) => (i.id === id ? server : i));
        emit(key);
      })
      .catch(() => {
        s.ideas = s.ideas.map((i) => (i.id === id ? prev : i));
        emit(key);
      })
  );
}

function removeIdea(key: string, projectId: string | undefined, id: string): void {
  const s = getScope(key);
  const prev = s.ideas.find((i) => i.id === id);
  if (!prev) return;
  undismiss(id);
  s.ideas = s.ideas.filter((i) => i.id !== id);
  emit(key);
  if (!projectId && getPlanById(id)) removePlan(id);

  void withPending(
    s,
    actions.removeIdea(id).catch(() => {
      s.ideas = [...s.ideas, prev];
      emit(key);
    })
  );
}

/* ─── Listen for plan toggles → mirror to idea (faqat shaxsiy scope) ─── */

if (typeof window !== "undefined") {
  window.addEventListener("unumly:plan-toggled", (e: Event) => {
    const detail = (e as CustomEvent).detail as { id: string; done: boolean };
    const s = getScope(PERSONAL);
    const idea = s.ideas.find((i) => i.id === detail.id);
    if (idea && idea.done !== detail.done) {
      s.ideas = s.ideas.map((i) =>
        i.id === detail.id ? { ...i, done: detail.done } : i
      );
      emit(PERSONAL);
      // Persist the mirrored state so it survives a reload / other device.
      void withPending(s, actions.updateIdea(detail.id, { done: detail.done }).catch(() => {}));
    }
  });
}

/* ─── React hook ──────────────────────────────────────────── */

/** `projectId` berilmasa — shaxsiy (asosiy Reja); berilsa — shu loyihaning
 *  o'z, mustaqil g'oyalar/toifalar to'plami. */
export function useIdeas(projectId?: string) {
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
  return {
    ideas: s.ideas,
    hydrated: s.hydrated,
    create: (input: CreateIdeaInput) => createIdea(key, projectId, input),
    update: (id: string, patch: Partial<Idea>) => updateIdea(key, projectId, id, patch),
    toggleDone: (id: string) => toggleIdeaDone(key, projectId, id),
    remove: (id: string) => removeIdea(key, projectId, id),
  };
}
