"use server";

import type { Habit as DbHabit } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { computeNotifyAt, sanitizeLeadMin } from "@/lib/notify-time";
import type { Habit } from "@/lib/types";

function toHabit(h: DbHabit): Habit {
  return {
    id: h.id,
    title: h.title,
    categoryId: h.categoryId ?? null,
    days: h.days,
    time: h.time ?? undefined,
    notifyLeadMin: h.notifyLeadMin ?? undefined,
    order: h.order,
    archivedAt: h.archivedAt ? h.archivedAt.toISOString() : undefined,
    showInAgenda: h.showInAgenda,
  };
}

async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

async function getUserLeadMin(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { notifyLeadMin: true } });
  return sanitizeLeadMin(u?.notifyLeadMin);
}

/** Weekday (0=Sun..6=Sat) of a YYYY-MM-DD calendar date, tz-independent. */
function weekdayOf(dateIso: string): number {
  return new Date(`${dateIso}T00:00:00Z`).getUTCDay();
}
function serverToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ─── Read ─── */

export async function listHabits(): Promise<Habit[]> {
  const user = await requireUser();
  const rows = await prisma.habit.findMany({
    where: { userId: user.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toHabit);
}

/* ─── Create / update / delete ─── */

export type CreateHabitInput = {
  id?: string;
  title: string;
  categoryId: string | null;
  days: number[];
  time?: string;
  notifyLeadMin?: number;
  showInAgenda?: boolean;
};

export async function createHabit(input: CreateHabitInput): Promise<Habit> {
  const user = await requireUser();
  const last = await prisma.habit.findFirst({ where: { userId: user.id }, orderBy: { order: "desc" }, select: { order: true } });
  const row = await prisma.habit.create({
    data: {
      id: input.id,
      userId: user.id,
      title: input.title.trim(),
      categoryId: input.categoryId,
      days: input.days,
      time: input.time,
      notifyLeadMin: input.notifyLeadMin,
      order: (last?.order ?? -1) + 1,
      showInAgenda: input.showInAgenda ?? true,
    },
  });
  return toHabit(row);
}

export type UpdateHabitPatch = Partial<{
  title: string;
  categoryId: string | null;
  days: number[];
  time: string | null;
  notifyLeadMin: number | null;
  order: number;
  archivedAt: string | null;
  showInAgenda: boolean;
}>;

export async function updateHabit(id: string, patch: UpdateHabitPatch): Promise<Habit> {
  const user = await requireUser();
  const existing = await prisma.habit.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");

  const row = await prisma.habit.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
      ...(patch.days !== undefined && { days: patch.days }),
      ...(patch.time !== undefined && { time: patch.time }),
      ...(patch.notifyLeadMin !== undefined && { notifyLeadMin: patch.notifyLeadMin }),
      ...(patch.order !== undefined && { order: patch.order }),
      ...(patch.archivedAt !== undefined && { archivedAt: patch.archivedAt ? new Date(patch.archivedAt) : null }),
      ...(patch.showInAgenda !== undefined && { showInAgenda: patch.showInAgenda }),
    },
  });

  const today = serverToday();

  // Schedule changed → drop future, not-yet-done occurrences that no longer fit.
  if (patch.days !== undefined) {
    const future = await prisma.plan.findMany({
      where: { habitId: id, userId: user.id, status: "TODO", scheduledFor: { gte: today } },
      select: { id: true, scheduledFor: true },
    });
    const stale = future.filter((p) => !row.days.includes(weekdayOf(p.scheduledFor))).map((p) => p.id);
    if (stale.length) {
      await prisma.plan.deleteMany({ where: { id: { in: stale } } });
      await prisma.botMessage.deleteMany({ where: { planId: { in: stale } } });
    }
  }

  // Time changed → re-time future, not-yet-done occurrences (recompute reminder).
  if (patch.time !== undefined) {
    const lead = row.notifyLeadMin != null ? sanitizeLeadMin(row.notifyLeadMin) : await getUserLeadMin(user.id);
    const future = await prisma.plan.findMany({
      where: { habitId: id, userId: user.id, status: "TODO", scheduledFor: { gte: today } },
      select: { id: true, scheduledFor: true },
    });
    await Promise.all(
      future.map((p) =>
        prisma.plan.update({
          where: { id: p.id },
          data: { time: row.time, notifyAt: computeNotifyAt(p.scheduledFor, row.time, lead), notifiedAt: null },
        })
      )
    );
  }

  return toHabit(row);
}

