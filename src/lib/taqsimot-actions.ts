"use server";

/**
 * Loyihalar taqsimoti — "Jadval" bo'limining tally-hisoblagichi (ProjectFocusLog).
 * Kun/soat emas, faqat "necha marta ishladim" (haftalik, loyiha bo'yicha).
 */

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { startOfWeek, toDateInputValue } from "@/lib/dates";

async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

function currentWeekStart(): string {
  return toDateInputValue(startOfWeek());
}

function lastWeekStarts(n: number): string[] {
  const out: string[] = [];
  const base = startOfWeek();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i * 7);
    out.push(toDateInputValue(d));
  }
  return out;
}

/** Joriy haftadagi har loyiha uchun tally soni (projectId -> son). */
export async function getFocusCounts(): Promise<Record<string, number>> {
  const user = await requireUser();
  const rows = await prisma.projectFocusLog.findMany({
    where: { weekStart: currentWeekStart(), project: { userId: user.id } },
    select: { projectId: true, count: true },
  });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.projectId] = r.count;
  return out;
}

/** Har loyiha uchun oxirgi `weeks` haftalik tally tarixi (eng eskisi
 *  birinchi) — Analitika trend sparkline'i uchun. */
export async function getFocusHistory(weeks = 6): Promise<Record<string, number[]>> {
  const user = await requireUser();
  const weekStarts = lastWeekStarts(weeks);
  const rows = await prisma.projectFocusLog.findMany({
    where: { weekStart: { in: weekStarts }, project: { userId: user.id } },
    select: { projectId: true, weekStart: true, count: true },
  });
  const byProject = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!byProject.has(r.projectId)) byProject.set(r.projectId, new Map());
    byProject.get(r.projectId)!.set(r.weekStart, r.count);
  }
  const out: Record<string, number[]> = {};
  for (const [projectId, weekMap] of byProject) {
    out[projectId] = weekStarts.map((w) => weekMap.get(w) ?? 0);
  }
  return out;
}

async function bumpFocus(projectId: string, delta: number): Promise<number> {
  const user = await requireUser();
  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true } });
  if (!project) throw new Error("NOT_FOUND");

  const weekStart = currentWeekStart();
  const existing = await prisma.projectFocusLog.findUnique({
    where: { projectId_weekStart: { projectId, weekStart } },
  });
  const next = Math.max(0, (existing?.count ?? 0) + delta);

  const row = await prisma.projectFocusLog.upsert({
    where: { projectId_weekStart: { projectId, weekStart } },
    create: { projectId, weekStart, count: next },
    update: { count: next },
  });
  return row.count;
}

export async function incFocus(projectId: string): Promise<number> {
  return bumpFocus(projectId, 1);
}

export async function decFocus(projectId: string): Promise<number> {
  return bumpFocus(projectId, -1);
}
