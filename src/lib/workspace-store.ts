"use client";

import { useEffect, useSyncExternalStore } from "react";
import * as actions from "@/lib/projects-actions";
import type { WorkspaceProjectRow } from "@/lib/projects-actions";
import type { Project } from "@/lib/types";
import { updateProject } from "@/lib/projects-store";

/* /workspace grid — qaysi loyihalar shu kesimga qo'shilgan va ularning
   workspace-tasklari bo'yicha done/total hisobi. projects-store'dagi
   umumiy Project ro'yxatidan alohida kesh (Project.inWorkspaceAt/
   workspaceOrder bayrog'iga asoslangan tor kesim). */

let memoryState: WorkspaceProjectRow[] = [];
let hydrated = false;
let hydrating = false;
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnapshot() { return memoryState; }
const EMPTY: WorkspaceProjectRow[] = [];
function getServerSnapshot() { return EMPTY; }

function hydrateOnce() {
  if (hydrated || hydrating || typeof window === "undefined") return;
  hydrating = true;
  void actions.listWorkspaceProjects()
    .then((rows) => { hydrated = true; memoryState = rows; emit(); })
    .catch(() => { hydrated = true; emit(); })
    .finally(() => { hydrating = false; });
}

export async function refreshWorkspaceProjects(): Promise<void> {
  try { memoryState = await actions.listWorkspaceProjects(); hydrated = true; emit(); } catch { /* */ }
}

export function useWorkspaceProjects() {
  const projects = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isHydrated = useSyncExternalStore(subscribe, () => hydrated, () => false);

  useEffect(() => { hydrateOnce(); }, []);

  // Optimistik: grid'ga darhol qo'shiladi (server javobini kutmaydi) — done/
  // total 0'dan boshlanadi, chunki hali workspace'ga hech qanday task
  // qo'shilmagan. `updateProject` orqa fonda saqlaydi; muvaffaqiyatsiz
  // bo'lsa (kamdan-kam) keyingi `refreshWorkspaceProjects` chaqiruvi
  // (masalan task qo'shilganda) haqiqiy holatga qaytaradi.
  function addProject(project: Pick<Project, "id" | "title" | "icon" | "color">) {
    if (memoryState.some((p) => p.id === project.id)) return;
    memoryState = [
      ...memoryState,
      { id: project.id, title: project.title, icon: project.icon, color: project.color, done: 0, total: 0 },
    ];
    emit();
    updateProject(project.id, { inWorkspaceAt: new Date().toISOString(), workspaceOrder: memoryState.length - 1 });
  }

  function removeProject(id: string) {
    updateProject(id, { inWorkspaceAt: null, workspaceOrder: null });
    memoryState = memoryState.filter((p) => p.id !== id);
    emit();
  }

  function reorder(ids: string[]) {
    const byId = new Map(memoryState.map((p) => [p.id, p]));
    memoryState = ids.map((id) => byId.get(id)).filter((p): p is WorkspaceProjectRow => !!p);
    emit();
    ids.forEach((id, i) => updateProject(id, { workspaceOrder: i }));
  }

  return { projects, hydrated: isHydrated, addProject, removeProject, reorder };
}
