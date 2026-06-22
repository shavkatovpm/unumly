"use server";

import type { Debt as DbDebt } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { Debt, DebtType } from "@/lib/types";

function toDebt(d: DbDebt): Debt {
  return {
    id: d.id,
    type: d.type,
    counterparty: d.counterparty,
    amount: Number(d.amount),
    paidAmount: Number(d.paidAmount),
    dueDate: d.dueDate ?? undefined,
    note: d.note ?? undefined,
    settledAt: d.settledAt?.toISOString() ?? undefined,
    order: d.order,
    agendaReminder: d.agendaReminder,
    reminderLeadDays: d.reminderLeadDays,
    snoozedUntil: d.snoozedUntil ?? undefined,
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

/** Muddat kunining ertalabki (09:00 Toshkent) eslatma instanti. */
function computeNotifyAt(dueDate: string | null | undefined): Date | null {
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
  const d = new Date(`${dueDate}T09:00:00+05:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function listDebts(): Promise<Debt[]> {
  const user = await requireUser();
  const rows = await prisma.debt.findMany({
    where: { userId: user.id },
    orderBy: [{ settledAt: "asc" }, { order: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(toDebt);
}

export type CreateDebtInput = {
  id?: string;
  type: DebtType;
  counterparty: string;
  amount: number;
  dueDate?: string | null;
  note?: string;
  agendaReminder?: boolean;
  reminderLeadDays?: number;
};

export async function createDebt(input: CreateDebtInput): Promise<Debt> {
  const user = await requireUser();
  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) throw new Error("INVALID_DATE");
  if (!input.counterparty.trim()) throw new Error("COUNTERPARTY_REQUIRED");

  const last = await prisma.debt.findFirst({
    where: { userId: user.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const row = await prisma.debt.create({
    data: {
      id: input.id,
      userId: user.id,
      type: input.type,
      counterparty: input.counterparty.trim(),
      amount: amountToBig(input.amount),
      dueDate: input.dueDate ?? null,
      note: input.note?.trim() || null,
      notifyAt: computeNotifyAt(input.dueDate),
      agendaReminder: input.agendaReminder ?? false,
      reminderLeadDays: input.reminderLeadDays ?? 0,
      order: (last?.order ?? -1) + 1,
    },
  });
  return toDebt(row);
}

export type UpdateDebtPatch = Partial<{
  counterparty: string;
  amount: number;
  dueDate: string | null;
  note: string;
  agendaReminder: boolean;
  reminderLeadDays: number;
  snoozedUntil: string | null;
}>;

export async function updateDebt(id: string, patch: UpdateDebtPatch): Promise<Debt> {
  const user = await requireUser();
  const existing = await prisma.debt.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");
  if (patch.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(patch.dueDate)) throw new Error("INVALID_DATE");

  // Muddat o'zgarsa — notifyAt qayta hisoblanadi va eslatma qayta yoqiladi.
  const dueChanged = patch.dueDate !== undefined && patch.dueDate !== existing.dueDate;

  const row = await prisma.debt.update({
    where: { id },
    data: {
      ...(patch.counterparty !== undefined && { counterparty: patch.counterparty.trim() }),
      ...(patch.amount !== undefined && { amount: amountToBig(patch.amount) }),
      ...(patch.note !== undefined && { note: patch.note.trim() || null }),
      ...(patch.dueDate !== undefined && { dueDate: patch.dueDate }),
      ...(dueChanged && { notifyAt: computeNotifyAt(patch.dueDate), notifiedAt: null }),
      ...(patch.agendaReminder !== undefined && { agendaReminder: patch.agendaReminder }),
      ...(patch.reminderLeadDays !== undefined && { reminderLeadDays: patch.reminderLeadDays }),
      ...(patch.snoozedUntil !== undefined && { snoozedUntil: patch.snoozedUntil }),
    },
  });
  return toDebt(row);
}

/** Qisman qaytarish (delta musbat = qaytarildi). To'liq qoplansa settledAt qo'yiladi. */
export async function recordPayment(id: string, delta: number): Promise<Debt> {
  const user = await requireUser();
  if (!Number.isFinite(delta) || delta === 0) throw new Error("INVALID_AMOUNT");
  const existing = await prisma.debt.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");

  const total = Number(existing.amount);
  const nextPaid = Math.max(0, Math.min(total, Number(existing.paidAmount) + Math.round(delta)));
  const settled = nextPaid >= total;
  const row = await prisma.debt.update({
    where: { id },
    data: {
      paidAmount: BigInt(nextPaid),
      settledAt: settled ? existing.settledAt ?? new Date() : null,
    },
  });
  return toDebt(row);
}

/** To'liq hal qilingan deb belgilash (yoki qayta ochish). */
export async function setDebtSettled(id: string, settled: boolean): Promise<Debt> {
  const user = await requireUser();
  const existing = await prisma.debt.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");
  const row = await prisma.debt.update({
    where: { id },
    data: settled
      ? { settledAt: new Date(), paidAmount: existing.amount }
      : { settledAt: null },
  });
  return toDebt(row);
}

export async function removeDebt(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.debt.deleteMany({ where: { id, userId: user.id } });
}
