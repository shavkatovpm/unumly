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
  const existing = await prisma.projectTask.findFirst({ where: { id, project: { userId: user.id } } });
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
  return toTask(row);
}

export async function removeProjectTask(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.projectTask.deleteMany({ where: { id, project: { userId: user.id } } });
}
