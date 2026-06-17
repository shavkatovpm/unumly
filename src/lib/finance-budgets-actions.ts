"use server";

import type { Budget as DbBudget } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { Budget } from "@/lib/types";

function toBudget(b: DbBudget): Budget {
  return { id: b.id, categoryId: b.categoryId, amount: Number(b.amount) };
}

async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

export async function listBudgets(): Promise<Budget[]> {
  const user = await requireUser();
  const rows = await prisma.budget.findMany({ where: { userId: user.id } });
  return rows.map(toBudget);
}

/** Kategoriyaga oylik limit o'rnatish (mavjud bo'lsa yangilaydi). Kategoriya
 *  shu userniki va chiqim turida ekanini tekshiradi. */
export async function setBudget(categoryId: string, amount: number): Promise<Budget> {
  const user = await requireUser();
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_AMOUNT");

  const cat = await prisma.financeCategory.findFirst({
    where: { id: categoryId, userId: user.id, type: "EXPENSE" },
    select: { id: true },
  });
  if (!cat) throw new Error("CATEGORY_NOT_FOUND");

  const row = await prisma.budget.upsert({
    where: { userId_categoryId: { userId: user.id, categoryId } },
    create: { userId: user.id, categoryId, amount: BigInt(Math.round(amount)) },
    update: { amount: BigInt(Math.round(amount)) },
  });
  return toBudget(row);
}

export async function removeBudget(categoryId: string): Promise<void> {
  const user = await requireUser();
  await prisma.budget.deleteMany({ where: { userId: user.id, categoryId } });
}
