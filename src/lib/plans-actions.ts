"use server";

import { Prisma, type Plan as DbPlan } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser, getSessionUserId } from "@/lib/auth";
import { computeNotifyAt, sanitizeLeadMin } from "@/lib/notify-time";
import { DEFER_LIMIT, isDeferral, todayInTashkent } from "@/lib/plan-status";
import { markReminderDone } from "@/lib/telegram-bot";
import type { Plan, PlanScope, PlanStatus, PlanPriority, Subtask } from "@/lib/types";

/** Json ustunni Subtask[] ga (yoki undefined) aylantirish. */
function toSubtasks(v: unknown): Subtask[] | undefined {
  return Array.isArray(v) ? (v as unknown as Subtask[]) : undefined;
}

const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Fetch the current user's lead-time setting (minutes before scheduled time). */
async function getUserLeadMin(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { notifyLeadMin: true },
  });
  return sanitizeLeadMin(u?.notifyLeadMin);
}

/* ─── Serializer ──────────────────────────────────────────── */

function toPlan(p: DbPlan): Plan {
  return {
    id: p.id,
    title: p.title,
    notes: p.notes ?? undefined,
    subtasks: toSubtasks(p.subtasks),
    scope: p.scope as PlanScope,
    status: p.status as PlanStatus,
    priority: p.priority as PlanPriority | null ?? undefined,
    scheduledFor: p.scheduledFor,
    time: p.time ?? undefined,
    duration: p.duration ?? undefined,
    notifyLeadMin: p.notifyLeadMin ?? undefined,
    completedAt: p.completedAt ? p.completedAt.toISOString() : undefined,
    deletedAt: p.deletedAt ? p.deletedAt.toISOString() : undefined,
    createdAt: p.createdAt.toISOString(),
    order: p.order,
    deferCount: p.deferCount,
    habitId: p.habitId ?? undefined,
    goalStepId: p.goalStepId ?? undefined,
  };
}

/* ─── Auth helper ─────────────────────────────────────────── */

async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

/* ─── Read ────────────────────────────────────────────────── */

/** Returns all plans for the current user.
 *  Tez yuklanish uchun: auth faqat JWT'dan (DB urmasdan) va bitta `findMany`.
 *  Eski trash'ni tozalash bu hot path'da emas — cron'da bajariladi
 *  (`purgeExpiredTrash`), shuning uchun har yuklanishda ortiqcha yozish yo'q. */
export async function listPlans(): Promise<Plan[]> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("UNAUTHENTICATED");

  const rows = await prisma.plan.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }],
  });
  return rows.map(toPlan);
}

/** 30 kundan oshgan soft-deleted rejalarni butunlay o'chiradi (barcha userlar
 *  bo'yicha). Cron tomonidan chaqiriladi — endi har `listPlans`'da emas. */
export async function purgeExpiredTrash(): Promise<number> {
  const cutoff = new Date(Date.now() - TRASH_TTL_MS);
  const res = await prisma.plan.deleteMany({
    where: { deletedAt: { lt: cutoff } },
  });
  return res.count;
}

export async function getPlan(id: string): Promise<Plan | null> {
  const user = await requireUser();
  const row = await prisma.plan.findFirst({
    where: { id, userId: user.id },
  });
  return row ? toPlan(row) : null;
}

/* ─── Create / update ─────────────────────────────────────── */

export type CreatePlanInput = {
  id?: string;
  title: string;
  notes?: string;
  subtasks?: Subtask[];
  scope?: PlanScope;
  scheduledFor: string;     // YYYY-MM-DD
  time?: string;            // HH:MM
  duration?: number;
  priority?: PlanPriority;
  /** Per-task lead override (5/15/30). Omitted → user's account default. */
  notifyLeadMin?: number;
};

/** Upsert by id — used by ideas-store to mirror a scheduled idea as a plan. */
export async function upsertPlan(input: CreatePlanInput & { id: string }): Promise<Plan> {
  const user = await requireUser();
  const existing = await prisma.plan.findFirst({
    where: { id: input.id, userId: user.id },
    select: { id: true, order: true },
  });
  if (existing) {
    const effectiveLead =
      input.notifyLeadMin !== undefined
        ? sanitizeLeadMin(input.notifyLeadMin)
        : await getUserLeadMin(user.id);
    const row = await prisma.plan.update({
      where: { id: input.id },
      data: {
        title: input.title.trim(),
        notes: input.notes,
        scope: input.scope ?? "DAILY",
        priority: input.priority,
        scheduledFor: input.scheduledFor,
        time: input.time,
        duration: input.duration,
        notifyLeadMin: input.notifyLeadMin ?? null,
        notifyAt: computeNotifyAt(input.scheduledFor, input.time, effectiveLead),
        // Re-arm: if time changed, allow re-sending the reminder
        notifiedAt: null,
      },
    });
    return toPlan(row);
  }
  return createPlan(input);
}

