"use server";

import type { Transaction as DbTransaction } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { Transaction, TransactionType } from "@/lib/types";

function toTransaction(t: DbTransaction): Transaction {
  return {
    id: t.id,
    type: t.type,
    // so'm summalari (milliardlargacha) JS number xavfsiz oralig'ida (2^53).
    amount: Number(t.amount),
    categoryId: t.categoryId,
    note: t.note ?? undefined,
    date: t.date,
    createdAt: t.createdAt.toISOString(),
  };
}

async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

/** "YYYY-MM" formatini tekshiradi (oylik filtrlar uchun). */
function isMonth(v: string): boolean {
  return /^\d{4}-\d{2}$/.test(v);
}

/* ─── Read ─────────────────────────────────────────────────── */

/** Tranzaksiyalar ro'yxati. `month` ("YYYY-MM") berilsa shu oy, aks holda
 *  eng so'nggi `limit` ta yozuv. O'chirilganlar (deletedAt) chiqmaydi. */
export async function listTransactions(opts?: {
  month?: string;
  limit?: number;
}): Promise<Transaction[]> {
  const user = await requireUser();
  const month = opts?.month && isMonth(opts.month) ? opts.month : undefined;

  const rows = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
      ...(month && { date: { startsWith: month } }),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: month ? undefined : opts?.limit ?? 100,
  });
  return rows.map(toTransaction);
}

export type MonthlySummary = {
  month: string;
  income: number;
  expense: number;
  balance: number;
  /** Kategoriya bo'yicha jami (donut/taqsimot uchun). categoryId null =
   *  kategoriyasiz yozuvlar. */
  byCategory: Array<{ categoryId: string | null; type: TransactionType; total: number }>;
};

/** Bir oyning xulosasi: kirim, chiqim, balans va kategoriya bo'yicha taqsimot. */
export async function getMonthlySummary(month: string): Promise<MonthlySummary> {
  const user = await requireUser();
  const m = isMonth(month) ? month : undefined;
  if (!m) throw new Error("INVALID_MONTH");

  const grouped = await prisma.transaction.groupBy({
    by: ["categoryId", "type"],
    where: { userId: user.id, deletedAt: null, date: { startsWith: m } },
    _sum: { amount: true },
  });

  let income = 0;
  let expense = 0;
  const byCategory = grouped.map((g) => {
    const total = Number(g._sum.amount ?? 0);
    if (g.type === "INCOME") income += total;
    else expense += total;
    return { categoryId: g.categoryId, type: g.type as TransactionType, total };
  });

  return { month: m, income, expense, balance: income - expense, byCategory };
}

/* ─── Create / update / delete ─────────────────────────────── */

export type CreateTransactionInput = {
  type: TransactionType;
  amount: number; // so'm, musbat butun son
  categoryId?: string | null;
  note?: string;
  date: string; // YYYY-MM-DD
};

function sanitizeAmount(amount: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_AMOUNT");
  // tiyin yo'q — butun so'mga yaxlitlanadi.
  return BigInt(Math.round(amount));
}

async function resolveCategory(
  userId: string,
  categoryId: string | null | undefined,
  type: TransactionType
): Promise<string | null> {
  if (!categoryId) return null;
  // Kategoriya shu userniki va shu turga (kirim/chiqim) mosligini tekshiramiz.
  const cat = await prisma.financeCategory.findFirst({
    where: { id: categoryId, userId, type },
    select: { id: true },
  });
  return cat?.id ?? null;
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<Transaction> {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("INVALID_DATE");
  const categoryId = await resolveCategory(user.id, input.categoryId, input.type);

  const row = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: input.type,
      amount: sanitizeAmount(input.amount),
      categoryId,
      note: input.note?.trim() || null,
      date: input.date,
    },
  });
  return toTransaction(row);
}

export type UpdateTransactionPatch = Partial<{
  type: TransactionType;
  amount: number;
  categoryId: string | null;
  note: string;
  date: string;
}>;

export async function updateTransaction(
  id: string,
  patch: UpdateTransactionPatch
): Promise<Transaction> {
  const user = await requireUser();
  const existing = await prisma.transaction.findFirst({
    where: { id, userId: user.id, deletedAt: null },
  });
  if (!existing) throw new Error("NOT_FOUND");

  // Tur o'zgarsa, kategoriya yangi turga mos bo'lishi shart (kategoriyalar
  // kirim/chiqimga bo'lingan). Mos bo'lmasa resolveCategory null qaytaradi.
  const nextType = patch.type ?? existing.type;
  let categoryId: string | null | undefined =
    patch.categoryId !== undefined
      ? await resolveCategory(user.id, patch.categoryId, nextType)
      : undefined;
  // Tur o'zgardi-yu yangi kategoriya berilmagan bo'lsa — eski kategoriya boshqa
  // turga tegishli, shuning uchun uni tozalaymiz.
  if (categoryId === undefined && patch.type !== undefined && patch.type !== existing.type) {
    categoryId = null;
  }

  if (patch.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(patch.date)) {
    throw new Error("INVALID_DATE");
  }

  const row = await prisma.transaction.update({
    where: { id },
    data: {
      ...(patch.type !== undefined && { type: patch.type }),
      ...(patch.amount !== undefined && { amount: sanitizeAmount(patch.amount) }),
      ...(categoryId !== undefined && { categoryId }),
      ...(patch.note !== undefined && { note: patch.note.trim() || null }),
      ...(patch.date !== undefined && { date: patch.date }),
    },
  });
  return toTransaction(row);
}

/** Soft delete — 30 kundan keyin tozalanadi (Plan bilan bir xil). */
export async function removeTransaction(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.transaction.updateMany({
    where: { id, userId: user.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}
