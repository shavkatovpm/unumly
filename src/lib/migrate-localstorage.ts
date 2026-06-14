"use client";

import type { Category, Idea, Plan } from "@/lib/types";
import { importPlans } from "@/lib/plans-actions";
import { importIdeas } from "@/lib/ideas-actions";
import { importCategories } from "@/lib/categories-actions";
import { migrateCategoryColor } from "@/lib/category-palette";

const OLD_PLANS_KEY = "unumly:plans:v1";
const PLANS_FLAG_KEY = "unumly:migrated:v1";

const IDEAS_KEY = "unumly:ideas:v1";
const CATEGORIES_KEY = "unumly:categories:v1";
// Separate flag: existing users may already have PLANS_FLAG_KEY set from the
// earlier plans-only migration, but their local Reja data still needs importing.
const REJA_FLAG_KEY = "unumly:migrated:reja:v1";

function readArray<T>(key: string): T[] | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

/** Push localStorage plans to the user's DB account, then clear local copy. */
async function migratePlans(): Promise<number> {
  try {
    if (window.localStorage.getItem(PLANS_FLAG_KEY)) return 0;
  } catch {
    return 0;
  }

  const plans = readArray<Plan>(OLD_PLANS_KEY);
  if (!plans || plans.length === 0) {
    try { window.localStorage.setItem(PLANS_FLAG_KEY, "1"); } catch { /**/ }
    return 0;
  }

  try {
    const { imported } = await importPlans(
      plans.map((p) => ({
        id: p.id,
        title: p.title,
        notes: p.notes,
        scope: p.scope,
        scheduledFor: p.scheduledFor,
        time: p.time,
        duration: p.duration,
        priority: p.priority,
      }))
    );
    try {
      window.localStorage.setItem(PLANS_FLAG_KEY, "1");
      window.localStorage.removeItem(OLD_PLANS_KEY);
    } catch { /**/ }
    return imported;
  } catch {
    return 0; // unauthenticated or transient — retry next mount
  }
}

/** Push localStorage Reja data (categories + ideas) to the user's DB account. */
async function migrateReja(): Promise<{ categories: number; ideas: number }> {
  try {
    if (window.localStorage.getItem(REJA_FLAG_KEY)) return { categories: 0, ideas: 0 };
  } catch {
    return { categories: 0, ideas: 0 };
  }

  const rawCats = readArray<Record<string, unknown>>(CATEGORIES_KEY);
  const rawIdeas = readArray<Record<string, unknown>>(IDEAS_KEY);

  // Nothing local to migrate — flag it so we stop checking.
  if ((!rawCats || rawCats.length === 0) && (!rawIdeas || rawIdeas.length === 0)) {
    try { window.localStorage.setItem(REJA_FLAG_KEY, "1"); } catch { /**/ }
    return { categories: 0, ideas: 0 };
  }

  // Categories first (ideas reference categoryId).
  const categories = (rawCats ?? []).map((c) => ({
    id: String(c.id),
    label: String(c.label ?? ""),
    color: migrateCategoryColor(c.color) as Category["color"],
    order: typeof c.order === "number" ? (c.order as number) : undefined,
  })).filter((c) => c.id && c.label);

  // Ideas: map any legacy `category` field to `categoryId`.
  const LEGACY_CATEGORY_MAP: Record<string, string> = {
    ish: "ish",
    "o'rganish": "organish",
    shaxsiy: "ish",
    salomatlik: "ish",
  };
  const ideas = (rawIdeas ?? []).map((i) => {
    const categoryId =
      (i.categoryId as string) ??
      (typeof i.category === "string"
        ? LEGACY_CATEGORY_MAP[i.category] ?? i.category
        : undefined);
    return {
      id: String(i.id),
      title: String(i.title ?? ""),
      categoryId: String(categoryId ?? ""),
      notes: i.notes as string | undefined,
      scheduledFor: i.scheduledFor as string | undefined,
      time: i.time as string | undefined,
      duration: i.duration as number | undefined,
      priority: (i as Idea).priority,
    };
  }).filter((i) => i.id && i.title);

  try {
    // Categories before ideas: importCategories also flags the user as seeded,
    // so the default categories aren't added on top of the imported set.
    const catRes = categories.length
      ? await importCategories(categories)
      : { imported: 0 };
    const ideaImport = ideas.length ? await importIdeas(ideas) : { imported: 0 };

    try {
      window.localStorage.setItem(REJA_FLAG_KEY, "1");
      window.localStorage.removeItem(IDEAS_KEY);
      window.localStorage.removeItem(CATEGORIES_KEY);
    } catch { /**/ }
    return { categories: catRes.imported, ideas: ideaImport.imported };
  } catch {
    return { categories: 0, ideas: 0 }; // unauthenticated or transient — retry
  }
}

/**
 * One-time localStorage → DB migration. Idempotent and safe to call on every
 * authenticated mount. Migrates pre-backend plans and Reja (ideas/categories).
 */
export async function migrateLocalStorageOnce(): Promise<{
  imported: number;
  reja: { categories: number; ideas: number };
}> {
  if (typeof window === "undefined") {
    return { imported: 0, reja: { categories: 0, ideas: 0 } };
  }

  const [imported, reja] = await Promise.all([migratePlans(), migrateReja()]);
  return { imported, reja };
}
