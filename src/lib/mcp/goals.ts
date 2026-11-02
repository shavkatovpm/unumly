import "server-only";

import { prisma } from "@/lib/prisma";
import { recomputeHorizonGoal, setHorizonGoalDoneDeep, setHorizonStepDoneDeep } from "@/lib/horizon-goal-sync";
import { parentHorizon, periodStartOf, todayIso } from "@/lib/horizon-goals";
import { McpNotFoundError, withMcpErrors } from "@/lib/mcp/errors";
import type { GoalHorizon } from "@/lib/types";

/* MCP qatlami — davriy maqsadlar (src/lib/horizon-goals-actions.ts bilan bir
   xil qoidalar). Yil → 3 oy → Oy → Hafta; qadamni kalendarga bog'lash — sof
   UI amali, MCP'ga chiqarilmagan. */

export type McpGoalStep = { id: string; title: string; done: boolean; order: number; scheduledFor: string | null };
export type McpGoal = {
  id: string;
  horizon: GoalHorizon;
  periodStart: string;
  title: string;
  done: boolean;
  parentId: string | null;
  steps: McpGoalStep[];
};

const GOAL_INCLUDE = {
  steps: {
    orderBy: [{ order: "asc" as const }, { createdAt: "asc" as const }],
    include: { plan: { select: { scheduledFor: true, deletedAt: true } } },
  },
};

type DbGoal = {
  id: string; horizon: GoalHorizon; periodStart: string; title: string; done: boolean; parentId: string | null;
  steps: { id: string; title: string; done: boolean; order: number; plan: { scheduledFor: string; deletedAt: Date | null } | null }[];
};

function toGoal(g: DbGoal): McpGoal {
  return {
    id: g.id, horizon: g.horizon, periodStart: g.periodStart, title: g.title, done: g.done, parentId: g.parentId,
    steps: g.steps.map((s) => ({
      id: s.id, title: s.title, done: s.done, order: s.order,
      scheduledFor: s.plan && !s.plan.deletedAt ? s.plan.scheduledFor : null,
    })),
  };
}

async function returnGoal(ownerUserId: string, id: string): Promise<{ goal: McpGoal }> {
  const g = await prisma.horizonGoal.findFirst({ where: { id, userId: ownerUserId }, include: GOAL_INCLUDE });
  if (!g) throw new McpNotFoundError(`Maqsad topilmadi yoki sizga tegishli emas: ${id}`);
  return { goal: toGoal(g) };
}

async function checkedParent(ownerUserId: string, horizon: GoalHorizon, parentId?: string | null): Promise<string | null> {
  if (!parentId) return null;
  const expected = parentHorizon(horizon);
  const p = expected && await prisma.horizonGoal.findFirst({ where: { id: parentId, userId: ownerUserId, horizon: expected }, select: { id: true } });
  if (!p) throw new McpNotFoundError(`parentId bir pog'ona yuqoridagi o'z maqsadingiz bo'lishi kerak: ${parentId}`);
  return p.id;
}

async function ownedStep(ownerUserId: string, id: string) {
  const step = await prisma.horizonGoalStep.findFirst({
    where: { id, goal: { userId: ownerUserId } },
    select: { id: true, goalId: true, plan: { select: { id: true, deletedAt: true } } },
  });
  if (!step) throw new McpNotFoundError(`Qadam topilmadi yoki sizga tegishli emas: ${id}`);
  return step;
}

export const mcpListGoals = withMcpErrors(async (ownerUserId: string, filter: { horizon?: GoalHorizon; date?: string }): Promise<{ goals: McpGoal[] }> => {
  const rows = await prisma.horizonGoal.findMany({
    where: {
      userId: ownerUserId,
      ...(filter.horizon && { horizon: filter.horizon }),
      ...(filter.horizon && filter.date && { periodStart: periodStartOf(filter.horizon, filter.date) }),
    },
    orderBy: [{ periodStart: "desc" }, { order: "asc" }],
    include: GOAL_INCLUDE,
  });
  return { goals: rows.map(toGoal) };
});

