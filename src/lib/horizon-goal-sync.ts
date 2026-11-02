import "server-only";

import { prisma } from "@/lib/prisma";

/* Maqsadlar holati sinxronlash. Yuqoriga: pastdagisi bajarilsa manbasi ham.
   Pastga: maqsad belgilansa qadamlari, tasklari va o'tkazilganlari ham. */

const MAX_DEPTH = 6; // Yil → 3 oy → Oy → Hafta → qadam → task

/** Maqsad holatini ichidagilardan chiqaradi va manbasiga uzatadi: qadamlari
 *  bo'lsa — qadamlar; bo'lmasa — o'tkazilgan maqsadlar va kunlik task. */
export async function recomputeHorizonGoal(goalId: string, depth = 0): Promise<void> {
  if (depth > MAX_DEPTH) return;
  const g = await prisma.horizonGoal.findUnique({
    where: { id: goalId },
    select: {
      steps: { select: { done: true } },
      children: { where: { sourceStepId: null }, select: { done: true } },
      plan: { select: { status: true, deletedAt: true } },
    },
  });
  if (!g) return;
  const items = g.steps.length
    ? g.steps.map((s) => s.done)
    : [...g.children.map((c) => c.done), ...(g.plan && !g.plan.deletedAt ? [g.plan.status === "DONE"] : [])];
  if (items.length === 0) return;
  await prisma.horizonGoal.update({ where: { id: goalId }, data: { done: items.every(Boolean) } });
  await propagateUp(goalId, depth);
}

/** Maqsad o'zgargach, u o'tkazilgan manbani yangilaydi. */
async function propagateUp(goalId: string, depth: number): Promise<void> {
  const g = await prisma.horizonGoal.findUnique({ where: { id: goalId }, select: { parentId: true, sourceStepId: true } });
  if (g?.sourceStepId) {
    const siblings = await prisma.horizonGoal.findMany({ where: { sourceStepId: g.sourceStepId }, select: { done: true } });
    const step = await prisma.horizonGoalStep.update({
      where: { id: g.sourceStepId },
      data: { done: siblings.every((s) => s.done) },
      select: { goalId: true },
    });
    await recomputeHorizonGoal(step.goalId, depth + 1);
  } else if (g?.parentId) {
    await recomputeHorizonGoal(g.parentId, depth + 1);
  }
}

async function markGoalDown(goalId: string, done: boolean, depth: number): Promise<void> {
  if (depth > MAX_DEPTH) return;
  await prisma.horizonGoal.update({ where: { id: goalId }, data: { done } });
  await prisma.horizonGoalStep.updateMany({ where: { goalId }, data: { done } });
  await prisma.plan.updateMany({
    where: {
      OR: [{ horizonGoalId: goalId }, { horizonStep: { goalId } }],
      status: { in: done ? ["TODO", "IN_PROGRESS"] : ["DONE"] },
    },
    data: { status: done ? "DONE" : "TODO", completedAt: done ? new Date() : null },
  });
  const children = await prisma.horizonGoal.findMany({
    where: { OR: [{ parentId: goalId }, { sourceStep: { goalId } }] },
    select: { id: true },
  });
  for (const c of children) await markGoalDown(c.id, done, depth + 1);
}

/** Foydalanuvchi maqsadni belgiladi: pastga ham, manbasiga ham. */
export async function setHorizonGoalDoneDeep(goalId: string, done: boolean): Promise<void> {
  await markGoalDown(goalId, done, 0);
  await propagateUp(goalId, 0);
}

/** Foydalanuvchi qadamni belgiladi: task va o'tkazilgan maqsadlar ham. */
export async function setHorizonStepDoneDeep(stepId: string, done: boolean): Promise<void> {
  const step = await prisma.horizonGoalStep.update({
    where: { id: stepId },
    data: { done },
    select: { goalId: true, childGoals: { select: { id: true } } },
  });
  await prisma.plan.updateMany({
    where: { horizonStepId: stepId, status: { in: done ? ["TODO", "IN_PROGRESS"] : ["DONE"] } },
    data: { status: done ? "DONE" : "TODO", completedAt: done ? new Date() : null },
  });
  for (const c of step.childGoals) await markGoalDown(c.id, done, 1);
  await recomputeHorizonGoal(step.goalId);
}

/** Bugundagi task bajarilganda (ilova yoki bot) bog'langan qadamni yangilaydi. */
export async function syncHorizonStepDone(stepId: string, done: boolean): Promise<void> {
  const step = await prisma.horizonGoalStep.update({ where: { id: stepId }, data: { done }, select: { goalId: true } });
  await recomputeHorizonGoal(step.goalId);
}

/** Bugunga o'tkazilgan maqsad taski bajarilganda maqsadning o'zi ham bajariladi. */
export async function syncHorizonGoalDone(goalId: string, done: boolean): Promise<void> {
  await setHorizonGoalDoneDeep(goalId, done);
}
