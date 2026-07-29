import "server-only";

import { type ProjectTask as DbTask, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { McpNotFoundError, withMcpErrors } from "@/lib/mcp/errors";

/**
 * MCP qatlami — src/lib/project-tasks-actions.ts bilan bir xil mantiq
 * (jumladan syncTaskPlan — u yerda export qilinmagani uchun bu yerda
 * copy-adapt qilingan), lekin requireUser() o'rniga ownerUserId bilan.
 */

export type McpProjectTaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type McpProjectTaskRecord = {
  id: string;
  projectId: string;
  title: string;
  done: boolean;
  priority: McpProjectTaskPriority | null;
  dueDate: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
};

function toTaskRecord(t: DbTask): McpProjectTaskRecord {
  return {
    id: t.id,
    projectId: t.projectId,
    title: t.title,
    done: t.done,
    priority: t.priority as McpProjectTaskPriority | null,
    dueDate: t.dueDate,
    order: t.order,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

async function requireOwnProject(ownerUserId: string, projectId: string): Promise<void> {
  const p = await prisma.project.findFirst({ where: { id: projectId, userId: ownerUserId }, select: { id: true } });
  if (!p) throw new McpNotFoundError(`Loyiha topilmadi yoki sizga tegishli emas: ${projectId}`);
}

/** Muddati bor Jadval taskini Agenda/Bugun'da ko'rinishi uchun bog'langan
 *  Plan bilan sinxronlaydi — project-tasks-actions.ts:syncTaskPlan bilan
 *  bir xil qoida (u yerda private, export qilinmagan). */
async function syncTaskPlan(
  ownerUserId: string,
  task: {
    id: string;
    projectId: string;
    title: string;
    done: boolean;
    priority: McpProjectTaskPriority | null;
    dueDate: string | null;
  },
  existingPlanId: string | null,
  dueDateChanged: boolean
): Promise<void> {
  if (!task.dueDate) {
    if (existingPlanId) {
      await prisma.plan.delete({ where: { id: existingPlanId } }).catch(() => {});
    }
    return;
  }

  if (existingPlanId) {
    await prisma.plan.update({
      where: { id: existingPlanId },
      data: {
        title: task.title,
        priority: task.priority,
        status: task.done ? "DONE" : "TODO",
        completedAt: task.done ? new Date() : null,
        ...(dueDateChanged && { scheduledFor: task.dueDate }),
      },
    });
    return;
  }

  const last = await prisma.plan.findFirst({
    where: { userId: ownerUserId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await prisma.plan.create({
    data: {
      userId: ownerUserId,
      projectId: task.projectId,
      projectTaskId: task.id,
      title: task.title,
      scope: "DAILY",
      status: task.done ? "DONE" : "TODO",
      priority: task.priority,
      scheduledFor: task.dueDate,
      completedAt: task.done ? new Date() : null,
      order: (last?.order ?? -1) + 1,
    },
  });
}

/* ─── list_project_tasks ──────────────────────────────────── */

export type McpListProjectTasksFilter = {
  projectId: string;
  done?: boolean;
  limit?: number;
  offset?: number;
};

async function listProjectTasksImpl(ownerUserId: string, filter: McpListProjectTasksFilter) {
  await requireOwnProject(ownerUserId, filter.projectId);
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
  const offset = Math.max(filter.offset ?? 0, 0);

  const where: Prisma.ProjectTaskWhereInput = {
    projectId: filter.projectId,
    ...(filter.done !== undefined && { done: filter.done }),
  };

  const [rows, total] = await Promise.all([
    prisma.projectTask.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      take: limit,
      skip: offset,
    }),
    prisma.projectTask.count({ where }),
  ]);

  return {
    tasks: rows.map(toTaskRecord),
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
  };
}

export const mcpListProjectTasks = withMcpErrors(listProjectTasksImpl);

/* ─── create_project_task ─────────────────────────────────── */

export type McpCreateProjectTaskInput = {
  id?: string;
  projectId: string;
  title: string;
  priority?: McpProjectTaskPriority;
  dueDate?: string;
};

async function createProjectTaskImpl(
  ownerUserId: string,
  input: McpCreateProjectTaskInput
): Promise<{ task: McpProjectTaskRecord }> {
  await requireOwnProject(ownerUserId, input.projectId);

  const last = await prisma.projectTask.findFirst({
    where: { projectId: input.projectId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const row = await prisma.projectTask.create({
    data: {
      id: input.id,
      projectId: input.projectId,
      title: input.title.trim(),
      priority: input.priority,
      dueDate: input.dueDate,
      order: (last?.order ?? -1) + 1,
    },
  });

  if (row.dueDate) {
    await syncTaskPlan(
      ownerUserId,
      {
        id: row.id,
        projectId: row.projectId,
        title: row.title,
        done: false,
        priority: row.priority as McpProjectTaskPriority | null,
        dueDate: row.dueDate,
      },
      null,
      true
    );
  }

  return { task: toTaskRecord(row) };
}

export const mcpCreateProjectTask = withMcpErrors(createProjectTaskImpl);

/* ─── update_project_task ─────────────────────────────────── */

export type McpUpdateProjectTaskPatch = Partial<{
  title: string;
  done: boolean;
  priority: McpProjectTaskPriority | null;
  dueDate: string | null;
}>;

async function updateProjectTaskImpl(
  ownerUserId: string,
  id: string,
  patch: McpUpdateProjectTaskPatch
): Promise<{ task: McpProjectTaskRecord }> {
  const existing = await prisma.projectTask.findFirst({
    where: { id, project: { userId: ownerUserId } },
    include: { plan: { select: { id: true } } },
  });
  if (!existing) throw new McpNotFoundError(`Jadval taski topilmadi yoki sizga tegishli emas: ${id}`);

  const row = await prisma.projectTask.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.done !== undefined && { done: patch.done }),
      ...(patch.priority !== undefined && { priority: patch.priority }),
      ...(patch.dueDate !== undefined && { dueDate: patch.dueDate }),
    },
  });

  if (patch.title !== undefined || patch.done !== undefined || patch.priority !== undefined || patch.dueDate !== undefined) {
    await syncTaskPlan(
      ownerUserId,
      {
        id: row.id,
        projectId: row.projectId,
        title: row.title,
        done: row.done,
        priority: row.priority as McpProjectTaskPriority | null,
        dueDate: row.dueDate,
      },
      existing.plan?.id ?? null,
      patch.dueDate !== undefined
    );
  }

  return { task: toTaskRecord(row) };
}

export const mcpUpdateProjectTask = withMcpErrors(updateProjectTaskImpl);

/* ─── delete_project_task ─────────────────────────────────── */
// Bog'langan Plan (bo'lsa) ni Prisma schema darajasidagi ON DELETE CASCADE
// avtomatik o'chiradi (Plan.projectTaskId → onDelete: Cascade) — alohida
// so'rov shart emas, lekin javobda aniq aytiladi.

async function deleteProjectTaskImpl(
  ownerUserId: string,
  id: string
): Promise<{ id: string; title: string; linkedPlanDeleted: boolean }> {
  const existing = await prisma.projectTask.findFirst({
    where: { id, project: { userId: ownerUserId } },
    include: { plan: { select: { id: true } } },
  });
  if (!existing) throw new McpNotFoundError(`Jadval taski topilmadi yoki sizga tegishli emas: ${id}`);

  await prisma.projectTask.deleteMany({ where: { id, project: { userId: ownerUserId } } });

  return { id: existing.id, title: existing.title, linkedPlanDeleted: !!existing.plan };
}

export const mcpDeleteProjectTask = withMcpErrors(deleteProjectTaskImpl);
