"use server";

import type { Project as DbProject } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { CategoryColor, Project } from "@/lib/types";

async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

function toProject(p: DbProject): Project {
  return {
    id: p.id,
    title: p.title,
    icon: p.icon ?? undefined,
    color: (p.color as CategoryColor | null) ?? undefined,
    order: p.order,
    archivedAt: p.archivedAt ? p.archivedAt.toISOString() : undefined,
  };
}

export async function listProjects(): Promise<Project[]> {
  const user = await requireUser();
  const rows = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toProject);
}

export type CreateProjectInput = {
  id?: string;
  title: string;
  icon?: string;
  color?: CategoryColor;
};

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const user = await requireUser();
  const last = await prisma.project.findFirst({ where: { userId: user.id }, orderBy: { order: "desc" }, select: { order: true } });
  const row = await prisma.project.create({
    data: {
      id: input.id,
      userId: user.id,
      title: input.title.trim(),
      icon: input.icon,
      color: input.color,
      order: (last?.order ?? -1) + 1,
    },
  });
  return toProject(row);
}

export type UpdateProjectPatch = Partial<{
  title: string;
  icon: string | null;
  color: CategoryColor | null;
  order: number;
  archivedAt: string | null;
}>;

export async function updateProject(id: string, patch: UpdateProjectPatch): Promise<Project> {
  const user = await requireUser();
  const existing = await prisma.project.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");

  const row = await prisma.project.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.icon !== undefined && { icon: patch.icon }),
      ...(patch.color !== undefined && { color: patch.color }),
      ...(patch.order !== undefined && { order: patch.order }),
      ...(patch.archivedAt !== undefined && { archivedAt: patch.archivedAt ? new Date(patch.archivedAt) : null }),
    },
  });
  return toProject(row);
}

/** Loyihani va unga tegishli hamma narsani (plan/maqsad/hujjatlar) o'chiradi
 *  — DB'dagi ON DELETE CASCADE orqali. */
export async function removeProject(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.project.deleteMany({ where: { id, userId: user.id } });
}
