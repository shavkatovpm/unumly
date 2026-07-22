"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { CategoryColor, Project } from "@/lib/types";
import * as actions from "@/lib/projects-actions";

/* Loyihalar (Project workspaces) — habits-store bilan bir xil naqsh:
   in-memory cache, optimistik yangilash, server actions bilan orqa fonda
   moslashtirish. */

type State = Project[];
let memoryState: State = [];
let hydrated = false;
let hydrating = false;
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }
function nextId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); }

function hydrateOnce() {
  if (hydrated || hydrating || typeof window === "undefined") return;
  hydrating = true;
  void actions.listProjects()
    .then((rows) => { memoryState = rows; hydrated = true; emit(); })
    .catch(() => { hydrated = true; emit(); })
    .finally(() => { hydrating = false; });
}

export async function refreshProjects(): Promise<void> {
  try { memoryState = await actions.listProjects(); hydrated = true; emit(); } catch { /* */ }
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
    if (x.id !== y.id || x.title !== y.title || x.icon !== y.icon || x.color !== y.color || x.order !== y.order || x.archivedAt !== y.archivedAt || x.category !== y.category || x.targetHours !== y.targetHours) return false;
  }
  return true;
}
function fetchReconcile() { if (pending > 0) return; void actions.listProjects().then((rows) => { if (pending > 0) return; if (!rowsEqual(rows, memoryState)) { memoryState = rows; emit(); } }).catch(() => {}); }
function startPoll() { if (pollTimer !== null || typeof window === "undefined") return; pollTimer = window.setInterval(() => { if (document.visibilityState !== "visible") return; fetchReconcile(); }, POLL_MS); }
function stopPoll() { if (pollTimer !== null) { window.clearInterval(pollTimer); pollTimer = null; } }
function onVisible() { if (document.visibilityState === "visible") fetchReconcile(); }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnapshot() { return memoryState; }
const EMPTY: State = [];
function getServerSnapshot() { return EMPTY; }

export type CreateProjectInput = { title: string; icon?: string; color?: CategoryColor };

export function createProject(input: CreateProjectInput): string {
  const id = nextId();
  const project: Project = { id, title: input.title.trim(), icon: input.icon, color: input.color, order: memoryState.length };
  memoryState = [...memoryState, project];
  emit();
  void withPending(actions.createProject({ id, title: project.title, icon: project.icon, color: project.color })
    .then((server) => { memoryState = memoryState.map((p) => (p.id === id ? server : p)); emit(); })
    .catch(() => { memoryState = memoryState.filter((p) => p.id !== id); emit(); }));
  return id;
}

export function updateProject(id: string, patch: Partial<Project>): void {
  const prev = memoryState.find((p) => p.id === id);
  if (!prev) return;
  memoryState = memoryState.map((p) => (p.id === id ? { ...p, ...patch } : p));
  emit();
  void withPending(actions.updateProject(id, {
    ...(patch.title !== undefined && { title: patch.title }),
    ...(patch.icon !== undefined && { icon: patch.icon ?? null }),
    ...(patch.color !== undefined && { color: patch.color ?? null }),
    ...(patch.order !== undefined && { order: patch.order }),
    ...(patch.archivedAt !== undefined && { archivedAt: patch.archivedAt ?? null }),
    ...(patch.category !== undefined && { category: patch.category ?? null }),
    ...(patch.targetHours !== undefined && { targetHours: patch.targetHours ?? null }),
  }).then((server) => { memoryState = memoryState.map((p) => (p.id === id ? server : p)); emit(); })
    .catch(() => { memoryState = memoryState.map((p) => (p.id === id ? prev : p)); emit(); }));
}

export function removeProject(id: string): void {
  const prev = memoryState.find((p) => p.id === id);
  if (!prev) return;
  memoryState = memoryState.filter((p) => p.id !== id);
  emit();
  void withPending(actions.removeProject(id).catch(() => { memoryState = [...memoryState, prev]; emit(); }));
}

export function useProjects() {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    hydrateOnce(); subs++; startPoll();
    document.addEventListener("visibilitychange", onVisible);
    return () => { subs--; document.removeEventListener("visibilitychange", onVisible); if (subs <= 0) { subs = 0; stopPoll(); } };
  }, []);
  const projects = useMemo(() => all.filter((p) => !p.archivedAt), [all]);
  const archived = useMemo(() => all.filter((p) => p.archivedAt), [all]);
  return { projects, archived, create: createProject, update: updateProject, remove: removeProject };
}

export function useHydratedProjects(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated, () => false);
}
