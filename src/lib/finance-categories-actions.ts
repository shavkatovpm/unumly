"use server";

import type { FinanceCategory as DbFinanceCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { CategoryColor, FinanceCategory, TransactionType } from "@/lib/types";

/* Default kirim/chiqim kategoriyalari — har user uchun bir marta seed qilinadi.
 * Id'lar berilmaydi (cuid avtomatik) — shu sabab userlar orasida kolliziya yo'q. */
const DEFAULTS: Array<Omit<FinanceCategory, "id">> = [
  // ─── Kirim ───
  { type: "INCOME", label: "Maosh", icon: "wallet", color: "emerald", order: 0 },
  { type: "INCOME", label: "Biznes", icon: "briefcase", color: "teal", order: 1 },
  { type: "INCOME", label: "Qo'shimcha ish", icon: "coins", color: "olive", order: 2 },
  { type: "INCOME", label: "Investitsiya", icon: "trending-up", color: "indigo", order: 3 },
  { type: "INCOME", label: "Ijara", icon: "home", color: "slate", order: 4 },
  { type: "INCOME", label: "Sovg'a", icon: "gift", color: "pink", order: 5 },
  { type: "INCOME", label: "Boshqa", icon: "circle-dashed", color: "gray", order: 6 },
  // ─── Chiqim ───
  { type: "EXPENSE", label: "Oziq-ovqat", icon: "utensils", color: "pink", order: 0 },
  { type: "EXPENSE", label: "Transport", icon: "car", color: "indigo", order: 1 },
  { type: "EXPENSE", label: "Uy-joy", icon: "home", color: "slate", order: 2 },
  { type: "EXPENSE", label: "Kommunal", icon: "receipt", color: "stone", order: 3 },
  { type: "EXPENSE", label: "Xaridlar", icon: "shopping-bag", color: "mocha", order: 4 },
  { type: "EXPENSE", label: "Kiyim", icon: "shirt", color: "teal", order: 5 },
  { type: "EXPENSE", label: "Sog'liq", icon: "heart-pulse", color: "emerald", order: 6 },
  { type: "EXPENSE", label: "Ta'lim", icon: "graduation-cap", color: "indigo", order: 7 },
  { type: "EXPENSE", label: "Aloqa", icon: "smartphone", color: "olive", order: 8 },
  { type: "EXPENSE", label: "Ko'ngilochar", icon: "gamepad-2", color: "pink", order: 9 },
  { type: "EXPENSE", label: "Boshqa", icon: "circle-dashed", color: "gray", order: 10 },
];

function toFinanceCategory(c: DbFinanceCategory): FinanceCategory {
  return {
    id: c.id,
    type: c.type,
    label: c.label,
    icon: c.icon,
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

export async function listFinanceCategories(): Promise<FinanceCategory[]> {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { financeCategoriesSeeded: true },
  });
  if (dbUser && !dbUser.financeCategoriesSeeded) {
    await prisma.$transaction([
      prisma.financeCategory.createMany({
        data: DEFAULTS.map((d) => ({ ...d, userId: user.id })),
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { financeCategoriesSeeded: true },
      }),
    ]);
  }

  const rows = await prisma.financeCategory.findMany({
    where: { userId: user.id },
    orderBy: [{ type: "asc" }, { order: "asc" }],
  });
  return rows.map(toFinanceCategory);
}

/* ─── Create / update / delete ────────────────────────────── */

export type CreateFinanceCategoryInput = {
  id?: string;
  type: TransactionType;
  label: string;
  icon: string;
  color: CategoryColor;
};

export async function createFinanceCategory(
  input: CreateFinanceCategoryInput
): Promise<FinanceCategory> {
  const user = await requireUser();
  // Order is per-type so kirim/chiqim lists stay independently ordered.
  const last = await prisma.financeCategory.findFirst({
    where: { userId: user.id, type: input.type },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (last?.order ?? -1) + 1;
  const row = await prisma.financeCategory.create({
    data: {
      id: input.id,
      userId: user.id,
      type: input.type,
      label: input.label.trim(),
      icon: input.icon,
      color: input.color,
      order: nextOrder,
    },
  });
  return toFinanceCategory(row);
}

export type UpdateFinanceCategoryPatch = Partial<{
  label: string;
  icon: string;
  color: CategoryColor;
  order: number;
}>;

export async function updateFinanceCategory(
  id: string,
  patch: UpdateFinanceCategoryPatch
): Promise<FinanceCategory> {
  const user = await requireUser();
  const existing = await prisma.financeCategory.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");
  const row = await prisma.financeCategory.update({
    where: { id },
    data: {
      ...(patch.label !== undefined && { label: patch.label.trim() }),
      ...(patch.icon !== undefined && { icon: patch.icon }),
      ...(patch.color !== undefined && { color: patch.color }),
      ...(patch.order !== undefined && { order: patch.order }),
    },
  });
  return toFinanceCategory(row);
}

/** Kategoriyani o'chirish. Tranzaksiyalar saqlanadi — ularning categoryId
 *  null bo'ladi (schema'da onDelete: SetNull). */
export async function removeFinanceCategory(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.financeCategory.deleteMany({ where: { id, userId: user.id } });
}
