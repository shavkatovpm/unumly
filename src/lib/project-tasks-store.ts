"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlanPriority, ProjectTask } from "@/lib/types";
import * as actions from "@/lib/project-tasks-actions";

/* Loyiha tasklari (Jadval) — pages-store bilan bir xil naqsh: har bir loyiha
   o'z tasklar ro'yxatini alohida, talab bo'yicha yuklanadigan keshda saqlaydi. */

const cache = new Map<string, ProjectTask[]>();
const listeners = new Map<string, Set<() => void>>();
// Boshlang'ich yuklash paytida (hali kesh bo'sh) komponent StrictMode yoki
// tab almashtirish tufayli tez-tez qayta mount bo'lsa, bir nechta
// `listProjectTasks` so'rovi bir vaqtda "havoda" qolib ketishi mumkin edi —
// birinchisi sekinroq bo'lsa, u KEYINROQ tugab, orada foydalanuvchi
// ulgurgan optimistik o'zgarishlarni (masalan checkbox bosilishini) eski
// ma'lumot bilan qayta yozib, "bekor qilib" qo'yardi. Shu sabab bir
// projectId uchun bir vaqtning o'zida faqat BITTA so'rov "havoda" qoladi —
// qolganlari o'sha bittasining natijasini kutadi.
const inFlight = new Map<string, Promise<ProjectTask[]>>();

function emit(projectId: string) {
  for (const l of listeners.get(projectId) ?? []) l();
}
function subscribe(projectId: string, cb: () => void) {
  let set = listeners.get(projectId);
  if (!set) { set = new Set(); listeners.set(projectId, set); }
  set.add(cb);
  return () => { set!.delete(cb); if (set!.size === 0) listeners.delete(projectId); };
}
function nextId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); }

export function useProjectTasks(projectId: string | null) {
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!projectId) return;
    const unsub = subscribe(projectId, () => forceRender((n) => n + 1));
    if (!cache.has(projectId) && !inFlight.has(projectId)) {
      const req = actions.listProjectTasks(projectId)
        .then((rows) => { cache.set(projectId, rows); emit(projectId); return rows; })
        .catch(() => { cache.set(projectId, cache.get(projectId) ?? []); emit(projectId); return []; })
        .finally(() => { inFlight.delete(projectId); });
      inFlight.set(projectId, req);
    }
    return unsub;
  }, [projectId]);

  const hydrated = projectId ? cache.has(projectId) : false;
  const tasks = (projectId && cache.get(projectId)) || [];

  const create = useCallback((input: { title: string; priority?: PlanPriority; dueDate?: string }): string => {
    if (!projectId) return "";
    const id = nextId();
    const optimistic: ProjectTask = {
      id, projectId, title: input.title.trim(), done: false,
      priority: input.priority, dueDate: input.dueDate,
      order: (cache.get(projectId) ?? []).length,
      createdAt: new Date().toISOString(),
    };
    cache.set(projectId, [...(cache.get(projectId) ?? []), optimistic]);
    emit(projectId);
    void actions.createProjectTask({ id, projectId, title: optimistic.title, priority: input.priority, dueDate: input.dueDate })
      .then((server) => {
        cache.set(projectId, (cache.get(projectId) ?? []).map((t) => (t.id === id ? server : t)));
        emit(projectId);
      })
      .catch(() => {
        cache.set(projectId, (cache.get(projectId) ?? []).filter((t) => t.id !== id));
        emit(projectId);
      });
    return id;
  }, [projectId]);

  const update = useCallback((id: string, patch: Partial<ProjectTask>) => {
    if (!projectId) return;
    const list = cache.get(projectId) ?? [];
    const prev = list.find((t) => t.id === id);
    if (!prev) return;
    cache.set(projectId, list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    emit(projectId);
    void actions.updateProjectTask(id, {
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.done !== undefined && { done: patch.done }),
      // `priority`/`dueDate` tozalash `undefined` qiymat bilan chaqiriladi
      // (masalan DatePickerButton'ning "Tozalash" tugmasi) — shu sabab
      // `!== undefined` emas, `"key" in patch` bilan tekshiriladi: aks holda
      // "tozalash" (undefined) va "umuman tegilmagan" (key yo'q) bir xil
      // ko'rinib, tozalash so'rovi jo'natilmasdan yutilib qolardi.
      ...("priority" in patch && { priority: patch.priority ?? null }),
      ...("dueDate" in patch && { dueDate: patch.dueDate ?? null }),
      ...(patch.order !== undefined && { order: patch.order }),
    }).catch(() => {
      cache.set(projectId, (cache.get(projectId) ?? []).map((t) => (t.id === id ? prev : t)));
      emit(projectId);
    });
  }, [projectId]);

  const remove = useCallback((id: string) => {
    if (!projectId) return;
    const prev = cache.get(projectId) ?? [];
    cache.set(projectId, prev.filter((t) => t.id !== id));
    emit(projectId);
    void actions.removeProjectTask(id).catch(() => { cache.set(projectId, prev); emit(projectId); });
  }, [projectId]);

  return { tasks, hydrated, create, update, remove };
}
