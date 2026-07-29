import "server-only";

import { Prisma, type Plan as DbPlan } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { effectiveStatus } from "@/lib/plan-status";
import { computeNotifyAt, sanitizeLeadMin } from "@/lib/notify-time";
import { McpNotFoundError, withMcpErrors } from "@/lib/mcp/errors";

/**
 * MCP write/read qatlami — src/lib/plans-actions.ts'dagi createPlan/updatePlan
 * bilan bir xil mantiq (order hisoblash, computeNotifyAt, projectTaskId sync),
 * lekin requireUser()/getSessionUser() (cookies()ga bog'liq) o'rniga har bir
 * so'rovda majburiy ownerUserId parametri bilan ishlaydi — asl fayl
 * o'zgartirilmaydi, shuning uchun copy-adapt qilingan. Pure hisoblash
 * funksiyalari (computeNotifyAt, sanitizeLeadMin) asl joyidan import qilinadi.
 */

export type McpPlanPriority = "LOW" | "MEDIUM" | "HIGH";
export type McpPlanScope = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type McpPlanStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "DONE"
  | "MISSED"
  | "CANCELLED"
  | "ARCHIVED";

export type McpPlanRecord = {
  id: string;
  title: string;
  notes: string | null;
  status: McpPlanStatus;
  /** Sanaga qarab hisoblangan holat: muddati o'tgan bo'lsa MISSED/ARCHIVED.
   *  `status` esa DB'dagi xom qiymat (odatda TODO bo'lib qolaveradi). */
  effectiveStatus: McpPlanStatus;
  deferCount: number;
  priority: McpPlanPriority | null;
  scope: McpPlanScope;
  scheduledFor: string;
  time: string | null;
  duration: number | null;
  notifyLeadMin: number | null;
  notifyAt: string | null;
  notifiedAt: string | null;
  completedAt: string | null;
  projectId: string | null;
  projectTaskId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
};

function toPlanRecord(p: DbPlan): McpPlanRecord {
  return {
    id: p.id,
    title: p.title,
    notes: p.notes,
    status: p.status as McpPlanStatus,
    effectiveStatus: effectiveStatus(p) as McpPlanStatus,
    deferCount: p.deferCount,
    priority: p.priority as McpPlanPriority | null,
    scope: p.scope as McpPlanScope,
    scheduledFor: p.scheduledFor,
    time: p.time,
    duration: p.duration,
    notifyLeadMin: p.notifyLeadMin,
    notifyAt: p.notifyAt ? p.notifyAt.toISOString() : null,
    notifiedAt: p.notifiedAt ? p.notifiedAt.toISOString() : null,
    completedAt: p.completedAt ? p.completedAt.toISOString() : null,
    projectId: p.projectId,
    projectTaskId: p.projectTaskId,
    order: p.order,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function getUserLeadMin(ownerUserId: string): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { id: ownerUserId },
    select: { notifyLeadMin: true },
  });
  return sanitizeLeadMin(u?.notifyLeadMin);
}

function isPastNotifyAt(notifyAt: Date | null): boolean {
  return !!notifyAt && notifyAt.getTime() < Date.now();
}

const NOTIFY_AT_PAST_WARNING = "notifyAt o'tmishda — eslatma yuborilmaydi";

/* ─── create_task ─────────────────────────────────────────── */

export type McpCreateTaskInput = {
  title: string;
  scheduledFor: string;
  time?: string;
  duration?: number;
  notes?: string;
  priority?: McpPlanPriority;
  scope?: McpPlanScope;
  notifyLeadMin?: number;
  projectId?: string;
};

