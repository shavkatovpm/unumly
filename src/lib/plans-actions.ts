"use server";

import type { Plan as DbPlan } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { computeNotifyAt, sanitizeLeadMin } from "@/lib/notify-time";
import { markReminderDone } from "@/lib/telegram-bot";
import type { Plan, PlanScope, PlanStatus, PlanPriority } from "@/lib/types";

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
    scope: p.scope as PlanScope,
    status: p.status as PlanStatus,
    priority: p.priority as PlanPriority | null ?? undefined,
    scheduledFor: p.scheduledFor,
    time: p.time ?? undefined,
    duration: p.duration ?? undefined,
    completedAt: p.completedAt ? p.completedAt.toISOString() : undefined,
    deletedAt: p.deletedAt ? p.deletedAt.toISOString() : undefined,
    createdAt: p.createdAt.toISOString(),
    order: p.order,
  };
}

/* ─── Auth helper ─────────────────────────────────────────── */

async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

/* ─── Read ────────────────────────────────────────────────── */

/** Returns all plans for the current user, with expired-trash purged. */
export async function listPlans(): Promise<Plan[]> {
  const user = await requireUser();

  // Auto-purge expired soft-deleted plans (older than 30 days)
  const cutoff = new Date(Date.now() - TRASH_TTL_MS);
  await prisma.plan.deleteMany({
    where: { userId: user.id, deletedAt: { lt: cutoff } },
  });

  const rows = await prisma.plan.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "asc" }],
  });
  return rows.map(toPlan);
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
  scope?: PlanScope;
  scheduledFor: string;     // YYYY-MM-DD
  time?: string;            // HH:MM
  duration?: number;
  priority?: PlanPriority;
};

/** Upsert by id — used by ideas-store to mirror a scheduled idea as a plan. */
export async function upsertPlan(input: CreatePlanInput & { id: string }): Promise<Plan> {
  const user = await requireUser();
  const existing = await prisma.plan.findFirst({
    where: { id: input.id, userId: user.id },
    select: { id: true, order: true },
  });
  if (existing) {
    const leadMin = await getUserLeadMin(user.id);
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
        notifyAt: computeNotifyAt(input.scheduledFor, input.time, leadMin),
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
  const [last, leadMin] = await Promise.all([
    prisma.plan.findFirst({
      where: { userId: user.id },
      orderBy: { order: "desc" },
      select: { order: true },
    }),
    getUserLeadMin(user.id),
  ]);
  const nextOrder = (last?.order ?? -1) + 1;

  const row = await prisma.plan.create({
    data: {
      id: input.id,
      userId: user.id,
      title: input.title.trim(),
      notes: input.notes,
      scope: input.scope ?? "DAILY",
      status: "TODO",
      priority: input.priority,
      scheduledFor: input.scheduledFor,
      time: input.time,
      duration: input.duration,
      order: nextOrder,
      notifyAt: computeNotifyAt(input.scheduledFor, input.time, leadMin),
    },
  });
  return toPlan(row);
}

export type UpdatePlanPatch = Partial<{
  title: string;
  notes: string | null;
  scope: PlanScope;
  status: PlanStatus;
  priority: PlanPriority | null;
  scheduledFor: string;
  time: string | null;
  duration: number | null;
  order: number;
  completedAt: string | null;
}>;

export async function updatePlan(id: string, patch: UpdatePlanPatch): Promise<Plan> {
  const user = await requireUser();
  const existing = await prisma.plan.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");

  // Recompute notifyAt when scheduledFor or time changes
  const nextScheduledFor = patch.scheduledFor ?? existing.scheduledFor;
  const nextTime = patch.time === undefined ? existing.time : patch.time;
  const reschedule =
    patch.scheduledFor !== undefined || patch.time !== undefined;
  const leadMin = reschedule ? await getUserLeadMin(user.id) : 0;

  const row = await prisma.plan.update({
    where: { id },
    data: {
      ...patch,
      completedAt:
        patch.completedAt === undefined
          ? undefined
          : patch.completedAt === null
          ? null
          : new Date(patch.completedAt),
      ...(reschedule && {
        notifyAt: computeNotifyAt(nextScheduledFor, nextTime, leadMin),
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

export async function removePlan(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.plan.updateMany({
    where: { id, userId: user.id },
    data: { deletedAt: new Date() },
  });
  // Silence any pending bot reminders for this plan
  await prisma.botMessage.deleteMany({ where: { planId: id } });
}

export async function removeManyPlans(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const user = await requireUser();
  await prisma.plan.updateMany({
    where: { id: { in: ids }, userId: user.id },
    data: { deletedAt: new Date() },
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