export const mcpCreateGoal = withMcpErrors(async (ownerUserId: string, input: {
  horizon: GoalHorizon; title: string; date?: string; parentId?: string; steps?: string[];
}): Promise<{ goal: McpGoal }> => {
  const periodStart = periodStartOf(input.horizon, input.date ?? todayIso());
  const parentId = await checkedParent(ownerUserId, input.horizon, input.parentId);
  const last = await prisma.horizonGoal.findFirst({
    where: { userId: ownerUserId, horizon: input.horizon, periodStart },
    orderBy: { order: "desc" }, select: { order: true },
  });
  const created = await prisma.horizonGoal.create({
    data: {
      userId: ownerUserId, horizon: input.horizon, periodStart, parentId,
      title: input.title.trim(), order: (last?.order ?? -1) + 1,
      steps: { create: (input.steps ?? []).map((title, order) => ({ title: title.trim(), order })) },
    },
  });
  return returnGoal(ownerUserId, created.id);
});

export const mcpUpdateGoal = withMcpErrors(async (ownerUserId: string, id: string, patch: {
  title?: string; done?: boolean; parentId?: string | null;
}): Promise<{ goal: McpGoal }> => {
  const g = await prisma.horizonGoal.findFirst({ where: { id, userId: ownerUserId }, select: { horizon: true } });
  if (!g) throw new McpNotFoundError(`Maqsad topilmadi yoki sizga tegishli emas: ${id}`);
  await prisma.horizonGoal.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.parentId !== undefined && { parentId: await checkedParent(ownerUserId, g.horizon, patch.parentId) }),
    },
  });
  if (patch.done !== undefined) await setHorizonGoalDoneDeep(id, patch.done);
  return returnGoal(ownerUserId, id);
});

export const mcpDeleteGoal = withMcpErrors(async (ownerUserId: string, id: string): Promise<{ deleted: true }> => {
  const { count } = await prisma.horizonGoal.deleteMany({ where: { id, userId: ownerUserId } });
  if (!count) throw new McpNotFoundError(`Maqsad topilmadi yoki sizga tegishli emas: ${id}`);
  return { deleted: true };
});

export const mcpCreateStep = withMcpErrors(async (ownerUserId: string, goalId: string, title: string): Promise<{ goal: McpGoal }> => {
  const g = await prisma.horizonGoal.findFirst({ where: { id: goalId, userId: ownerUserId }, select: { id: true } });
  if (!g) throw new McpNotFoundError(`Maqsad topilmadi yoki sizga tegishli emas: ${goalId}`);
  const last = await prisma.horizonGoalStep.findFirst({ where: { goalId }, orderBy: { order: "desc" }, select: { order: true } });
  await prisma.horizonGoalStep.create({ data: { goalId, title: title.trim(), order: (last?.order ?? -1) + 1 } });
  await recomputeHorizonGoal(goalId);
  return returnGoal(ownerUserId, goalId);
});

export const mcpUpdateStep = withMcpErrors(async (ownerUserId: string, id: string, patch: { title?: string; done?: boolean }): Promise<{ goal: McpGoal }> => {
  const step = await ownedStep(ownerUserId, id);
  if (patch.title !== undefined) {
    await prisma.horizonGoalStep.update({ where: { id }, data: { title: patch.title.trim() } });
    if (step.plan && !step.plan.deletedAt) {
      await prisma.plan.update({ where: { id: step.plan.id }, data: { title: patch.title.trim() } });
    }
  }
  if (patch.done !== undefined) await setHorizonStepDoneDeep(id, patch.done);
  return returnGoal(ownerUserId, step.goalId);
});

export const mcpDeleteStep = withMcpErrors(async (ownerUserId: string, id: string): Promise<{ goal: McpGoal }> => {
  const step = await ownedStep(ownerUserId, id);
  await prisma.horizonGoalStep.delete({ where: { id } });
  await recomputeHorizonGoal(step.goalId);
  return returnGoal(ownerUserId, step.goalId);
});