async function createTaskImpl(
  ownerUserId: string,
  input: McpCreateTaskInput
): Promise<{ plan: McpPlanRecord; warning?: string }> {
  const effectiveLead =
    input.notifyLeadMin !== undefined ? sanitizeLeadMin(input.notifyLeadMin) : await getUserLeadMin(ownerUserId);
  const notifyAt = computeNotifyAt(input.scheduledFor, input.time, effectiveLead);

  // Loyihaga tegishlilik tekshiruvi + yaratish — bitta interactive
  // $transaction ichida, shunda project egasi bo'lmasa hech qanday Plan
  // yaratilmay qoladi (yarim holat yo'q).
  const row = await prisma.$transaction(async (tx) => {
    if (input.projectId) {
      const project = await tx.project.findFirst({
        where: { id: input.projectId, userId: ownerUserId },
        select: { id: true },
      });
      if (!project) {
        throw new McpNotFoundError(`Loyiha topilmadi yoki sizga tegishli emas: ${input.projectId}`);
      }
    }
    const last = await tx.plan.findFirst({
      where: { userId: ownerUserId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    return tx.plan.create({
      data: {
        userId: ownerUserId,
        title: input.title.trim(),
        notes: input.notes,
        scope: input.scope ?? "DAILY",
        status: "TODO",
        priority: input.priority,
        scheduledFor: input.scheduledFor,
        time: input.time,
        duration: input.duration,
        notifyLeadMin: input.notifyLeadMin ?? null,
        order: (last?.order ?? -1) + 1,
        notifyAt,
        projectId: input.projectId ?? null,
      },
    });
  });

  return {
    plan: toPlanRecord(row),
    warning: isPastNotifyAt(notifyAt) ? NOTIFY_AT_PAST_WARNING : undefined,
  };
}

export const mcpCreateTask = withMcpErrors(createTaskImpl);

/* ─── update_task ─────────────────────────────────────────── */

export type McpUpdateTaskPatch = Partial<{
  title: string;
  notes: string | null;
  status: McpPlanStatus;
  priority: McpPlanPriority | null;
  scheduledFor: string;
  time: string | null;
  duration: number | null;
  notifyLeadMin: number | null;
}>;

async function updateTaskImpl(
  ownerUserId: string,
  id: string,
  patch: McpUpdateTaskPatch
): Promise<{ plan: McpPlanRecord; warning?: string }> {
  const existing = await prisma.plan.findFirst({ where: { id, userId: ownerUserId } });
  if (!existing) {
    throw new McpNotFoundError(`Task topilmadi yoki sizga tegishli emas: ${id}`);
  }

  // Jadval (ProjectTask)dan avtomatik yaratilgan Plan bo'lsa — sarlavha,
  // muhimlik va sana o'zgarishlari orqaga, o'sha taskka ham ko'chiriladi
  // (plans-actions.ts:updatePlan bilan bir xil qoida — v2'da create_project_task
  // tool'i qo'shilganda ham shu sinxronizatsiya ishlatiladi).
  if (
    existing.projectTaskId &&
    (patch.title !== undefined || patch.priority !== undefined || patch.scheduledFor !== undefined)
  ) {
    await prisma.projectTask
      .update({
        where: { id: existing.projectTaskId },
        data: {
          ...(patch.title !== undefined && { title: patch.title.trim() }),
          ...(patch.priority !== undefined && { priority: patch.priority }),
          ...(patch.scheduledFor !== undefined && { dueDate: patch.scheduledFor }),
        },
      })
      .catch(() => {});
  }

  const nextScheduledFor = patch.scheduledFor ?? existing.scheduledFor;
  const nextTime = patch.time === undefined ? existing.time : patch.time;
  const nextLeadOverride = patch.notifyLeadMin === undefined ? existing.notifyLeadMin : patch.notifyLeadMin;
  const reschedule =
    patch.scheduledFor !== undefined || patch.time !== undefined || patch.notifyLeadMin !== undefined;

  let notifyAt: Date | null = existing.notifyAt;
  if (reschedule) {
    const effectiveLead =
      nextLeadOverride != null ? sanitizeLeadMin(nextLeadOverride) : await getUserLeadMin(ownerUserId);
    notifyAt = computeNotifyAt(nextScheduledFor, nextTime, effectiveLead);
  }

  const statusChanging = patch.status !== undefined && patch.status !== existing.status;

  const row = await prisma.plan.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.notes !== undefined && { notes: patch.notes }),
      ...(patch.priority !== undefined && { priority: patch.priority }),
      ...(patch.scheduledFor !== undefined && { scheduledFor: patch.scheduledFor }),
      ...(patch.time !== undefined && { time: patch.time }),
      ...(patch.duration !== undefined && { duration: patch.duration }),
      ...(patch.notifyLeadMin !== undefined && { notifyLeadMin: patch.notifyLeadMin }),
      ...(patch.status !== undefined && {
        status: patch.status,
        ...(statusChanging && { completedAt: patch.status === "DONE" ? new Date() : null }),
      }),
      ...(reschedule && { notifyAt, notifiedAt: null }),
    },
  });

  return {
    plan: toPlanRecord(row),
    warning: isPastNotifyAt(row.notifyAt) ? NOTIFY_AT_PAST_WARNING : undefined,
  };
}

export const mcpUpdateTask = withMcpErrors(updateTaskImpl);

/* ─── list_tasks ──────────────────────────────────────────── */

