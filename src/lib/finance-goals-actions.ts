"use server";

import type { FinancialGoal as DbFinancialGoal, GoalContribution as DbGoalContribution } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { FinancialGoal, GoalContribution } from "@/lib/types";

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

function toContribution(c: DbGoalContribution): GoalContribution {
  return {
    id: c.id,
    goalId: c.goalId,
    amount: Number(c.amount),
    date: c.date,
    note: c.note ?? undefined,
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
 *  Natija 0 dan past bo'lmaydi. Har bir hissa alohida tarix yozuvi sifatida
 *  saqlanadi (GoalContribution) — keyinroq ko'rish/tahrirlash uchun. */
export async function contributeFinancialGoal(
  id: string,
  delta: number,
  date: string,
  note?: string
): Promise<{ goal: FinancialGoal; contribution: GoalContribution }> {
  const user = await requireUser();
  if (!Number.isFinite(delta) || delta === 0) throw new Error("INVALID_AMOUNT");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("INVALID_DATE");
  const existing = await prisma.financialGoal.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");
  const next = Math.max(0, Number(existing.savedAmount) + Math.round(delta));
  const [goalRow, contribRow] = await prisma.$transaction([
    prisma.financialGoal.update({ where: { id }, data: { savedAmount: BigInt(next) } }),
    prisma.goalContribution.create({
      data: {
        userId: user.id,
        goalId: id,
        amount: BigInt(Math.round(delta)),
        date,
        note: note?.trim() || null,
      },
    }),
  ]);
  return { goal: toGoal(goalRow), contribution: toContribution(contribRow) };
}

export async function listGoalContributions(goalId: string): Promise<GoalContribution[]> {
  const user = await requireUser();
  const rows = await prisma.goalContribution.findMany({
    where: { goalId, userId: user.id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toContribution);
}

/** Tarix yozuvini tahrirlash (summa/sana/izoh) — maqsadning savedAmount'i
 *  farqqa qarab qayta hisoblanadi (0 dan past bo'lmaydi). */
export async function updateGoalContribution(
  id: string,
  patch: { amount?: number; date?: string; note?: string }
): Promise<{ goal: FinancialGoal; contribution: GoalContribution }> {
  const user = await requireUser();
  const existing = await prisma.goalContribution.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");
  if (patch.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(patch.date)) throw new Error("INVALID_DATE");
  if (patch.amount !== undefined && (!Number.isFinite(patch.amount) || patch.amount === 0)) {
    throw new Error("INVALID_AMOUNT");
  }
  const goal = await prisma.financialGoal.findFirst({ where: { id: existing.goalId, userId: user.id } });
  if (!goal) throw new Error("NOT_FOUND");

  const oldAmount = Number(existing.amount);
  const newAmount = patch.amount !== undefined ? Math.round(patch.amount) : oldAmount;
  const nextSaved = Math.max(0, Number(goal.savedAmount) - oldAmount + newAmount);

  const [goalRow, contribRow] = await prisma.$transaction([
    prisma.financialGoal.update({ where: { id: goal.id }, data: { savedAmount: BigInt(nextSaved) } }),
    prisma.goalContribution.update({
      where: { id },
      data: {
        ...(patch.amount !== undefined && { amount: BigInt(newAmount) }),
        ...(patch.date !== undefined && { date: patch.date }),
        ...(patch.note !== undefined && { note: patch.note.trim() || null }),
      },
    }),
  ]);
  return { goal: toGoal(goalRow), contribution: toContribution(contribRow) };
}

/** Tarix yozuvini o'chirish — maqsadning savedAmount'idan shu yozuv summasi
 *  ayiriladi (0 dan past bo'lmaydi). */
export async function removeGoalContribution(id: string): Promise<FinancialGoal> {
  const user = await requireUser();
  const existing = await prisma.goalContribution.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");
  const goal = await prisma.financialGoal.findFirst({ where: { id: existing.goalId, userId: user.id } });
  if (!goal) throw new Error("NOT_FOUND");
  const nextSaved = Math.max(0, Number(goal.savedAmount) - Number(existing.amount));
  const [goalRow] = await prisma.$transaction([
    prisma.financialGoal.update({ where: { id: goal.id }, data: { savedAmount: BigInt(nextSaved) } }),
    prisma.goalContribution.delete({ where: { id } }),
  ]);
  return toGoal(goalRow);
}

export async function removeFinancialGoal(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.financialGoal.deleteMany({ where: { id, userId: user.id } });
}