export async function createPlan(input: CreatePlanInput): Promise<Plan> {
  const user = await requireUser();
  const [last, userLead] = await Promise.all([
    prisma.plan.findFirst({
      where: { userId: user.id },
      orderBy: { order: "desc" },
      select: { order: true },
    }),
    getUserLeadMin(user.id),
  ]);
  const nextOrder = (last?.order ?? -1) + 1;
  const effectiveLead =
    input.notifyLeadMin !== undefined ? sanitizeLeadMin(input.notifyLeadMin) : userLead;

  const row = await prisma.plan.create({
    data: {
      id: input.id,
      userId: user.id,
      title: input.title.trim(),
      notes: input.notes,
      ...(input.subtasks !== undefined && { subtasks: input.subtasks as unknown as Prisma.InputJsonValue }),
      scope: input.scope ?? "DAILY",
      status: "TODO",
      priority: input.priority,
      scheduledFor: input.scheduledFor,
      time: input.time,
      duration: input.duration,
      notifyLeadMin: input.notifyLeadMin ?? null,
      order: nextOrder,
      notifyAt: computeNotifyAt(input.scheduledFor, input.time, effectiveLead),
    },
  });
  return toPlan(row);
}

export type UpdatePlanPatch = Partial<{
  title: string;
  notes: string | null;
  subtasks: Subtask[];
  scope: PlanScope;
  status: PlanStatus;
  priority: PlanPriority | null;
  scheduledFor: string;
  time: string | null;
  duration: number | null;
  notifyLeadMin: number | null;
  order: number;
  completedAt: string | null;
}>;

export async function updatePlan(id: string, patch: UpdatePlanPatch): Promise<Plan> {
  const user = await requireUser();
  const existing = await prisma.plan.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");

  // Jadval (ProjectTask)dan avtomatik yaratilgan Plan bo'lsa — sarlavha,
  // muhimlik va sana o'zgarishlari orqaga, o'sha taskka ham ko'chiriladi,
  // shunda ikkala joy (Jadval va Agenda/Bugun) hech qachon bir-biridan
  // "ajralib" qolmaydi.
  if (existing.projectTaskId && (patch.title !== undefined || patch.priority !== undefined || patch.scheduledFor !== undefined)) {
    await prisma.projectTask.update({
      where: { id: existing.projectTaskId },
      data: {
        ...(patch.title !== undefined && { title: patch.title.trim() }),
        ...(patch.priority !== undefined && { priority: patch.priority }),
        ...(patch.scheduledFor !== undefined && { dueDate: patch.scheduledFor }),
      },
    }).catch(() => {});
  }

  // Recompute notifyAt when scheduledFor, time or per-task lead changes
  const nextScheduledFor = patch.scheduledFor ?? existing.scheduledFor;
  const nextTime = patch.time === undefined ? existing.time : patch.time;
  const nextLeadOverride =
    patch.notifyLeadMin === undefined ? existing.notifyLeadMin : patch.notifyLeadMin;
  const reschedule =
    patch.scheduledFor !== undefined ||
    patch.time !== undefined ||
    patch.notifyLeadMin !== undefined;

  let effectiveLead = 0;
  if (reschedule) {
    effectiveLead =
      nextLeadOverride != null
        ? sanitizeLeadMin(nextLeadOverride)
        : await getUserLeadMin(user.id);
  }

  // Kechiktirish hisoblagichi. Faqat muddati kelgan/o'tgan reja kechroqqa
  // surilganda oshadi — kelajakdagi rejani qayta tartiblash bunga kirmaydi.
  const deferred =
    patch.scheduledFor !== undefined &&
    isDeferral(existing.scheduledFor, patch.scheduledFor);

  const { subtasks, ...rest } = patch;
  const row = await prisma.plan.update({
    where: { id },
    data: {
      ...rest,
      ...(deferred && { deferCount: { increment: 1 } }),
      ...(subtasks !== undefined && { subtasks: subtasks as unknown as Prisma.InputJsonValue }),
      completedAt:
        patch.completedAt === undefined
          ? undefined
          : patch.completedAt === null
          ? null
          : new Date(patch.completedAt),
      ...(reschedule && {
        notifyAt: computeNotifyAt(nextScheduledFor, nextTime, effectiveLead),
        notifiedAt: null, // re-arm reminder
      }),
    },
  });
  return toPlan(row);
}