export type McpListTasksFilter = {
  projectId?: string | null;
  status?: McpPlanStatus;
  priority?: McpPlanPriority;
  scope?: McpPlanScope;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

async function listTasksImpl(ownerUserId: string, filter: McpListTasksFilter) {
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
  const offset = Math.max(filter.offset ?? 0, 0);

  const where: Prisma.PlanWhereInput = {
    userId: ownerUserId,
    deletedAt: null,
    ...(filter.projectId !== undefined && { projectId: filter.projectId }),
    // status aniq berilmasa ARCHIVED va CANCELLED default'da chiqmaydi
    // (app'dagi Bugun/Agenda filtri bilan bir xil) — faqat aniq so'ralganda
    // ko'rinadi.
    status: filter.status ? filter.status : { notIn: ["ARCHIVED", "CANCELLED"] },
    ...(filter.priority && { priority: filter.priority }),
    ...(filter.scope && { scope: filter.scope }),
    ...((filter.from || filter.to) && {
      scheduledFor: {
        ...(filter.from && { gte: filter.from }),
        ...(filter.to && { lte: filter.to }),
      },
    }),
  };

  const [rows, total] = await Promise.all([
    prisma.plan.findMany({
      where,
      orderBy: [{ scheduledFor: "asc" }, { order: "asc" }],
      take: limit,
      skip: offset,
    }),
    prisma.plan.count({ where }),
  ]);

  return {
    tasks: rows.map(toPlanRecord),
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
  };
}

export const mcpListTasks = withMcpErrors(listTasksImpl);

/* ─── get_agenda ──────────────────────────────────────────── */

/** Bugungi sana Asia/Tashkent bo'yicha (UTC+5, DST yo'q) — notify-time.ts
 *  bilan bir xil taxmin. */
function tashkentToday(): string {
  return new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type McpGetAgendaInput = { from?: string; to?: string; status?: McpPlanStatus };

async function getAgendaImpl(ownerUserId: string, input: McpGetAgendaInput) {
  const from = input.from ?? tashkentToday();
  const to = input.to ?? addDays(from, 7);

  const rows = await prisma.plan.findMany({
    where: {
      userId: ownerUserId,
      deletedAt: null,
      // status aniq berilmasa ARCHIVED va CANCELLED default'da chiqmaydi —
      // list_tasks bilan bir xil qoida (app'dagi Bugun/Agenda ko'rinishiga mos).
      status: input.status ? input.status : { notIn: ["ARCHIVED", "CANCELLED"] },
      scheduledFor: { gte: from, lte: to },
    },
    orderBy: [{ scheduledFor: "asc" }, { time: "asc" }],
  });

  return { from, to, tasks: rows.map(toPlanRecord) };
}

export const mcpGetAgenda = withMcpErrors(getAgendaImpl);

/* ─── get_plans (summary) ─────────────────────────────────── */

async function getPlansSummaryImpl(ownerUserId: string) {
  const grouped = await prisma.plan.groupBy({
    by: ["projectId", "status"],
    where: { userId: ownerUserId, deletedAt: null },
    _count: { _all: true },
  });

  const personal: Record<string, number> = {};
  const byProject: Record<string, Record<string, number>> = {};

  for (const g of grouped) {
    const bucket = g.projectId ? (byProject[g.projectId] ??= {}) : personal;
    bucket[g.status] = g._count._all;
  }

  return { personal, projects: byProject };
}

export const mcpGetPlansSummary = withMcpErrors(getPlansSummaryImpl);

/* ─── delete_task ─────────────────────────────────────────── */
// plans-actions.ts:removePlan bilan bir xil — soft-delete (deletedAt, 30
// kunlik trash orqali tozalanadi), hard delete emas. Agar bu Plan Jadval
// (ProjectTask)dan mirror qilingan bo'lsa, bog'lanish uziladi va o'sha
// taskning dueDate'i tozalanadi (task o'zi o'chirilmaydi — Jadval'da
// sanasiz holatga qaytadi, app'dagi xatti-harakat bilan bir xil). Agar bu
// Plan bir shaxsiy G'oya (Idea)dan mirror qilingan bo'lsa, G'oyaning o'ziga
// tegilmaydi (app'da ham shunday — faqat done-toggle orqaga sinxronlanadi,
// o'chirish emas; g'oya keyingi tahrirlanganda mirror qayta paydo bo'lishi
// mumkin).

async function deleteTaskImpl(
  ownerUserId: string,
  id: string
): Promise<{ id: string; title: string; unlinkedProjectTaskId: string | null }> {
  const existing = await prisma.plan.findFirst({ where: { id, userId: ownerUserId, deletedAt: null } });
  if (!existing) throw new McpNotFoundError(`Task topilmadi yoki sizga tegishli emas: ${id}`);

  let unlinkedProjectTaskId: string | null = null;
  if (existing.projectTaskId) {
    await prisma.projectTask.update({ where: { id: existing.projectTaskId }, data: { dueDate: null } }).catch(() => {});
    unlinkedProjectTaskId = existing.projectTaskId;
  }

  await prisma.plan.update({ where: { id }, data: { deletedAt: new Date(), projectTaskId: null } });
  await prisma.botMessage.deleteMany({ where: { planId: id } });

  return { id: existing.id, title: existing.title, unlinkedProjectTaskId };
}

export const mcpDeleteTask = withMcpErrors(deleteTaskImpl);
