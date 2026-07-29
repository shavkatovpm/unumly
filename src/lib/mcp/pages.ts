import "server-only";

import type { Page as DbPage, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { McpNotFoundError, withMcpErrors } from "@/lib/mcp/errors";
import { blocksToMarkdown, markdownToBlocks } from "@/lib/mcp/blocknote";

/**
 * MCP qatlami — src/lib/pages-actions.ts bilan bir xil mantiq, lekin
 * requireUser() o'rniga ownerUserId bilan. Content BlockNote JSON o'rniga
 * markdown sifatida qabul qilinadi/qaytariladi (blocknote.ts orqali).
 */

export type McpPageMeta = {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
};

function toPageMeta(p: DbPage): McpPageMeta {
  return {
    id: p.id,
    projectId: p.projectId,
    parentId: p.parentId,
    title: p.title,
    icon: p.icon,
    order: p.order,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function requireOwnProject(ownerUserId: string, projectId: string): Promise<void> {
  const p = await prisma.project.findFirst({ where: { id: projectId, userId: ownerUserId }, select: { id: true } });
  if (!p) throw new McpNotFoundError(`Loyiha topilmadi yoki sizga tegishli emas: ${projectId}`);
}

/* ─── list_pages (faqat metadata, content'siz) ────────────── */

async function listPagesImpl(ownerUserId: string, projectId: string): Promise<{ pages: McpPageMeta[] }> {
  await requireOwnProject(ownerUserId, projectId);
  const rows = await prisma.page.findMany({
    where: { projectId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return { pages: rows.map(toPageMeta) };
}

export const mcpListPages = withMcpErrors(listPagesImpl);

/* ─── get_page (bitta hujjat, markdown content bilan) ─────── */

async function getPageImpl(
  ownerUserId: string,
  id: string
): Promise<{ page: McpPageMeta; markdown: string }> {
  const row = await prisma.page.findFirst({ where: { id, project: { userId: ownerUserId } } });
  if (!row) throw new McpNotFoundError(`Hujjat topilmadi yoki sizga tegishli emas: ${id}`);
  const markdown = await blocksToMarkdown(row.content);
  return { page: toPageMeta(row), markdown };
}

export const mcpGetPage = withMcpErrors(getPageImpl);

/* ─── create_page ─────────────────────────────────────────── */
// v1 cheklovi: content markdown → BlockNote blok konvertatsiyasi "lossy"
// (kutubxonaning o'zi shunday nomlaydi) — asosiy elementlar (paragraph,
// heading, ro'yxatlar) to'g'ri o'giriladi, murakkab formatlash yo'qolishi
// mumkin. contentMarkdown berilmasa — bo'sh hujjat yaratiladi (xuddi
// ilovada "+" tugmasi bosilgandek), keyin foydalanuvchi UI'da tahrirlaydi.

export type McpCreatePageInput = {
  id?: string;
  projectId: string;
  parentId?: string | null;
  title?: string;
  contentMarkdown?: string;
};

async function createPageImpl(
  ownerUserId: string,
  input: McpCreatePageInput
): Promise<{ page: McpPageMeta }> {
  await requireOwnProject(ownerUserId, input.projectId);

  if (input.parentId) {
    const parent = await prisma.page.findFirst({ where: { id: input.parentId, projectId: input.projectId }, select: { id: true } });
    if (!parent) throw new McpNotFoundError(`Ota hujjat topilmadi yoki shu loyihaga tegishli emas: ${input.parentId}`);
  }

  const last = await prisma.page.findFirst({
    where: { projectId: input.projectId, parentId: input.parentId ?? null },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const content = input.contentMarkdown
    ? ((await markdownToBlocks(input.contentMarkdown)) as unknown as Prisma.InputJsonValue)
    : undefined;

  const row = await prisma.page.create({
    data: {
      id: input.id,
      projectId: input.projectId,
      parentId: input.parentId ?? null,
      title: input.title?.trim() || "Nomsiz",
      order: (last?.order ?? -1) + 1,
      ...(content !== undefined && { content }),
    },
  });

  return { page: toPageMeta(row) };
}

export const mcpCreatePage = withMcpErrors(createPageImpl);

/* ─── update_page ─────────────────────────────────────────── */

export type McpUpdatePagePatch = Partial<{
  title: string;
  icon: string | null;
  contentMarkdown: string;
  parentId: string | null;
}>;

async function updatePageImpl(
  ownerUserId: string,
  id: string,
  patch: McpUpdatePagePatch
): Promise<{ page: McpPageMeta }> {
  const existing = await prisma.page.findFirst({ where: { id, project: { userId: ownerUserId } } });
  if (!existing) throw new McpNotFoundError(`Hujjat topilmadi yoki sizga tegishli emas: ${id}`);

  if (patch.parentId) {
    const parent = await prisma.page.findFirst({ where: { id: patch.parentId, projectId: existing.projectId }, select: { id: true } });
    if (!parent) throw new McpNotFoundError(`Ota hujjat topilmadi yoki shu loyihaga tegishli emas: ${patch.parentId}`);
  }

  const content =
    patch.contentMarkdown !== undefined
      ? ((await markdownToBlocks(patch.contentMarkdown)) as unknown as Prisma.InputJsonValue)
      : undefined;

  const row = await prisma.page.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() || "Nomsiz" }),
      ...(patch.icon !== undefined && { icon: patch.icon }),
      ...(content !== undefined && { content }),
      ...(patch.parentId !== undefined && { parentId: patch.parentId }),
    },
  });

  return { page: toPageMeta(row) };
}

export const mcpUpdatePage = withMcpErrors(updatePageImpl);

/* ─── delete_page ─────────────────────────────────────────── */
// Page modelida deletedAt yo'q — hard delete (schema shunday). ON DELETE
// CASCADE orqali barcha bola hujjatlar (parentId zanjiri) ham o'chadi —
// buni oldindan hisoblab, javobda aniq sonini qaytaramiz.

async function countDescendants(pageId: string, projectId: string): Promise<number> {
  const children = await prisma.page.findMany({ where: { parentId: pageId, projectId }, select: { id: true } });
  let count = children.length;
  for (const c of children) {
    count += await countDescendants(c.id, projectId);
  }
  return count;
}

async function deletePageImpl(
  ownerUserId: string,
  id: string
): Promise<{ id: string; title: string; deletedDescendants: number }> {
  const existing = await prisma.page.findFirst({ where: { id, project: { userId: ownerUserId } } });
  if (!existing) throw new McpNotFoundError(`Hujjat topilmadi yoki sizga tegishli emas: ${id}`);

  const deletedDescendants = await countDescendants(existing.id, existing.projectId);
  await prisma.page.deleteMany({ where: { id, project: { userId: ownerUserId } } });

  return { id: existing.id, title: existing.title, deletedDescendants };
}

export const mcpDeletePage = withMcpErrors(deletePageImpl);
