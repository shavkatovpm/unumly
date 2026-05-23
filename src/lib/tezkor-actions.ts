"use server";

import type { QuickList as DbList, QuickListItem as DbItem } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { QuickList, QuickListItem } from "@/lib/tezkor-types";
import { defaultListName } from "@/lib/tezkor-utils";

const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/* ─── Serializers ─────────────────────────────────────────── */

function toItem(i: DbItem): QuickListItem {
  return {
    id: i.id,
    listId: i.listId,
    text: i.text,
    done: i.done,
    order: i.order,
    createdAt: i.createdAt.toISOString(),
  };
}

function toList(l: DbList & { items?: DbItem[] }): QuickList {
  return {
    id: l.id,
    name: l.name,
    source: l.source as "bot" | "app",
    closedAt: l.closedAt ? l.closedAt.toISOString() : undefined,
    completedAt: l.completedAt ? l.completedAt.toISOString() : undefined,
    deletedAt: l.deletedAt ? l.deletedAt.toISOString() : undefined,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    items: (l.items ?? []).map(toItem),
  };
}

/* ─── Auth helper ─────────────────────────────────────────── */

async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

/* ─── Read ────────────────────────────────────────────────── */

/** All lists for the current user, including soft-deleted (UI filters them).
 *  Expired trash (>30 days) is purged on read. */
export async function listLists(): Promise<QuickList[]> {
  const user = await requireUser();

  const cutoff = new Date(Date.now() - TRASH_TTL_MS);
  await prisma.quickList.deleteMany({
    where: { userId: user.id, deletedAt: { lt: cutoff } },
  });

  const rows = await prisma.quickList.findMany({
    where: { userId: user.id },
    include: { items: { orderBy: { order: "asc" } } },
    orderBy: [{ createdAt: "desc" }],
  });
  return rows.map(toList);
}

/* ─── Create / mutate ─────────────────────────────────────── */

export type CreateListInput = {
  id?: string;
  name: string;
  items: string[]; // each entry = one item's text
};

export async function createList(input: CreateListInput): Promise<QuickList> {
  const user = await requireUser();
  const cleaned = input.items.map((t) => t.trim()).filter(Boolean);

  const row = await prisma.quickList.create({
    data: {
      id: input.id,
      userId: user.id,
      name: input.name.trim() || defaultListName(),
      source: "app",
      items: {
        create: cleaned.map((text, idx) => ({ text, order: idx })),
      },
    },
    include: { items: { orderBy: { order: "asc" } } },
  });
  return toList(row);
}

export async function renameList(id: string, name: string): Promise<QuickList> {
  const user = await requireUser();
  const trimmed = name.trim() || defaultListName();
  await prisma.quickList.updateMany({
    where: { id, userId: user.id },
    data: { name: trimmed },
  });
  const row = await prisma.quickList.findFirst({
    where: { id, userId: user.id },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!row) throw new Error("NOT_FOUND");
  return toList(row);
}

export async function addItems(
  listId: string,
  texts: string[]
): Promise<QuickList> {
  const user = await requireUser();
  const list = await prisma.quickList.findFirst({
    where: { id: listId, userId: user.id },
    include: { items: { orderBy: { order: "desc" }, take: 1 } },
  });
  if (!list) throw new Error("NOT_FOUND");

  const startOrder = (list.items[0]?.order ?? -1) + 1;
  const cleaned = texts.map((t) => t.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return getList(listId);
  }

  await prisma.quickListItem.createMany({
    data: cleaned.map((text, idx) => ({
      listId,
      text,
      order: startOrder + idx,
    })),
  });
  // Touch the list so cron's "stale" check sees the activity.
  await prisma.quickList.update({
    where: { id: listId },
    data: { updatedAt: new Date() },
  });
  return getList(listId);
}

export async function toggleItem(itemId: string): Promise<QuickListItem> {
  const user = await requireUser();
  const item = await prisma.quickListItem.findUnique({
    where: { id: itemId },
    include: { list: true },
  });
  if (!item || item.list.userId !== user.id) throw new Error("NOT_FOUND");
  const updated = await prisma.quickListItem.update({
    where: { id: itemId },
    data: { done: !item.done },
  });
  return toItem(updated);
}

export async function updateItemText(
  itemId: string,
  text: string
): Promise<QuickListItem> {
  const user = await requireUser();
  const item = await prisma.quickListItem.findUnique({
    where: { id: itemId },
    include: { list: true },
  });
  if (!item || item.list.userId !== user.id) throw new Error("NOT_FOUND");
  const updated = await prisma.quickListItem.update({
    where: { id: itemId },
    data: { text: text.trim() },
  });
  return toItem(updated);
}

export async function removeItem(itemId: string): Promise<void> {
  const user = await requireUser();
  const item = await prisma.quickListItem.findUnique({
    where: { id: itemId },
    include: { list: true },
  });
  if (!item || item.list.userId !== user.id) return;
  await prisma.quickListItem.delete({ where: { id: itemId } });
}

/* ─── Reorder items (drag-and-drop) ──────────────────────── */

/** Persist a new ordering for a list's items. `orderedIds` must contain
 *  every item id in the list, in the desired display order. */
export async function reorderItems(
  listId: string,
  orderedIds: string[]
): Promise<QuickList> {
  const user = await requireUser();
  const list = await prisma.quickList.findFirst({
    where: { id: listId, userId: user.id },
    include: { items: { select: { id: true } } },
  });
  if (!list) throw new Error("NOT_FOUND");

  // Defence: only update items that actually belong to this list.
  const known = new Set(list.items.map((i) => i.id));
  const filtered = orderedIds.filter((id) => known.has(id));

  await prisma.$transaction(
    filtered.map((id, idx) =>
      prisma.quickListItem.update({
        where: { id },
        data: { order: idx },
      })
    )
  );
  return getList(listId);
}

/* ─── Complete (whole list "done") ───────────────────────── */

export async function completeList(id: string): Promise<QuickList> {
  const user = await requireUser();
  await prisma.quickList.updateMany({
    where: { id, userId: user.id },
    data: { completedAt: new Date() },
  });
  return getList(id);
}

export async function restoreCompletedList(id: string): Promise<QuickList> {
  const user = await requireUser();
  await prisma.quickList.updateMany({
    where: { id, userId: user.id },
    data: { completedAt: null },
  });
  return getList(id);
}

/* ─── Soft delete / restore / purge ──────────────────────── */

export async function removeList(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.quickList.updateMany({
    where: { id, userId: user.id },
    data: { deletedAt: new Date() },
  });
}

export async function restoreList(id: string): Promise<QuickList> {
  const user = await requireUser();
  await prisma.quickList.updateMany({
    where: { id, userId: user.id },
    data: { deletedAt: null },
  });
  return getList(id);
}

export async function purgeList(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.quickList.deleteMany({ where: { id, userId: user.id } });
}

export async function getList(id: string): Promise<QuickList> {
  const user = await requireUser();
  const row = await prisma.quickList.findFirst({
    where: { id, userId: user.id },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!row) throw new Error("NOT_FOUND");
  return toList(row);
}
