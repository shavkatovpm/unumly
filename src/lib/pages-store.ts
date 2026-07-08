"use client";

import { useCallback, useEffect, useState } from "react";
import type { Page } from "@/lib/types";
import * as actions from "@/lib/pages-actions";

/* Loyiha sahifalari (Hujjatlar) — har bir loyiha o'zining sahifalar
   ro'yxatini alohida keshda saqlaydi (talab bo'yicha yuklanadi), chunki
   bir vaqtning o'zida faqat bitta loyiha ochiq bo'ladi. */

const cache = new Map<string, Page[]>();
const listeners = new Map<string, Set<() => void>>();

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

/** `rootId` va uning barcha (to'g'ridan-to'g'ri va bilvosita) bola
 *  sahifalari — o'chirishda darhol UI'dan yo'qotish uchun. */
function collectSubtreeIds(list: Page[], rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of list) {
      if (p.parentId && ids.has(p.parentId) && !ids.has(p.id)) { ids.add(p.id); changed = true; }
    }
  }
  return ids;
}

export function usePages(projectId: string | null) {
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!projectId) return;
    const unsub = subscribe(projectId, () => forceRender((n) => n + 1));
    if (!cache.has(projectId)) {
      void actions.listPages(projectId)
        .then((rows) => { cache.set(projectId, rows); emit(projectId); })
        .catch(() => { cache.set(projectId, cache.get(projectId) ?? []); emit(projectId); });
    }
    return unsub;
  }, [projectId]);

  const hydrated = projectId ? cache.has(projectId) : false;
  const pages = (projectId && cache.get(projectId)) || [];

  const create = useCallback((input: { parentId?: string | null; title?: string }): string => {
    if (!projectId) return "";
    const id = nextId();
    const now = new Date().toISOString();
    const optimistic: Page = {
      id, projectId, parentId: input.parentId ?? null,
      title: input.title?.trim() || "Nomsiz", icon: undefined, content: null,
      order: (cache.get(projectId) ?? []).length,
      createdAt: now, updatedAt: now,
    };
    cache.set(projectId, [...(cache.get(projectId) ?? []), optimistic]);
    emit(projectId);
    void actions.createPage({ id, projectId, parentId: input.parentId, title: input.title })
      .then((server) => {
        cache.set(projectId, (cache.get(projectId) ?? []).map((p) => (p.id === id ? server : p)));
        emit(projectId);
      })
      .catch(() => {
        cache.set(projectId, (cache.get(projectId) ?? []).filter((p) => p.id !== id));
        emit(projectId);
      });
    return id;
  }, [projectId]);

  const update = useCallback((id: string, patch: Partial<Page>) => {
    if (!projectId) return;
    const list = cache.get(projectId) ?? [];
    const prev = list.find((p) => p.id === id);
    if (!prev) return;
    cache.set(projectId, list.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)));
    emit(projectId);
    void actions.updatePage(id, {
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.icon !== undefined && { icon: patch.icon ?? null }),
      ...(patch.content !== undefined && { content: patch.content }),
      ...(patch.parentId !== undefined && { parentId: patch.parentId }),
      ...(patch.order !== undefined && { order: patch.order }),
    }).catch(() => {
      cache.set(projectId, (cache.get(projectId) ?? []).map((p) => (p.id === id ? prev : p)));
      emit(projectId);
    });
  }, [projectId]);

  const remove = useCallback((id: string) => {
    if (!projectId) return;
    const list = cache.get(projectId) ?? [];
    const idsToRemove = collectSubtreeIds(list, id);
    cache.set(projectId, list.filter((p) => !idsToRemove.has(p.id)));
    emit(projectId);
    void actions.removePage(id).catch(() => {
      void actions.listPages(projectId).then((rows) => { cache.set(projectId, rows); emit(projectId); });
    });
  }, [projectId]);

  /** Bir xil ota (parentId)ga tegishli sahifalarni drag-and-drop orqali
   *  qayta tartiblaydi — `orderedIds` shu guruhning to'liq yangi ketma-
   *  ketligi. Xato bo'lsa serverdan qayta yuklab tiklaydi. */
  const reorder = useCallback((orderedIds: string[]) => {
    if (!projectId) return;
    const list = cache.get(projectId) ?? [];
    const indexById = new Map(orderedIds.map((id, i) => [id, i]));
    cache.set(projectId, list.map((p) => (indexById.has(p.id) ? { ...p, order: indexById.get(p.id)! } : p)));
    emit(projectId);
    void actions.reorderPages(projectId, orderedIds).catch(() => {
      void actions.listPages(projectId).then((rows) => { cache.set(projectId, rows); emit(projectId); });
    });
  }, [projectId]);

  return { pages, hydrated, create, update, remove, reorder };
}
