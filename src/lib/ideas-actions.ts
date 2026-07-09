"use server";

import { Prisma, type Idea as DbIdea } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { Idea, PlanPriority, Subtask } from "@/lib/types";

function toSubtasks(v: unknown): Subtask[] | undefined {
  return Array.isArray(v) ? (v as unknown as Subtask[]) : undefined;
}

function toIdea(i: DbIdea): Idea {
  return {
    id: i.id,
    title: i.title,
    notes: i.notes ?? undefined,
    categoryId: i.categoryId,
    done: i.done,
    completedAt: i.completedAt?.toISOString() ?? undefined,
    subtasks: toSubtasks(i.subtasks),
    order: i.order,
    scheduledFor: i.scheduledFor ?? undefined,
    time: i.time ?? undefined,
    duration: i.duration ?? undefined,
    priority: (i.priority as PlanPriority | null) ?? undefined,
    createdAt: i.createdAt.toISOString(),
  };
}

async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

/** Loyiha shu foydalanuvchiga tegishli ekanini tekshiradi. */
async function requireOwnProject(userId: string, projectId: string) {
  const p = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
  if (!p) throw new Error("NOT_FOUND");
}

/* ─── Read ────────────────────────────────────────────────── */

export async function listIdeas(projectId?: string): Promise<Idea[]> {
  const user = await requireUser();
  if (projectId) await requireOwnProject(user.id, projectId);
  const rows = await prisma.idea.findMany({
    where: { userId: user.id, projectId: projectId ?? null },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toIdea);
}

/* ─── Create / update / delete ────────────────────────────── */

export type CreateIdeaInput = {
  id?: string;
  title: string;
  categoryId: string;
  notes?: string;
  subtasks?: Subtask[];
  scheduledFor?: string;
  time?: string;
  duration?: number;
  priority?: PlanPriority;
  projectId?: string;
};

export async function createIdea(input: CreateIdeaInput): Promise<Idea> {
  const user = await requireUser();
  if (input.projectId) await requireOwnProject(user.id, input.projectId);
  const last = await prisma.idea.findFirst({
    where: { userId: user.id, projectId: input.projectId ?? null },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (last?.order ?? -1) + 1;
  const row = await prisma.idea.create({
    data: {
      id: input.id,
      userId: user.id,
      title: input.title.trim(),
      categoryId: input.categoryId,
      notes: input.notes,
      ...(input.subtasks !== undefined && { subtasks: input.subtasks as unknown as Prisma.InputJsonValue }),
      scheduledFor: input.scheduledFor,
      time: input.time,
      duration: input.duration,
      priority: input.priority,
      projectId: input.projectId,
      order: nextOrder,
    },
  });
  return toIdea(row);
}

export type UpdateIdeaPatch = Partial<{
  title: string;
  notes: string | null;
  subtasks: Subtask[];
  categoryId: string;
  done: boolean;
  order: number;
  scheduledFor: string | null;
  time: string | null;
  duration: number | null;
  priority: PlanPriority | null;
}>;

export async function updateIdea(id: string, patch: UpdateIdeaPatch): Promise<Idea> {
  const user = await requireUser();
  const existing = await prisma.idea.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");
  const row = await prisma.idea.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.notes !== undefined && { notes: patch.notes }),
      ...(patch.subtasks !== undefined && { subtasks: patch.subtasks as unknown as Prisma.InputJsonValue }),
      ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
      ...(patch.done !== undefined && { done: patch.done, completedAt: patch.done ? new Date() : null }),
      ...(patch.order !== undefined && { order: patch.order }),
      ...(patch.scheduledFor !== undefined && { scheduledFor: patch.scheduledFor }),
      ...(patch.time !== undefined && { time: patch.time }),
      ...(patch.duration !== undefined && { duration: patch.duration }),
      ...(patch.priority !== undefined && { priority: patch.priority }),
    },
  });
  return toIdea(row);
}

export async function toggleIdeaDone(id: string): Promise<Idea> {
  const user = await requireUser();
  const existing = await prisma.idea.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");
  const nowDone = !existing.done;
  const row = await prisma.idea.update({
    where: { id },
    data: { done: nowDone, completedAt: nowDone ? new Date() : null },
  });
  return toIdea(row);
}

export async function removeIdea(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.idea.deleteMany({ where: { id, userId: user.id } });
}

/* ─── First-login importer ────────────────────────────────── */

/** Push a batch of localStorage ideas to the user's DB account.
 *  Skips IDs that already exist for the user (idempotent). */
export async function importIdeas(items: CreateIdeaInput[]): Promise<{ imported: number }> {
  const user = await requireUser();
  if (items.length === 0) return { imported: 0 };

  const ids = items.map((i) => i.id).filter((x): x is string => !!x);
  const existing = ids.length
    ? await prisma.idea.findMany({
        where: { userId: user.id, id: { in: ids } },
        select: { id: true },
      })
    : [];
  const existingSet = new Set(existing.map((x) => x.id));
  const toInsert = items.filter((i) => !i.id || !existingSet.has(i.id));
  if (toInsert.length === 0) return { imported: 0 };

  const last = await prisma.idea.findFirst({
    where: { userId: user.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  let nextOrder = (last?.order ?? -1) + 1;

  await prisma.idea.createMany({
    data: toInsert.map((i) => ({
      id: i.id,
      userId: user.id,
      title: i.title.trim(),
      categoryId: i.categoryId,
      notes: i.notes,
      subtasks: (i.subtasks ?? undefined) as unknown as Prisma.InputJsonValue,
      scheduledFor: i.scheduledFor,
      time: i.time,
      duration: i.duration,
      priority: i.priority,
      order: nextOrder++,
    })),
    skipDuplicates: true,
  });

  return { imported: toInsert.length };
}
