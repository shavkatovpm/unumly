"use server";

import type { HabitCategory as DbHabitCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { HabitCategory } from "@/lib/types";

const DEFAULTS: Array<{ label: string; icon: string }> = [
  { label: "Sog'liq", icon: "heart" },
  { label: "Sport", icon: "dumbbell" },
  { label: "O'rganish", icon: "book" },
  { label: "Shaxsiy", icon: "sparkles" },
];

function toCategory(c: DbHabitCategory): HabitCategory {
  return { id: c.id, label: c.label, icon: c.icon, order: c.order };
}

async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

export async function listHabitCategories(): Promise<HabitCategory[]> {
  const user = await requireUser();

  let rows = await prisma.habitCategory.findMany({
    where: { userId: user.id },
    orderBy: [{ order: "asc" }],
  });

  // Seed defaults only for a truly fresh user (no categories AND no habits),
  // so deleting the defaults later doesn't bring them back.
  if (rows.length === 0) {
    const habitCount = await prisma.habit.count({ where: { userId: user.id } });
    if (habitCount === 0) {
      await prisma.habitCategory.createMany({
        data: DEFAULTS.map((d, i) => ({ ...d, userId: user.id, order: i })),
      });
      rows = await prisma.habitCategory.findMany({
        where: { userId: user.id },
        orderBy: [{ order: "asc" }],
      });
    }
  }
  return rows.map(toCategory);
}

export async function createHabitCategory(input: { id?: string; label: string; icon: string }): Promise<HabitCategory> {
  const user = await requireUser();
  const last = await prisma.habitCategory.findFirst({
    where: { userId: user.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const row = await prisma.habitCategory.create({
    data: { id: input.id, userId: user.id, label: input.label.trim(), icon: input.icon, order: (last?.order ?? -1) + 1 },
  });
  return toCategory(row);
}

export async function updateHabitCategory(id: string, patch: Partial<{ label: string; icon: string; order: number }>): Promise<HabitCategory> {
  const user = await requireUser();
  const existing = await prisma.habitCategory.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");
  const row = await prisma.habitCategory.update({
    where: { id },
    data: {
      ...(patch.label !== undefined && { label: patch.label.trim() }),
      ...(patch.icon !== undefined && { icon: patch.icon }),
      ...(patch.order !== undefined && { order: patch.order }),
    },
  });
  return toCategory(row);
}

export async function removeHabitCategory(id: string): Promise<void> {
  const user = await requireUser();
  // Detach habits from this category (they become uncategorized, not deleted).
  await prisma.habit.updateMany({ where: { categoryId: id, userId: user.id }, data: { categoryId: null } });
  await prisma.habitCategory.deleteMany({ where: { id, userId: user.id } });
}