/** Toggle TODO ↔ DONE. Returns the new status. */
export async function togglePlanStatus(id: string): Promise<Plan> {
  const user = await requireUser();
  const existing = await prisma.plan.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");
  const nowDone = existing.status !== "DONE";
  const row = await prisma.plan.update({
    where: { id },
    data: {
      status: nowDone ? "DONE" : "TODO",
      completedAt: nowDone ? new Date() : null,
    },
  });

  // If we just marked DONE from the app, edit any sent bot reminders to
  // remove the "Bajardim" button.
  if (nowDone) {
    void clearReminderButtons(id, "app").catch((err) =>
      console.error("clearReminderButtons failed", err)
    );
  }

  // Goal step occurrence — sinxronlash: qadam holatini ham yangilaymiz, shunda
  // Maqsad bo'limidagi progress darhol mos keladi.
  if (existing.goalStepId) {
    void prisma.goalStep.update({ where: { id: existing.goalStepId }, data: { done: nowDone } }).catch(() => {});
  }

  // Jadval taskidan yaratilgan Plan bo'lsa — "Bajarildi" holati orqaga,
  // o'sha taskka ham ko'chiriladi.
  if (existing.projectTaskId) {
    void prisma.projectTask.update({ where: { id: existing.projectTaskId }, data: { done: nowDone } }).catch(() => {});
  }

  return toPlan(row);
}

/* ─── Bajarilmagan rejalar ustidagi amallar ───────────────── */

/** "Bugunga ko'chirish" — bajarilmagan rejani bugunga tortadi.
 *  Sana o'zgargani uchun `updatePlan` deferCount'ni o'zi oshiradi va
 *  eslatmani qayta qo'yadi. Limitga yetgan reja ko'chirilmaydi (UI ham
 *  tugmani bloklaydi, bu server tomonidagi ikkinchi to'siq). */
export async function deferPlanToToday(id: string): Promise<Plan> {
  const user = await requireUser();
  const existing = await prisma.plan.findFirst({
    where: { id, userId: user.id },
    select: { deferCount: true, scheduledFor: true },
  });
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.deferCount >= DEFER_LIMIT) throw new Error("DEFER_LIMIT_REACHED");

  const today = todayInTashkent();
  if (existing.scheduledFor === today) return getPlanOrThrow(id, user.id);
  return updatePlan(id, { scheduledFor: today });
}

/** "Kerak emas ekan" — rejani CANCELLED qiladi (o'chirilmaydi).
 *  `cancelled: false` bilan chaqirilsa TODO holatiga qaytaradi. */
export async function setPlanCancelled(id: string, cancelled: boolean): Promise<Plan> {
  const user = await requireUser();
  const existing = await prisma.plan.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!existing) throw new Error("NOT_FOUND");
  const row = await prisma.plan.update({
    where: { id },
    data: { status: cancelled ? "CANCELLED" : "TODO", completedAt: null },
  });
  // Kerak emas deyilgan ish uchun yuborilgan bot eslatmalari osilib
  // qolmasin — tugmalarini olib tashlaymiz.
  if (cancelled) await prisma.botMessage.deleteMany({ where: { planId: id } });
  return toPlan(row);
}

/** Arxiv/"Kerak emas" ro'yxatidan rejani hayotga qaytarish: holati TODO
 *  bo'ladi va sanasi bugunga ko'chadi. DEFER_LIMIT bu yerda tekshirilmaydi —
 *  limit kundalik "qochib yurish"ni to'xtatish uchun, allaqachon oqimdan
 *  chiqib ketgan rejani butunlay qamab qo'yish uchun emas. */
export async function restorePlanToToday(id: string): Promise<Plan> {
  const user = await requireUser();
  const existing = await prisma.plan.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) throw new Error("NOT_FOUND");
  return updatePlan(id, { scheduledFor: todayInTashkent(), status: "TODO" });
}

async function getPlanOrThrow(id: string, userId: string): Promise<Plan> {
  const row = await prisma.plan.findFirst({ where: { id, userId } });
  if (!row) throw new Error("NOT_FOUND");
  return toPlan(row);
}

