"use server";

import type { Debt as DbDebt } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { Currency, Debt, DebtType } from "@/lib/types";

const CURRENCIES: Currency[] = ["UZS", "USD", "EUR"];
function toCurrency(v: string | null | undefined): Currency {
  return CURRENCIES.includes(v as Currency) ? (v as Currency) : "UZS";
}

function toDebt(d: DbDebt): Debt {
  return {
    id: d.id,
    type: d.type,
    counterparty: d.counterparty,
    amount: Number(d.amount),
    paidAmount: Number(d.paidAmount),
    currency: toCurrency(d.currency),
    issuedDate: d.issuedDate,
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

/** Muddatdan `leadDays` kun oldin, ertalabki (09:00 Toshkent) eslatma instanti.
 *  Eslatma o'chirilgan yoki muddat bo'lmasa — bot hech narsa yubormaydi. */
function computeNotifyAt(
  dueDate: string | null | undefined,
  agendaReminder: boolean,
  leadDays: number
): Date | null {
  if (!agendaReminder || !dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
  const d = new Date(`${dueDate}T09:00:00+05:00`);
  if (Number.isNaN(d.getTime())) return null;
  if (leadDays > 0) d.setTime(d.getTime() - leadDays * 86_400_000);
  return d;
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
  currency?: Currency;
  issuedDate: string;
  dueDate?: string | null;
  note?: string;
  agendaReminder?: boolean;
  reminderLeadDays?: number;
};

export async function createDebt(input: CreateDebtInput): Promise<Debt> {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.issuedDate)) throw new Error("INVALID_DATE");
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
      currency: toCurrency(input.currency),
      issuedDate: input.issuedDate,
      dueDate: input.dueDate ?? null,
      note: input.note?.trim() || null,
      notifyAt: computeNotifyAt(input.dueDate, input.agendaReminder ?? false, input.reminderLeadDays ?? 0),
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
  currency: Currency;
  issuedDate: string;
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
  if (patch.issuedDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(patch.issuedDate)) throw new Error("INVALID_DATE");
  if (patch.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(patch.dueDate)) throw new Error("INVALID_DATE");

  // Muddat, eslatma toggle yoki lead kunlari o'zgarsa — notifyAt qayta
  // hisoblanadi va eslatma qayta yoqiladi (notifiedAt tozalanadi).
  const notifyInputsChanged =
    patch.dueDate !== undefined ||
    patch.agendaReminder !== undefined ||
    patch.reminderLeadDays !== undefined;
  const nextDueDate = patch.dueDate !== undefined ? patch.dueDate : existing.dueDate;
  const nextAgendaReminder = patch.agendaReminder !== undefined ? patch.agendaReminder : existing.agendaReminder;
  const nextLeadDays = patch.reminderLeadDays !== undefined ? patch.reminderLeadDays : existing.reminderLeadDays;

  const row = await prisma.debt.update({
    where: { id },
    data: {
      ...(patch.counterparty !== undefined && { counterparty: patch.counterparty.trim() }),
      ...(patch.amount !== undefined && { amount: amountToBig(patch.amount) }),
      ...(patch.currency !== undefined && { currency: toCurrency(patch.currency) }),
      ...(patch.note !== undefined && { note: patch.note.trim() || null }),
      ...(patch.issuedDate !== undefined && { issuedDate: patch.issuedDate }),
      ...(patch.dueDate !== undefined && { dueDate: patch.dueDate }),
      ...(notifyInputsChanged && {
        notifyAt: computeNotifyAt(nextDueDate, nextAgendaReminder, nextLeadDays),
        notifiedAt: null,
      }),
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
