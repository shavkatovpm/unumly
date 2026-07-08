"use server";

import type { Page as DbPage, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { Page } from "@/lib/types";

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

function toPage(p: DbPage): Page {
  return {
    id: p.id,
    projectId: p.projectId,
    parentId: p.parentId,
    title: p.title,
    icon: p.icon ?? undefined,
    content: (p.content as unknown[] | null) ?? null,
    order: p.order,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** Loyihaning barcha sahifalarini tekis ro'yxat sifatida qaytaradi —
 *  daraxtni mijoz (parentId orqali) quradi. */
export async function listPages(projectId: string): Promise<Page[]> {
  const user = await requireUser();
  await requireOwnProject(user.id, projectId);
  const rows = await prisma.page.findMany({
    where: { projectId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toPage);
}

export type CreatePageInput = {
  id?: string;
  projectId: string;
  parentId?: string | null;
  title?: string;
};

export async function createPage(input: CreatePageInput): Promise<Page> {
  const user = await requireUser();
  await requireOwnProject(user.id, input.projectId);
  const last = await prisma.page.findFirst({
    where: { projectId: input.projectId, parentId: input.parentId ?? null },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const row = await prisma.page.create({
    data: {
      id: input.id,
      projectId: input.projectId,
      parentId: input.parentId ?? null,
      title: input.title?.trim() || "Nomsiz",
      order: (last?.order ?? -1) + 1,
    },
  });
  return toPage(row);
}

export type UpdatePagePatch = Partial<{
  title: string;
  icon: string | null;
  content: unknown[] | null;
  parentId: string | null;
  order: number;
}>;

export async function updatePage(id: string, patch: UpdatePagePatch): Promise<Page> {
  const user = await requireUser();
  const existing = await prisma.page.findFirst({
    where: { id, project: { userId: user.id } },
  });
  if (!existing) throw new Error("NOT_FOUND");

  // BlockNote'ning ba'zi blok proplari (masalan jadval `columnWidths` —
  // avtomatik kenglikdagi ustunlar uchun `undefined` bo'lishi mumkin) xom JS
  // `undefined` qiymatini o'z ichiga oladi — Prisma'ning Json ustuni buni rad
  // etadi ("Can not use `undefined` value within array"), va bu saqlashni
  // butunlay yiqitib, o'zgarish sukut saqlab (foydalanuvchiga xato
  // ko'rinmasdan) yo'qolib ketishiga sabab bo'lardi. JSON aylanishi
  // `undefined`ni massivda `null`ga, obyekt xossasida esa butunlay olib
  // tashlashga aylantiradi — bu Prisma xato xabarining o'zi tavsiya qilgani.
  const safeContent =
    patch.content !== undefined
      ? (JSON.parse(JSON.stringify(patch.content)) as Prisma.InputJsonValue)
      : undefined;

  const row = await prisma.page.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() || "Nomsiz" }),
      ...(patch.icon !== undefined && { icon: patch.icon }),
      ...(safeContent !== undefined && { content: safeContent }),
      ...(patch.parentId !== undefined && { parentId: patch.parentId }),
      ...(patch.order !== undefined && { order: patch.order }),
    },
  });
  return toPage(row);
}

/** Sahifani o'chiradi — DB'dagi ON DELETE CASCADE orqali barcha bola
 *  sahifalar (parentId zanjiri) ham birga o'chadi. */
export async function removePage(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.page.deleteMany({ where: { id, project: { userId: user.id } } });
}

/** Bir xil ota (parentId)ga tegishli sahifalarni drag-and-drop orqali qayta
 *  tartiblash — bitta gesture uchun bitta so'rov, hammasi bitta
 *  tranzaksiyada. Boshqa foydalanuvchiga tegishli id kirib qolmasligi
 *  uchun avval mavjud (shu userga tegishli) id'lar bilan filtrlanadi. */
export async function reorderPages(projectId: string, orderedIds: string[]): Promise<void> {
  const user = await requireUser();
  await requireOwnProject(user.id, projectId);
  const known = new Set(
    (await prisma.page.findMany({ where: { projectId }, select: { id: true } })).map((p) => p.id)
  );
  const filtered = orderedIds.filter((id) => known.has(id));
  await prisma.$transaction(
    filtered.map((id, i) => prisma.page.update({ where: { id }, data: { order: i } }))
  );
}
