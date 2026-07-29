import "server-only";

import { prisma } from "@/lib/prisma";
import { withMcpErrors } from "@/lib/mcp/errors";

/* Reja kategoriyalari uchun sukut to'plam — categories-actions.ts:DEFAULTS
 * bilan bir xil (faqat shaxsiy Reja uchun, bir marta seed qilinadi). */
const CATEGORY_DEFAULTS = [
  { id: "ish", label: "Ish", color: "pink", order: 0 },
  { id: "organish", label: "O'rganish", color: "indigo", order: 1 },
] as const;

/* Odat kategoriyalari uchun sukut to'plam — habit-categories-actions.ts:DEFAULTS. */
const HABIT_CATEGORY_DEFAULTS = [
  { label: "Sog'liq", icon: "heart" },
  { label: "Sport", icon: "dumbbell" },
  { label: "O'rganish", icon: "book" },
  { label: "Shaxsiy", icon: "sparkles" },
] as const;

async function ensurePersonalCategoriesSeeded(ownerUserId: string): Promise<void> {
  const u = await prisma.user.findUnique({ where: { id: ownerUserId }, select: { categoriesSeeded: true } });
  if (!u || u.categoriesSeeded) return;
  await prisma.$transaction([
    prisma.category.createMany({ data: CATEGORY_DEFAULTS.map((d) => ({ ...d, userId: ownerUserId })), skipDuplicates: true }),
    prisma.user.update({ where: { id: ownerUserId }, data: { categoriesSeeded: true } }),
  ]);
}

async function ensureHabitCategoriesSeeded(ownerUserId: string): Promise<void> {
  const u = await prisma.user.findUnique({ where: { id: ownerUserId }, select: { habitCategoriesSeeded: true } });
  if (!u || u.habitCategoriesSeeded) return;
  await prisma.$transaction([
    prisma.habitCategory.createMany({
      data: HABIT_CATEGORY_DEFAULTS.map((d, i) => ({ ...d, userId: ownerUserId, order: i })),
      skipDuplicates: true,
    }),
    prisma.user.update({ where: { id: ownerUserId }, data: { habitCategoriesSeeded: true } }),
  ]);
}

/** get_structure — MCP tool'lari uchun bosh "xarita": loyihalar (category/
 *  targetHours + har bo'lim bo'yicha ochiq son bilan), shaxsiy va loyiha-ichi
 *  Reja kategoriyalari, Odat kategoriyalari, va Plan uchun ruxsat etilgan
 *  enum qiymatlari. Moliya modellariga hech qanday so'rov yo'q. */
async function getStructureImpl(ownerUserId: string) {
  await Promise.all([ensurePersonalCategoriesSeeded(ownerUserId), ensureHabitCategoriesSeeded(ownerUserId)]);

  const [projects, planCounts, ideaCounts, taskCounts, pageCounts, goalCounts, categories, habitCategories, personalQuickLists] =
    await Promise.all([
      prisma.project.findMany({
        where: { userId: ownerUserId, archivedAt: null },
        orderBy: [{ order: "asc" }],
        select: { id: true, title: true, category: true, targetHours: true },
      }),
      prisma.plan.groupBy({
        by: ["projectId"],
        where: { userId: ownerUserId, deletedAt: null, status: { in: ["TODO", "IN_PROGRESS"] } },
        _count: { _all: true },
      }),
      prisma.idea.groupBy({
        by: ["projectId"],
        where: { userId: ownerUserId, done: false },
        _count: { _all: true },
      }),
      prisma.projectTask.groupBy({
        by: ["projectId"],
        where: { done: false, project: { userId: ownerUserId } },
        _count: { _all: true },
      }),
      prisma.page.groupBy({
        by: ["projectId"],
        where: { project: { userId: ownerUserId } },
        _count: { _all: true },
      }),
      prisma.goal.groupBy({
        by: ["projectId"],
        where: { userId: ownerUserId, status: "ACTIVE" },
        _count: { _all: true },
      }),
      prisma.category.findMany({
        where: { userId: ownerUserId },
        orderBy: [{ order: "asc" }],
        select: { id: true, label: true, color: true, projectId: true },
      }),
      prisma.habitCategory.findMany({
        where: { userId: ownerUserId },
        orderBy: [{ order: "asc" }],
        select: { id: true, label: true, icon: true },
      }),
      prisma.quickList.count({ where: { userId: ownerUserId, deletedAt: null, completedAt: null } }),
    ]);

  const byProject = <T extends { projectId: string | null; _count: { _all: number } }>(rows: T[]) =>
    new Map(rows.map((r) => [r.projectId, r._count._all]));
  const planByProject = byProject(planCounts);
  const ideaByProject = byProject(ideaCounts);
  const taskByProject = byProject(taskCounts);
  const pageByProject = byProject(pageCounts);
  const goalByProject = byProject(goalCounts);

  const personalCategories = categories
    .filter((c) => !c.projectId)
    .map((c) => ({ id: c.id, label: c.label, color: c.color }));
  const categoriesByProject = new Map<string, Array<{ id: string; label: string; color: string }>>();
  for (const c of categories) {
    if (!c.projectId) continue;
    const arr = categoriesByProject.get(c.projectId) ?? [];
    arr.push({ id: c.id, label: c.label, color: c.color });
    categoriesByProject.set(c.projectId, arr);
  }

  return {
    personal: {
      openPlans: planByProject.get(null) ?? 0,
      openIdeas: ideaByProject.get(null) ?? 0,
      openGoals: goalByProject.get(null) ?? 0,
      openQuickLists: personalQuickLists,
      categories: personalCategories,
    },
    habitCategories,
    projects: projects.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      targetHours: p.targetHours,
      openPlans: planByProject.get(p.id) ?? 0,
      openIdeas: ideaByProject.get(p.id) ?? 0,
      openProjectTasks: taskByProject.get(p.id) ?? 0,
      pageCount: pageByProject.get(p.id) ?? 0,
      openGoals: goalByProject.get(p.id) ?? 0,
      categories: categoriesByProject.get(p.id) ?? [],
    })),
    enums: {
      planPriority: ["LOW", "MEDIUM", "HIGH"],
      planScope: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"],
      planStatus: ["TODO", "IN_PROGRESS", "DONE", "MISSED", "CANCELLED", "ARCHIVED"],
      goalStatus: ["ACTIVE", "DONE", "ARCHIVED"],
      habitDays: "0=Yakshanba .. 6=Shanba (JS getDay() bilan bir xil)",
    },
  };
}

export const mcpGetStructure = withMcpErrors(getStructureImpl);