/** Edit all bot-sent reminders for a plan to show "Bajarildi" + remove buttons. */
async function clearReminderButtons(planId: string, via: "bot" | "app") {
  const [plan, messages] = await Promise.all([
    prisma.plan.findUnique({ where: { id: planId } }),
    prisma.botMessage.findMany({ where: { planId } }),
  ]);
  if (!plan || messages.length === 0) return;

  await Promise.allSettled(
    messages.map((m) =>
      markReminderDone({
        chatId: Number(m.chatId),
        messageId: m.messageId,
        title: plan.title,
        time: plan.time,
        via,
      })
    )
  );
  // Drop tracking — message is now in "final" state, no further edits needed
  await prisma.botMessage.deleteMany({ where: { planId } });
}

/* ─── Soft delete / restore / purge ───────────────────────── */

/** Agenda/Bugun'dan o'chirilayotgan (yoki trash orqali butunlay
 *  tozalanayotgan) Planlar orasida Jadval taskiga bog'langanlari bo'lsa —
 *  o'sha tasklarning muddatini tozalaydi (task o'zi o'chirilmaydi, faqat
 *  Jadval'dagi oddiy, sanasiz holatga qaytadi) va bog'lanishni uzadi —
 *  aks holda keyinchalik trash'dan tiklansa, endi mavjud bo'lmagan
 *  sinxronizatsiyaga "osilib" qolgan holat paydo bo'lardi. */
async function unlinkProjectTasksForPlans(planIds: string[]) {
  if (planIds.length === 0) return;
  const linked = await prisma.plan.findMany({
    where: { id: { in: planIds }, projectTaskId: { not: null } },
    select: { projectTaskId: true },
  });
  const taskIds = linked.map((p) => p.projectTaskId).filter((x): x is string => !!x);
  if (taskIds.length === 0) return;
  await prisma.projectTask.updateMany({
    where: { id: { in: taskIds } },
    data: { dueDate: null },
  });
}

export async function removePlan(id: string): Promise<void> {
  const user = await requireUser();
  await unlinkProjectTasksForPlans([id]);
  await prisma.plan.updateMany({
    where: { id, userId: user.id },
    data: { deletedAt: new Date(), projectTaskId: null },
  });
  // Silence any pending bot reminders for this plan
  await prisma.botMessage.deleteMany({ where: { planId: id } });
}

export async function removeManyPlans(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const user = await requireUser();
  await unlinkProjectTasksForPlans(ids);
  await prisma.plan.updateMany({
    where: { id: { in: ids }, userId: user.id },
    data: { deletedAt: new Date(), projectTaskId: null },
  });
}

export async function restorePlan(id: string): Promise<Plan> {
  const user = await requireUser();
  const existing = await prisma.plan.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");
  const row = await prisma.plan.update({
    where: { id },
    data: { deletedAt: null },
  });
  return toPlan(row);
}

export async function purgePlan(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.plan.deleteMany({
    where: { id, userId: user.id },
  });
}

export async function purgeManyPlans(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const user = await requireUser();
  await prisma.plan.deleteMany({
    where: { id: { in: ids }, userId: user.id },
  });
}

/* ─── First-login importer ────────────────────────────────── */

/** Push a batch of localStorage plans to the user's DB account.
 *  Skips IDs that already exist for the user (idempotent). */
export async function importPlans(items: CreatePlanInput[]): Promise<{ imported: number }> {
  const user = await requireUser();
  if (items.length === 0) return { imported: 0 };

  // Identify which IDs already exist for this user (collision-safe import)
  const ids = items.map((i) => i.id).filter((x): x is string => !!x);
  const existing = ids.length
    ? await prisma.plan.findMany({
        where: { userId: user.id, id: { in: ids } },
        select: { id: true },
      })
    : [];
  const existingSet = new Set(existing.map((x) => x.id));

  const toInsert = items.filter((i) => !i.id || !existingSet.has(i.id));
  if (toInsert.length === 0) return { imported: 0 };

  const last = await prisma.plan.findFirst({
    where: { userId: user.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  let nextOrder = (last?.order ?? -1) + 1;

  await prisma.plan.createMany({
    data: toInsert.map((i) => ({
      id: i.id,
      userId: user.id,
      title: i.title.trim(),
      notes: i.notes,
      subtasks: (i.subtasks ?? undefined) as unknown as Prisma.InputJsonValue,
      scope: i.scope ?? "DAILY",
      status: "TODO",
      priority: i.priority,
      scheduledFor: i.scheduledFor,
      time: i.time,
      duration: i.duration,
      order: nextOrder++,
    })),
  });

  return { imported: toInsert.length };
}
