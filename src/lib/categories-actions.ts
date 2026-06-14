"use server";

import type { Category as DbCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { Category, CategoryColor } from "@/lib/types";

/* Default categories seeded once per user (mirrors the old localStorage seed). */
const DEFAULTS: Array<{ id: string; label: string; color: CategoryColor; order: number }> = [
  { id: "ish", label: "Ish", color: "pink", order: 0 },
  { id: "organish", label: "O'rganish", color: "indigo", order: 1 },
];

function toCategory(c: DbCategory): Category {
  return {
    id: c.id,
    label: c.label,
    color: c.color as CategoryColor,
    order: c.order,
  };
}

async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

/* ─── Read (seeds defaults on first call) ─────────────────── */

export async function listCategories(): Promise<Category[]> {
  const user = await requireUser();

  // First-ever fetch for this user → seed the default categories once.
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { categoriesSeeded: true },
  });
  if (dbUser && !dbUser.categoriesSeeded) {
    await prisma.$transaction([
      prisma.category.createMany({
        data: DEFAULTS.map((d) => ({ ...d, userId: user.id })),
        skipDuplicates: true,
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { categoriesSeeded: true },
      }),
    ]);
  }

  const rows = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: [{ order: "asc" }],
  });
  return rows.map(toCategory);
}

/* ─── Create / update / delete ────────────────────────────── */

export type CreateCategoryInput = {
  id?: string;
  label: string;
  color: CategoryColor;
};

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const user = await requireUser();
  const last = await prisma.category.findFirst({
    where: { userId: user.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (last?.order ?? -1) + 1;
  const row = await prisma.category.create({
    data: {
      id: input.id,
      userId: user.id,
      label: input.label.trim(),
      color: input.color,
      order: nextOrder,
    },
  });
  return toCategory(row);
}

export type UpdateCategoryPatch = Partial<{
  label: string;
  color: CategoryColor;
  order: number;
}>;

export async function updateCategory(id: string, patch: UpdateCategoryPatch): Promise<Category> {
  const user = await requireUser();
  const existing = await prisma.category.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");
  const row = await prisma.category.update({
    where: { id },
    data: {
      ...(patch.label !== undefined && { label: patch.label.trim() }),
      ...(patch.color !== undefined && { color: patch.color }),
      ...(patch.order !== undefined && { order: patch.order }),
    },
  });
  return toCategory(row);
}

export async function removeCategory(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.category.deleteMany({ where: { id, userId: user.id } });
}

/* ─── First-login importer ────────────────────────────────── */

/** Push a batch of localStorage categories to the user's DB account.
 *  Skips IDs that already exist for the user (idempotent). */
export async function importCategories(
  items: Array<{ id: string; label: string; color: CategoryColor; order?: number }>
): Promise<{ imported: number }> {
  const user = await requireUser();
  if (items.length === 0) return { imported: 0 };

  const ids = items.map((i) => i.id);
  const existing = await prisma.category.findMany({
    where: { userId: user.id, id: { in: ids } },
    select: { id: true },
  });
  const existingSet = new Set(existing.map((x) => x.id));
  const toInsert = items.filter((i) => !existingSet.has(i.id));
  if (toInsert.length === 0) return { imported: 0 };

  await prisma.category.createMany({
    data: toInsert.map((i, idx) => ({
      id: i.id,
      userId: user.id,
      label: i.label.trim(),
      color: i.color,
      order: i.order ?? idx,
    })),
    skipDuplicates: true,
  });
  // The user clearly already had categories locally — mark seeded so we don't
  // re-add the defaults on top of their imported set.
  await prisma.user.update({
    where: { id: user.id },
    data: { categoriesSeeded: true },
  });
  return { imported: toInsert.length };
}
