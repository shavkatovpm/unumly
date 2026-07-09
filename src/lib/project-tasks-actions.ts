"use server";

import type { ProjectTask as DbTask } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { PlanPriority, ProjectTask } from "@/lib/types";

async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

async function requireOwnProject(userId: string, projectId: string) {
  const p = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
  if (!p) throw new Error("NOT_FOUND");
}

function toTask(t: DbTask): ProjectTask {
  return {
    id: t.id,
    projectId: t.projectId,
    title: t.title,
    done: t.done,
    priority: (t.priority as PlanPriority | null) ?? undefined,
    dueDate: t.dueDate ?? undefined,
    order: t.order,
    createdAt: t.createdAt.toISOString(),
  };
}

/** Muddati bor Jadval taskini Agenda/Bugun'da ko'rinishi uchun bog'langan
 *  Plan (scope=DAILY, projectId=shu loyiha) bilan sinxronlaydi:
 *  - `dueDate` yo'q bo'lsa (yoki tozalangan bo'lsa) — bog'langan Plan (bo'lsa)
 *    butunlay o'chiriladi (Jadval'dagi "yordamchi" yozuv, alohida trash
 *    kerak emas).
 *  - `dueDate` bor va Plan hali yo'q bo'lsa — yangi Plan yaratiladi.
 *  - `dueDate` bor va Plan allaqachon mavjud bo'lsa — nom/muhimlik/holat
 *    (va sana o'zgargan bo'lsa — sana ham) shu Plan'ga ko'chiriladi. */
async function syncTaskPlan(
  userId: string,
  task: { id: string; projectId: string; title: string; done: boolean; priority: PlanPriority | null; dueDate: string | null },
  existingPlanId: string | null,
  dueDateChanged: boolean
) {
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
    where: { userId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await prisma.plan.create({
    data: {
      userId,
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

export async function listProjectTasks(projectId: string): Promise<ProjectTask[]> {
  const user = await requireUser();
  await requireOwnProject(user.id, projectId);
  const rows = await prisma.projectTask.findMany({
    where: { projectId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toTask);
}

export type CreateProjectTaskInput = {
  id?: string;
  projectId: string;
  title: string;
  priority?: PlanPriority;
  dueDate?: string;
};

export async function createProjectTask(input: CreateProjectTaskInput): Promise<ProjectTask> {
  const user = await requireUser();
  await requireOwnProject(user.id, input.projectId);
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
      user.id,
      { id: row.id, projectId: row.projectId, title: row.title, done: false, priority: row.priority as PlanPriority | null, dueDate: row.dueDate },
      null,
      true
    );
  }
  return toTask(row);
}

export type UpdateProjectTaskPatch = Partial<{
  title: string;
  done: boolean;
  priority: PlanPriority | null;
  dueDate: string | null;
  order: number;
}>;

export async function updateProjectTask(id: string, patch: UpdateProjectTaskPatch): Promise<ProjectTask> {
  const user = await requireUser();
  const existing = await prisma.projectTask.findFirst({
    where: { id, project: { userId: user.id } },
    include: { plan: { select: { id: true } } },
  });
  if (!existing) throw new Error("NOT_FOUND");

  const row = await prisma.projectTask.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.done !== undefined && { done: patch.done }),
      ...(patch.priority !== undefined && { priority: patch.priority }),
      ...(patch.dueDate !== undefined && { dueDate: patch.dueDate }),
      ...(patch.order !== undefined && { order: patch.order }),
    },
  });

  if (patch.title !== undefined || patch.done !== undefined || patch.priority !== undefined || patch.dueDate !== undefined) {
    await syncTaskPlan(
      user.id,
      { id: row.id, projectId: row.projectId, title: row.title, done: row.done, priority: row.priority as PlanPriority | null, dueDate: row.dueDate },
      existing.plan?.id ?? null,
      patch.dueDate !== undefined
    );
  }

  return toTask(row);
}

export async function removeProjectTask(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.projectTask.deleteMany({ where: { id, project: { userId: user.id } } });
}
