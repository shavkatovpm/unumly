"use server";

import type { FinancialGoal as DbFinancialGoal } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { FinancialGoal } from "@/lib/types";

function toGoal(g: DbFinancialGoal): FinancialGoal {
  return {
    id: g.id,
    title: g.title,
    icon: g.icon ?? undefined,
    targetAmount: Number(g.targetAmount),
    savedAmount: Number(g.savedAmount),
    deadline: g.deadline ?? undefined,
    order: g.order,
  };
}

async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

function amountToBig(amount: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_AMOUNT");
  return BigInt(Math.round(amount));
}

export async function listFinancialGoals(): Promise<FinancialGoal[]> {
  const user = await requireUser();
  const rows = await prisma.financialGoal.findMany({
    where: { userId: user.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toGoal);
}

export type CreateFinancialGoalInput = {
  id?: string;
  title: string;
  targetAmount: number;
  icon?: string | null;
  deadline?: string | null;
};

export async function createFinancialGoal(
  input: CreateFinancialGoalInput
): Promise<FinancialGoal> {
  const user = await requireUser();
  if (input.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(input.deadline)) {
    throw new Error("INVALID_DATE");
  }
  const last = await prisma.financialGoal.findFirst({
    where: { userId: user.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const row = await prisma.financialGoal.create({
    data: {
      id: input.id,
      userId: user.id,
      title: input.title.trim(),
      targetAmount: amountToBig(input.targetAmount),
      icon: input.icon ?? null,
      deadline: input.deadline ?? null,
      order: (last?.order ?? -1) + 1,
    },
  });
  return toGoal(row);
}

export type UpdateFinancialGoalPatch = Partial<{
  title: string;
  targetAmount: number;
  icon: string | null;
  deadline: string | null;
}>;

export async function updateFinancialGoal(
  id: string,
  patch: UpdateFinancialGoalPatch
): Promise<FinancialGoal> {
  const user = await requireUser();
  const existing = await prisma.financialGoal.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");
  if (patch.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(patch.deadline)) {
    throw new Error("INVALID_DATE");
  }
  const row = await prisma.financialGoal.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.targetAmount !== undefined && { targetAmount: amountToBig(patch.targetAmount) }),
      ...(patch.icon !== undefined && { icon: patch.icon }),
      ...(patch.deadline !== undefined && { deadline: patch.deadline }),
    },
  });
  return toGoal(row);
}

/** Yig'ilgan summaga hissa qo'shish (delta musbat = qo'shish, manfiy = yechish).
 *  Natija 0 dan past bo'lmaydi. */
export async function contributeFinancialGoal(id: string, delta: number): Promise<FinancialGoal> {
  const user = await requireUser();
  if (!Number.isFinite(delta) || delta === 0) throw new Error("INVALID_AMOUNT");
  const existing = await prisma.financialGoal.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");
  const next = Number(existing.savedAmount) + Math.round(delta);
  const row = await prisma.financialGoal.update({
    where: { id },
    data: { savedAmount: BigInt(Math.max(0, next)) },
  });
  return toGoal(row);
}

export async function removeFinancialGoal(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.financialGoal.deleteMany({ where: { id, userId: user.id } });
}