export async function archiveHabit(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.habit.updateMany({ where: { id, userId: user.id }, data: { archivedAt: new Date() } });
  // Remove upcoming, not-yet-done occurrences so the habit stops appearing.
  const today = serverToday();
  const future = await prisma.plan.findMany({
    where: { habitId: id, userId: user.id, status: "TODO", scheduledFor: { gte: today } },
    select: { id: true },
  });
  const ids = future.map((p) => p.id);
  if (ids.length) {
    await prisma.plan.deleteMany({ where: { id: { in: ids } } });
    await prisma.botMessage.deleteMany({ where: { planId: { in: ids } } });
  }
}

export async function removeHabit(id: string): Promise<void> {
  const user = await requireUser();
  // FK ON DELETE CASCADE removes all occurrence plans (incl. history).
  await prisma.habit.deleteMany({ where: { id, userId: user.id } });
}

/* Belgilash — o'sha kun occurrence'i bo'lmasa (oyna tashqarisidagi o'tgan kun),
 * uni bajarilgan holatda yaratadi (orqaga to'ldirish). Occurrence mavjud
 * bo'lsa — mijoz tomoni togglePlanStatus orqali almashtiradi. */
export async function markHabitDay(habitId: string, date: string): Promise<void> {
  const user = await requireUser();
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId: user.id } });
  if (!habit) return;
  const existing = await prisma.plan.findFirst({ where: { habitId, scheduledFor: date, userId: user.id }, select: { id: true } });
  if (existing) return;
  await prisma.plan.create({
    data: {
      userId: user.id, title: habit.title, scope: "DAILY", status: "DONE",
      scheduledFor: date, time: habit.time, notifyLeadMin: habit.notifyLeadMin,
      notifyAt: null, habitId, order: 0, completedAt: new Date(),
    },
  });
}

/* ─── Occurrence generation (rolling 1-week window) ─────────────────
 * `dates` is the window (YYYY-MM-DD) computed client-side so it matches the
 * user's local calendar. Idempotent: the unique (habitId, scheduledFor)
 * constraint + skipDuplicates means we never duplicate or overwrite an
 * existing occurrence (so per-day time edits are preserved). */
export async function syncHabitOccurrences(dates: string[]): Promise<{ created: number }> {
  const user = await requireUser();
  if (dates.length === 0) return { created: 0 };

  const [habits, userLead] = await Promise.all([
    prisma.habit.findMany({ where: { userId: user.id, archivedAt: null } }),
    getUserLeadMin(user.id),
  ]);
  if (habits.length === 0) return { created: 0 };

  const data: Array<{
    userId: string; title: string; scope: "DAILY"; status: "TODO"; scheduledFor: string;
    time: string | null; notifyLeadMin: number | null; notifyAt: Date | null; habitId: string; order: number;
  }> = [];

  for (const h of habits) {
    const lead = h.notifyLeadMin != null ? sanitizeLeadMin(h.notifyLeadMin) : userLead;
    for (const date of dates) {
      if (!h.days.includes(weekdayOf(date))) continue;
      data.push({
        userId: user.id,
        title: h.title,
        scope: "DAILY",
        status: "TODO",
        scheduledFor: date,
        time: h.time ?? null,
        notifyLeadMin: h.notifyLeadMin ?? null,
        notifyAt: computeNotifyAt(date, h.time ?? undefined, lead),
        habitId: h.id,
        order: 0,
      });
    }
  }
  if (data.length === 0) return { created: 0 };

  const res = await prisma.plan.createMany({ data, skipDuplicates: true });
  return { created: res.count };
}
