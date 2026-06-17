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

  // Defaultlarni faqat BIR MARTA seed qilamiz (User.habitCategoriesSeeded).
  // Shu sabab foydalanuvchi defaultlarni o'chirsa, ular qayta paydo bo'lmaydi.
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { habitCategoriesSeeded: true },
  });
  if (dbUser && !dbUser.habitCategoriesSeeded) {
    await prisma.$transaction([
      prisma.habitCategory.createMany({
        data: DEFAULTS.map((d, i) => ({ ...d, userId: user.id, order: i })),
        skipDuplicates: true,
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { habitCategoriesSeeded: true },
      }),
    ]);
  }

  const rows = await prisma.habitCategory.findMany({
    where: { userId: user.id },
    orderBy: [{ order: "asc" }],
  });
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
