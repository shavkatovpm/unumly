import "server-only";

import type { QuickList as DbList, QuickListItem as DbItem } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { McpNotFoundError, withMcpErrors } from "@/lib/mcp/errors";

/**
 * MCP qatlami — src/lib/tezkor-actions.ts'ning tor to'plami. UI'dagi ko'p
 * mayda amallar (har bir item uchun alohida toggle/rename/reorder,
 * bot-summary xabar boshqaruvi) bitta update_quicklist tool'iga
 * birlashtirilgan — tool sonini kamaytirish uchun (foydalanuvchi bilan
 * kelishilgan konsolidatsiya). Reorder qo'llab-quvvatlanmaydi.
 */

const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type McpQuickListItem = { id: string; text: string; done: boolean; order: number };
export type McpQuickList = {
  id: string;
  name: string;
  source: "bot" | "app";
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: McpQuickListItem[];
};

function toItem(i: DbItem): McpQuickListItem {
  return { id: i.id, text: i.text, done: i.done, order: i.order };
}

function toList(l: DbList & { items: DbItem[] }): McpQuickList {
  return {
    id: l.id,
    name: l.name,
    source: l.source as "bot" | "app",
    completedAt: l.completedAt ? l.completedAt.toISOString() : null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    items: l.items.map(toItem),
  };
}

/* ─── list_quicklists ─────────────────────────────────────── */

async function listQuickListsImpl(
  ownerUserId: string,
  includeCompleted?: boolean
): Promise<{ lists: McpQuickList[] }> {
  const cutoff = new Date(Date.now() - TRASH_TTL_MS);
  await prisma.quickList.deleteMany({ where: { userId: ownerUserId, deletedAt: { lt: cutoff } } });

  const rows = await prisma.quickList.findMany({
    where: {
      userId: ownerUserId,
      deletedAt: null,
      ...(includeCompleted ? {} : { completedAt: null }),
    },
    include: { items: { orderBy: { order: "asc" } } },
    orderBy: [{ createdAt: "desc" }],
  });
  return { lists: rows.map(toList) };
}

export const mcpListQuickLists = withMcpErrors(listQuickListsImpl);

/* ─── create_quicklist ────────────────────────────────────── */

export type McpCreateQuickListInput = { id?: string; name?: string; items: string[] };

async function createQuickListImpl(ownerUserId: string, input: McpCreateQuickListInput): Promise<{ list: McpQuickList }> {
  const cleaned = input.items.map((t) => t.trim()).filter(Boolean);
  const row = await prisma.quickList.create({
    data: {
      id: input.id,
      userId: ownerUserId,
      name: input.name?.trim() || `Ro'yxat — ${new Date().toLocaleDateString("uz-UZ")}`,
      source: "app",
      items: { create: cleaned.map((text, idx) => ({ text, order: idx })) },
    },
    include: { items: { orderBy: { order: "asc" } } },
  });
  return { list: toList(row) };
}

export const mcpCreateQuickList = withMcpErrors(createQuickListImpl);

/* ─── update_quicklist (nom, item qo'shish/belgilash/o'chirish, yakunlash) ─ */

export type McpUpdateQuickListPatch = Partial<{
  name: string;
  addItems: string[];
  toggleItemIds: string[];
  removeItemIds: string[];
  completed: boolean;
}>;

async function requireOwnList(ownerUserId: string, id: string) {
  const list = await prisma.quickList.findFirst({ where: { id, userId: ownerUserId, deletedAt: null } });
  if (!list) throw new McpNotFoundError(`Ro'yxat topilmadi yoki sizga tegishli emas: ${id}`);
  return list;
}

async function updateQuickListImpl(
  ownerUserId: string,
  id: string,
  patch: McpUpdateQuickListPatch
): Promise<{ list: McpQuickList }> {
  await requireOwnList(ownerUserId, id);

  if (patch.name !== undefined) {
    await prisma.quickList.update({ where: { id }, data: { name: patch.name.trim() || undefined } });
  }

  if (patch.addItems?.length) {
    const last = await prisma.quickListItem.findFirst({ where: { listId: id }, orderBy: { order: "desc" }, select: { order: true } });
    const cleaned = patch.addItems.map((t) => t.trim()).filter(Boolean);
    if (cleaned.length) {
      await prisma.quickListItem.createMany({
        data: cleaned.map((text, idx) => ({ listId: id, text, order: (last?.order ?? -1) + 1 + idx })),
      });
    }
  }

  if (patch.toggleItemIds?.length) {
    const items = await prisma.quickListItem.findMany({ where: { id: { in: patch.toggleItemIds }, listId: id } });
    await Promise.all(items.map((i) => prisma.quickListItem.update({ where: { id: i.id }, data: { done: !i.done } })));
  }

  if (patch.removeItemIds?.length) {
    await prisma.quickListItem.deleteMany({ where: { id: { in: patch.removeItemIds }, listId: id } });
  }

  if (patch.completed !== undefined) {
    await prisma.quickList.update({ where: { id }, data: { completedAt: patch.completed ? new Date() : null } });
  }

  if (patch.addItems?.length || patch.toggleItemIds?.length || patch.removeItemIds?.length) {
    await prisma.quickList.update({ where: { id }, data: { updatedAt: new Date() } });
  }

  const row = await prisma.quickList.findFirst({ where: { id }, include: { items: { orderBy: { order: "asc" } } } });
  if (!row) throw new McpNotFoundError(`Ro'yxat topilmadi: ${id}`);
  return { list: toList(row) };
}

export const mcpUpdateQuickList = withMcpErrors(updateQuickListImpl);

/* ─── delete_quicklist (soft-delete — deletedAt maydoni mavjud) ──── */

async function deleteQuickListImpl(ownerUserId: string, id: string): Promise<{ id: string; name: string }> {
  const existing = await requireOwnList(ownerUserId, id);
  await prisma.quickList.update({ where: { id }, data: { deletedAt: new Date() } });
  return { id: existing.id, name: existing.name };
}

export const mcpDeleteQuickList = withMcpErrors(deleteQuickListImpl);
