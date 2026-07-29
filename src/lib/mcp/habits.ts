import "server-only";

import type { Habit as DbHabit } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { computeNotifyAt, sanitizeLeadMin } from "@/lib/notify-time";
import { McpNotFoundError, withMcpErrors } from "@/lib/mcp/errors";

/**
 * MCP qatlami — src/lib/habits-actions.ts bilan bir xil mantiq (jumladan
 * `days`/`time` o'zgarganda kelajakdagi occurrence'larni qayta hisoblash
 * side effect'i), lekin requireUser() o'rniga ownerUserId bilan.
 */

export type McpHabitRecord = {
  id: string;
  title: string;
  categoryId: string | null;
  categoryLabel: string | null;
  days: number[];
  time: string | null;
  notifyLeadMin: number | null;
  order: number;
  archivedAt: string | null;
  showInAgenda: boolean;
  currentStreak: number;
};

async function getUserLeadMin(ownerUserId: string): Promise<number> {
  const u = await prisma.user.findUnique({ where: { id: ownerUserId }, select: { notifyLeadMin: true } });
  return sanitizeLeadMin(u?.notifyLeadMin);
}

function weekdayOf(dateIso: string): number {
  return new Date(`${dateIso}T00:00:00Z`).getUTCDay();
}

/** Bugungi sana Asia/Tashkent bo'yicha (UTC+5, DST yo'q). */
function tashkentToday(): string {
  return new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDaysIso(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const STREAK_LOOKBACK_DAYS = 400;

/** Bugundan orqaga qarab, habit.days bo'yicha rejalashtirilgan har bir kun
 *  uchun DONE occurrence bormi tekshiradi — birinchi "yo'q" uchraganda
 *  to'xtaydi. Rejalashtirilmagan kunlar streak'ni uzmaydi. */
function computeStreak(days: number[], doneDates: Set<string>): number {
  if (days.length === 0) return 0;
  let streak = 0;
  let cursor = tashkentToday();
  for (let i = 0; i < STREAK_LOOKBACK_DAYS; i++) {
    if (days.includes(weekdayOf(cursor))) {
      if (doneDates.has(cursor)) {
        streak++;
      } else {
        break;
      }
    }
    cursor = addDaysIso(cursor, -1);
  }
  return streak;
}

/* ─── list_habits (+ streak, kategoriya nomi) ─────────────── */

async function listHabitsImpl(ownerUserId: string): Promise<{ habits: McpHabitRecord[] }> {
  const habits = await prisma.habit.findMany({
    where: { userId: ownerUserId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  if (habits.length === 0) return { habits: [] };

  const cutoff = addDaysIso(tashkentToday(), -STREAK_LOOKBACK_DAYS);
  const [donePlans, categories] = await Promise.all([
    prisma.plan.findMany({
      where: {
        userId: ownerUserId,
        habitId: { in: habits.map((h) => h.id) },
        status: "DONE",
        scheduledFor: { gte: cutoff },
      },
      select: { habitId: true, scheduledFor: true },
    }),
    prisma.habitCategory.findMany({
      where: { userId: ownerUserId, id: { in: habits.map((h) => h.categoryId).filter((x): x is string => !!x) } },
      select: { id: true, label: true },
    }),
  ]);

  const doneByHabit = new Map<string, Set<string>>();
  for (const p of donePlans) {
    if (!p.habitId) continue;
    const set = doneByHabit.get(p.habitId) ?? new Set<string>();
    set.add(p.scheduledFor);
    doneByHabit.set(p.habitId, set);
  }
  const categoryLabel = new Map(categories.map((c) => [c.id, c.label]));

  return {
    habits: habits.map((h) => ({
      id: h.id,
      title: h.title,
      categoryId: h.categoryId,
      categoryLabel: h.categoryId ? categoryLabel.get(h.categoryId) ?? null : null,
      days: h.days,
      time: h.time,
      notifyLeadMin: h.notifyLeadMin,
      order: h.order,
      archivedAt: h.archivedAt ? h.archivedAt.toISOString() : null,
      showInAgenda: h.showInAgenda,
      currentStreak: computeStreak(h.days, doneByHabit.get(h.id) ?? new Set()),
    })),
  };
}

export const mcpListHabits = withMcpErrors(listHabitsImpl);

/* ─── create_habit ─────────────────────────────────────────── */

export type McpCreateHabitInput = {
  id?: string;
  title: string;
  categoryId?: string | null;
  days: number[];
  time?: string;
  notifyLeadMin?: number;
  showInAgenda?: boolean;
};

async function requireOwnHabitCategory(ownerUserId: string, categoryId: string): Promise<void> {
  const c = await prisma.habitCategory.findFirst({ where: { id: categoryId, userId: ownerUserId }, select: { id: true } });
  if (!c) throw new McpNotFoundError(`Odat kategoriyasi topilmadi yoki sizga tegishli emas: ${categoryId}`);
}

async function createHabitImpl(ownerUserId: string, input: McpCreateHabitInput): Promise<{ habit: DbHabit }> {
  if (input.categoryId) await requireOwnHabitCategory(ownerUserId, input.categoryId);

  const last = await prisma.habit.findFirst({ where: { userId: ownerUserId }, orderBy: { order: "desc" }, select: { order: true } });
  const row = await prisma.habit.create({
    data: {
      id: input.id,
      userId: ownerUserId,
      title: input.title.trim(),
      categoryId: input.categoryId ?? null,
      days: input.days,
      time: input.time,
      notifyLeadMin: input.notifyLeadMin,
      order: (last?.order ?? -1) + 1,
      showInAgenda: input.showInAgenda ?? true,
    },
  });
  return { habit: row };
}

export const mcpCreateHabit = withMcpErrors(createHabitImpl);

/* ─── update_habit ────────────────────────────────────────── */
// days/time o'zgarsa kelajakdagi (bugundan boshlab), hali TODO bo'lgan
// occurrence'lar qayta hisoblanadi — habits-actions.ts:updateHabit bilan
// bir xil qoida.

export type McpUpdateHabitPatch = Partial<{
  title: string;
  categoryId: string | null;
  days: number[];
  time: string | null;
  notifyLeadMin: number | null;
  showInAgenda: boolean;
  archivedAt: string | null;
}>;

async function updateHabitImpl(ownerUserId: string, id: string, patch: McpUpdateHabitPatch): Promise<{ habit: DbHabit }> {
  const existing = await prisma.habit.findFirst({ where: { id, userId: ownerUserId } });
  if (!existing) throw new McpNotFoundError(`Odat topilmadi yoki sizga tegishli emas: ${id}`);
  if (patch.categoryId) await requireOwnHabitCategory(ownerUserId, patch.categoryId);

  const row = await prisma.habit.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
      ...(patch.days !== undefined && { days: patch.days }),
      ...(patch.time !== undefined && { time: patch.time }),
      ...(patch.notifyLeadMin !== undefined && { notifyLeadMin: patch.notifyLeadMin }),
      ...(patch.showInAgenda !== undefined && { showInAgenda: patch.showInAgenda }),
      ...(patch.archivedAt !== undefined && { archivedAt: patch.archivedAt ? new Date(patch.archivedAt) : null }),
    },
  });

  const today = tashkentToday();

  if (patch.days !== undefined) {
    const future = await prisma.plan.findMany({
      where: { habitId: id, userId: ownerUserId, status: "TODO", scheduledFor: { gte: today } },
      select: { id: true, scheduledFor: true },
    });
    const stale = future.filter((p) => !row.days.includes(weekdayOf(p.scheduledFor))).map((p) => p.id);
    if (stale.length) {
      await prisma.plan.deleteMany({ where: { id: { in: stale } } });
      await prisma.botMessage.deleteMany({ where: { planId: { in: stale } } });
    }
  }

  if (patch.time !== undefined) {
    const lead = row.notifyLeadMin != null ? sanitizeLeadMin(row.notifyLeadMin) : await getUserLeadMin(ownerUserId);
    const future = await prisma.plan.findMany({
      where: { habitId: id, userId: ownerUserId, status: "TODO", scheduledFor: { gte: today } },
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

  return { habit: row };
}

export const mcpUpdateHabit = withMcpErrors(updateHabitImpl);

/* ─── delete_habit ────────────────────────────────────────── */
// ON DELETE CASCADE orqali barcha occurrence Plan'lar (tarix ham) o'chadi.

async function deleteHabitImpl(ownerUserId: string, id: string): Promise<{ id: string; title: string }> {
  const existing = await prisma.habit.findFirst({ where: { id, userId: ownerUserId } });
  if (!existing) throw new McpNotFoundError(`Odat topilmadi yoki sizga tegishli emas: ${id}`);
  await prisma.habit.deleteMany({ where: { id, userId: ownerUserId } });
  return { id: existing.id, title: existing.title };
}

export const mcpDeleteHabit = withMcpErrors(deleteHabitImpl);

/* ─── log_habit ───────────────────────────────────────────── */
// Berilgan kun (default bugun) uchun occurrence'ni DONE deb belgilaydi:
// occurrence mavjud bo'lsa — holatini DONE'ga o'tkazadi (idempotent, allaqachon
// DONE bo'lsa hech narsa qilmaydi); mavjud bo'lmasa (masalan o'tgan kun uchun
// orqaga to'ldirish) — habits-actions.ts:markHabitDay bilan bir xil, DONE
// holatida yangi occurrence yaratadi.

async function logHabitImpl(ownerUserId: string, habitId: string, date?: string): Promise<{ scheduledFor: string; status: "DONE"; created: boolean }> {
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId: ownerUserId } });
  if (!habit) throw new McpNotFoundError(`Odat topilmadi yoki sizga tegishli emas: ${habitId}`);
  const targetDate = date ?? tashkentToday();

  const existing = await prisma.plan.findFirst({ where: { habitId, scheduledFor: targetDate, userId: ownerUserId } });
  if (existing) {
    if (existing.status !== "DONE") {
      await prisma.plan.update({ where: { id: existing.id }, data: { status: "DONE", completedAt: new Date() } });
    }
    return { scheduledFor: targetDate, status: "DONE", created: false };
  }

  await prisma.plan.create({
    data: {
      userId: ownerUserId,
      title: habit.title,
      scope: "DAILY",
      status: "DONE",
      scheduledFor: targetDate,
      time: habit.time,
      notifyLeadMin: habit.notifyLeadMin,
      notifyAt: null,
      habitId,
      order: 0,
      completedAt: new Date(),
    },
  });
  return { scheduledFor: targetDate, status: "DONE", created: true };
}

export const mcpLogHabit = withMcpErrors(logHabitImpl);

/* ─── delete_habit_category ───────────────────────────────── */
// habit-categories-actions.ts:removeHabitCategory bilan bir xil: odatlar
// O'CHIRILMAYDI — kategoriyasi shu id bo'lganlar avval categoryId=null'ga
// o'tkaziladi (kategoriyasiz holatga qaytadi), so'ng kategoriyaning o'zi
// o'chadi. DIQQAT: standart (tizim) kategoriyalar himoyasi bu yerda YO'Q —
// Category'dan farqli o'laroq, HabitCategory default qatorlari ham tasodifiy
// cuid bilan yaratiladi (habit-categories-actions.ts:DEFAULTS'da id
// belgilanmagan), shuning uchun ularni "standart" deb aniqlab bo'lmaydi —
// app'ning o'zida ham bu himoya yo'q.

async function deleteHabitCategoryImpl(
  ownerUserId: string,
  id: string
): Promise<{ id: string; label: string; detachedHabitsCount: number }> {
  const existing = await prisma.habitCategory.findFirst({ where: { id, userId: ownerUserId } });
  if (!existing) throw new McpNotFoundError(`Odat kategoriyasi topilmadi yoki sizga tegishli emas: ${id}`);

  const { count } = await prisma.habit.updateMany({
    where: { categoryId: id, userId: ownerUserId },
    data: { categoryId: null },
  });
  await prisma.habitCategory.deleteMany({ where: { id, userId: ownerUserId } });

  return { id: existing.id, label: existing.label, detachedHabitsCount: count };
}

export const mcpDeleteHabitCategory = withMcpErrors(deleteHabitCategoryImpl);
