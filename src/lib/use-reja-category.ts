"use client";

import { useMemo } from "react";
import { useIdeas } from "./ideas-store";
import { useCategories } from "./categories-store";
import { CATEGORY_PALETTE } from "./category-palette";

/**
 * Map: plan/idea id → manba Reja toifasi (label + rang).
 *
 * Reja'dagi g'oya (Idea) jadvalga belgilanganda bir xil `id` bilan Plan'ga
 * aylanadi, lekin Plan'da toifa yo'q. Idea esa store'da qoladi — shu sabab
 * plan.id orqali manba toifani topib, taskda "qaysi rejadan" belgisini
 * ko'rsatamiz. Toifasi yo'q (Reja'dan kelmagan) tasklar map'da bo'lmaydi.
 */
export function useRejaCategoryMap(): Map<string, { label: string; color: string }> {
  const { ideas } = useIdeas();
  const { categories } = useCategories();
  return useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const m = new Map<string, { label: string; color: string }>();
    for (const i of ideas) {
      const c = byId.get(i.categoryId);
      if (c) m.set(i.id, { label: c.label, color: CATEGORY_PALETTE[c.color].oklch });
    }
    return m;
  }, [ideas, categories]);
}
