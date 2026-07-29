import "server-only";

import { type Idea as DbIdea, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { computeNotifyAt, sanitizeLeadMin } from "@/lib/notify-time";
import { McpNotFoundError, withMcpErrors } from "@/lib/mcp/errors";

/**
 * MCP qatlami — src/lib/ideas-actions.ts bilan bir xil mantiq, lekin
 * requireUser() o'rniga ownerUserId parametri bilan.
 *
 * MUHIM (kodni o'qib topilgan, hech qayerda hujjatlashtirilmagan edi):
 * shaxsiy (loyihasiz) g'oya sanaga bog'lansa, u src/lib/ideas-store.ts
 * (client) tomonidan BIR XIL id bilan Plan sifatida ham "oyna"lanadi —
 * shu orqali Bugun/Agenda/Kalendarda ko'rinadi. Bu mantiq serverda
 * (ideas-actions.ts) emas, faqat client store'da bor edi — shuning uchun
 * MCP buni o'zi qayta amalga oshiradi (syncIdeaPlanMirror), aks holda
 * MCP orqali rejalashtirilgan g'oyalar Agenda'da ko'rinmay qolardi.
 * Loyiha-ichi g'oyalar bu oynaga kirmaydi (RejaView loyiha ichida
 * Bugun/Agenda bilan bog'lanmaydi).
 */

export type McpIdeaPriority = "LOW" | "MEDIUM" | "HIGH";

export type McpIdeaRecord = {
  id: string;
  title: string;
  notes: string | null;
  categoryId: string;
  categoryLabel: string | null;
  done: boolean;
  completedAt: string | null;
  projectId: string | null;
  projectTitle: string | null;
  scheduledFor: string | null;
  time: string | null;
  duration: number | null;
  priority: McpIdeaPriority | null;
  order: number;
  createdAt: string;
  updatedAt: string;
};

async function getUserLeadMin(ownerUserId: string): Promise<number> {
  const u = await prisma.user.findUnique({ where: { id: ownerUserId }, select: { notifyLeadMin: true } });
  return sanitizeLeadMin(u?.notifyLeadMin);
}

async function requireOwnProject(ownerUserId: string, projectId: string): Promise<void> {
  const p = await prisma.project.findFirst({ where: { id: projectId, userId: ownerUserId }, select: { id: true } });
  if (!p) throw new McpNotFoundError(`Loyiha topilmadi yoki sizga tegishli emas: ${projectId}`);
}

async function requireOwnCategory(ownerUserId: string, categoryId: string, projectId: string | null): Promise<void> {
  const c = await prisma.category.findFirst({
    where: { id: categoryId, userId: ownerUserId, projectId },
    select: { id: true },
  });
  if (!c) {
    throw new McpNotFoundError(
      `Kategoriya topilmadi, sizga tegishli emas, yoki ${projectId ? "shu loyihaga" : "shaxsiy Reja'ga"} tegishli emas: ${categoryId}`
    );
  }
}

/** Shaxsiy g'oyani (bor bo'lsa) bir xil id'li Plan bilan sinxronlaydi:
 *  scheduledFor bo'lsa — Plan yaratadi/yangilaydi (notifyAt qayta hisoblanadi);
 *  yo'q bo'lsa — mavjud mirror Plan'ni yumshoq o'chiradi (deletedAt). */
async function syncIdeaPlanMirror(
  ownerUserId: string,
  idea: {
    id: string;
    title: string;
    notes: string | null;
    done: boolean;
    priority: string | null;
    scheduledFor: string | null;
    time: string | null;
    duration: number | null;
    projectId: string | null;
  }
): Promise<void> {
  if (idea.projectId) return; // faqat shaxsiy g'oyalar oynalanadi

  if (!idea.scheduledFor) {
    await prisma.plan.updateMany({
      where: { id: idea.id, userId: ownerUserId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return;
  }

  const leadMin = await getUserLeadMin(ownerUserId);
  const notifyAt = computeNotifyAt(idea.scheduledFor, idea.time, leadMin);
  const existing = await prisma.plan.findFirst({ where: { id: idea.id, userId: ownerUserId } });
  const priority = idea.priority as Prisma.PlanCreateInput["priority"];

  if (existing) {
    await prisma.plan.update({
      where: { id: idea.id },
      data: {
        title: idea.title,
        notes: idea.notes,
        priority,
        status: idea.done ? "DONE" : "TODO",
        completedAt: idea.done ? (existing.completedAt ?? new Date()) : null,
        scheduledFor: idea.scheduledFor,
        time: idea.time,
        duration: idea.duration,
        deletedAt: null,
        notifyAt,
        notifiedAt: null,
      },
    });
  } else {
    await prisma.plan.create({
      data: {
        id: idea.id,
        userId: ownerUserId,
        title: idea.title,
        notes: idea.notes,
        scope: "DAILY",
        status: idea.done ? "DONE" : "TODO",
        priority,
        scheduledFor: idea.scheduledFor,
        time: idea.time,
        duration: idea.duration,
        notifyAt,
        completedAt: idea.done ? new Date() : null,
        order: 0,
      },
    });
  }
}

async function toIdeaRecord(i: DbIdea): Promise<McpIdeaRecord> {
  const [category, project] = await Promise.all([
    prisma.category.findUnique({ where: { id: i.categoryId }, select: { label: true } }).catch(() => null),
    i.projectId ? prisma.project.findUnique({ where: { id: i.projectId }, select: { title: true } }) : null,
  ]);
  return {
    id: i.id,
    title: i.title,
    notes: i.notes,
    categoryId: i.categoryId,
    categoryLabel: category?.label ?? null,
    done: i.done,
    completedAt: i.completedAt ? i.completedAt.toISOString() : null,
    projectId: i.projectId,
    projectTitle: project?.title ?? null,
    scheduledFor: i.scheduledFor,
    time: i.time,
    duration: i.duration,
    priority: i.priority as McpIdeaPriority | null,
    order: i.order,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

/* ─── list_ideas ──────────────────────────────────────────── */

export type McpListIdeasFilter = {
  projectId?: string | null;
  categoryId?: string;
  limit?: number;
  offset?: number;
};

async function listIdeasImpl(ownerUserId: string, filter: McpListIdeasFilter) {
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
  const offset = Math.max(filter.offset ?? 0, 0);

  const where: Prisma.IdeaWhereInput = {
    userId: ownerUserId,
    ...(filter.projectId !== undefined && { projectId: filter.projectId }),
    ...(filter.categoryId && { categoryId: filter.categoryId }),
  };

  const [rows, total] = await Promise.all([
    prisma.idea.findMany({ where, orderBy: [{ order: "asc" }, { createdAt: "asc" }], take: limit, skip: offset }),
    prisma.idea.count({ where }),
  ]);

  return {
    ideas: await Promise.all(rows.map(toIdeaRecord)),
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
  };
}

export const mcpListIdeas = withMcpErrors(listIdeasImpl);

/* ─── create_idea ─────────────────────────────────────────── */

export type McpCreateIdeaInput = {
  id?: string;
  title: string;
  categoryId: string;
  notes?: string;
  projectId?: string;
  scheduledFor?: string;
  time?: string;
  duration?: number;
  priority?: McpIdeaPriority;
};

async function createIdeaImpl(ownerUserId: string, input: McpCreateIdeaInput): Promise<{ idea: McpIdeaRecord }> {
  if (input.projectId) await requireOwnProject(ownerUserId, input.projectId);
  await requireOwnCategory(ownerUserId, input.categoryId, input.projectId ?? null);

  const last = await prisma.idea.findFirst({
    where: { userId: ownerUserId, projectId: input.projectId ?? null },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const row = await prisma.idea.create({
    data: {
      id: input.id,
      userId: ownerUserId,
      title: input.title.trim(),
      categoryId: input.categoryId,
      notes: input.notes,
      scheduledFor: input.scheduledFor,
      time: input.time,
      duration: input.duration,
      priority: input.priority,
      projectId: input.projectId,
      order: (last?.order ?? -1) + 1,
    },
  });

  await syncIdeaPlanMirror(ownerUserId, {
    id: row.id,
    title: row.title,
    notes: row.notes,
    done: row.done,
    priority: row.priority,
    scheduledFor: row.scheduledFor,
    time: row.time,
    duration: row.duration,
    projectId: row.projectId,
  });

  return { idea: await toIdeaRecord(row) };
}

export const mcpCreateIdea = withMcpErrors(createIdeaImpl);

/* ─── update_idea ─────────────────────────────────────────── */

export type McpUpdateIdeaPatch = Partial<{
  title: string;
  notes: string | null;
  categoryId: string;
  done: boolean;
  scheduledFor: string | null;
  time: string | null;
  duration: number | null;
  priority: McpIdeaPriority | null;
}>;

async function updateIdeaImpl(
  ownerUserId: string,
  id: string,
  patch: McpUpdateIdeaPatch
): Promise<{ idea: McpIdeaRecord }> {
  const existing = await prisma.idea.findFirst({ where: { id, userId: ownerUserId } });
  if (!existing) throw new McpNotFoundError(`G'oya topilmadi yoki sizga tegishli emas: ${id}`);

  if (patch.categoryId !== undefined) {
    await requireOwnCategory(ownerUserId, patch.categoryId, existing.projectId);
  }

  const row = await prisma.idea.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.notes !== undefined && { notes: patch.notes }),
      ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
      ...(patch.done !== undefined && { done: patch.done, completedAt: patch.done ? new Date() : null }),
      ...(patch.scheduledFor !== undefined && { scheduledFor: patch.scheduledFor }),
      ...(patch.time !== undefined && { time: patch.time }),
      ...(patch.duration !== undefined && { duration: patch.duration }),
      ...(patch.priority !== undefined && { priority: patch.priority }),
    },
  });

  await syncIdeaPlanMirror(ownerUserId, {
    id: row.id,
    title: row.title,
    notes: row.notes,
    done: row.done,
    priority: row.priority,
    scheduledFor: row.scheduledFor,
    time: row.time,
    duration: row.duration,
    projectId: row.projectId,
  });

  return { idea: await toIdeaRecord(row) };
}

export const mcpUpdateIdea = withMcpErrors(updateIdeaImpl);

/* ─── delete_idea ─────────────────────────────────────────── */
// Idea modelida deletedAt maydoni yo'q — hard delete (schema shunday, MCP
// buni o'zgartirmaydi). Bog'langan mirror Plan (shaxsiy bo'lsa) yumshoq
// o'chiriladi — plans-actions.ts:removePlan bilan bir xil qoida.

async function deleteIdeaImpl(ownerUserId: string, id: string): Promise<{ id: string; title: string }> {
  const existing = await prisma.idea.findFirst({ where: { id, userId: ownerUserId } });
  if (!existing) throw new McpNotFoundError(`G'oya topilmadi yoki sizga tegishli emas: ${id}`);

  await prisma.idea.deleteMany({ where: { id, userId: ownerUserId } });

  if (!existing.projectId) {
    await prisma.plan.updateMany({
      where: { id, userId: ownerUserId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await prisma.botMessage.deleteMany({ where: { planId: id } });
  }

  return { id: existing.id, title: existing.title };
}

export const mcpDeleteIdea = withMcpErrors(deleteIdeaImpl);

/* ─── delete_category ─────────────────────────────────────── */
// App'dagi reja-view.tsx bilan bir xil xatti-harakat: kategoriya ichidagi
// BARCHA g'oyalar ham birga o'chadi (cascade — "Boshqa"ga ko'chirish yoki
// rad etish yo'q, app shunday qiladi). Har bir g'oya deleteIdeaImpl orqali
// o'chadi — shaxsiy bo'lsa mirror Plan'lari ham yumshoq o'chadi. Standart
// (tizim) kategoriyalar (id="ish"/"organish", faqat shaxsiy Reja'da,
// categories-actions.ts:DEFAULTS) — o'chirish rad etiladi (app'da bu
// himoya yo'q, lekin foydalanuvchi talabiga ko'ra MCP'da qo'shilgan).

const PROTECTED_CATEGORY_IDS = new Set(["ish", "organish"]);

async function deleteCategoryImpl(
  ownerUserId: string,
  id: string
): Promise<{ id: string; label: string; deletedIdeasCount: number }> {
  if (PROTECTED_CATEGORY_IDS.has(id)) {
    throw new Error(`Bu standart (tizim) kategoriya — o'chirib bo'lmaydi: ${id}`);
  }

  const existing = await prisma.category.findFirst({ where: { id, userId: ownerUserId } });
  if (!existing) throw new McpNotFoundError(`Kategoriya topilmadi yoki sizga tegishli emas: ${id}`);

  const ideasInCategory = await prisma.idea.findMany({
    where: { categoryId: id, userId: ownerUserId },
    select: { id: true },
  });
  for (const idea of ideasInCategory) {
    await deleteIdeaImpl(ownerUserId, idea.id);
  }

  await prisma.category.deleteMany({ where: { id, userId: ownerUserId } });

  return { id: existing.id, label: existing.label, deletedIdeasCount: ideasInCategory.length };
}

export const mcpDeleteCategory = withMcpErrors(deleteCategoryImpl);
