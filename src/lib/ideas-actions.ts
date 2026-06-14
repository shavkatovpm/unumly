"use server";

import type { Idea as DbIdea } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { Idea, PlanPriority } from "@/lib/types";

function toIdea(i: DbIdea): Idea {
  return {
    id: i.id,
    title: i.title,
    notes: i.notes ?? undefined,
    categoryId: i.categoryId,
    done: i.done,
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

/* ─── Read ────────────────────────────────────────────────── */

export async function listIdeas(): Promise<Idea[]> {
  const user = await requireUser();
  const rows = await prisma.idea.findMany({
    where: { userId: user.id },
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
  scheduledFor?: string;
  time?: string;
  duration?: number;
  priority?: PlanPriority;
};

export async function createIdea(input: CreateIdeaInput): Promise<Idea> {
  const user = await requireUser();
  const last = await prisma.idea.findFirst({
    where: { userId: user.id },
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
      scheduledFor: input.scheduledFor,
      time: input.time,
      duration: input.duration,
      priority: input.priority,
      order: nextOrder,
    },
  });
  return toIdea(row);
}

export type UpdateIdeaPatch = Partial<{
  title: string;
  notes: string | null;
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
      ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
      ...(patch.done !== undefined && { done: patch.done }),
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
  const row = await prisma.idea.update({
    where: { id },
    data: { done: !existing.done },
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
