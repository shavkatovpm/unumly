/* Reja'ning desktop va mobil ko'rinishlari uchun umumiy sof yordamchilar. */

import { isIdeaDismissed } from "@/lib/ideas-store";
import type { Category, Idea } from "@/lib/types";

export const SORT_KEY = "unumly:reja:sort";
export type SortOrder = "new" | "old" | "priority";

/* ─── Reorder helper ───────────────────────────────────────────
   Shared by TabView (MaterialTabBar), KanbanView and mobile menu. Computes
   the new order of categories after a move and pushes order updates only
   for the rows whose position actually changed. */
export function reorderCategories(
  current: Category[],
  draggedId: string,
  beforeId: string | null,
  updateCategory: (id: string, patch: Partial<Category>) => void
) {
  const list = [...current];
  const from = list.findIndex((c) => c.id === draggedId);
  const to = beforeId
    ? list.findIndex((c) => c.id === beforeId)
    : list.length;
  if (from < 0) return;
  if (beforeId && to < 0) return;
  if (from === to) return;
  const [moved] = list.splice(from, 1);
  list.splice(from < to ? to - 1 : to, 0, moved);
  list.forEach((c, idx) => {
    if (c.order !== idx) updateCategory(c.id, { order: idx });
  });
}

/** Toifani bir qadam chapga/o'ngga surish uchun `beforeId`. null — oxiriga. */
export function beforeIdForMove(categories: Category[], id: string, delta: -1 | 1): string | null | undefined {
  const i = categories.findIndex((c) => c.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= categories.length) return undefined;
  return delta < 0 ? categories[i - 1].id : i + 2 < categories.length ? categories[i + 2].id : null;
}

const PRIORITY_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export function sortIdeas(arr: Idea[], order: SortOrder): Idea[] {
  return [...arr].sort((a, b) => {
    if (order === "priority") {
      const pa = a.priority ? PRIORITY_RANK[a.priority] ?? 0 : 0;
      const pb = b.priority ? PRIORITY_RANK[b.priority] ?? 0 : 0;
      if (pb !== pa) return pb - pa; // muhimi tepada
      return -a.createdAt.localeCompare(b.createdAt); // teng bo'lsa — yangisi tepada
    }
    const cmp = a.createdAt.localeCompare(b.createdAt);
    return order === "new" ? -cmp : cmp;
  });
}

// Sanali g'oyalar rejadan chiqadi (ular Plan sifatida Bugun/Agenda/Kalendarda).
export function isOnBoard(i: Idea): boolean {
  return !i.scheduledFor;
}

// "Bajarilgan" dropdownda faqat yaqinda (oxirgi 7 kun) bajarilganlar ko'rinadi
// va "Tozalash" bilan yashirilmaganlar. Ma'lumot o'chmaydi — Arxivda qoladi.
export const DONE_VISIBLE_DAYS = 7;
export function isRecentlyDone(i: Idea): boolean {
  if (!i.done || i.scheduledFor) return false;
  if (isIdeaDismissed(i.id)) return false;
  const at = i.completedAt;
  if (!at) return true; // eski (completedAt yo'q) — ko'rsatamiz
  return Date.now() - new Date(at).getTime() <= DONE_VISIBLE_DAYS * 86_400_000;
}
