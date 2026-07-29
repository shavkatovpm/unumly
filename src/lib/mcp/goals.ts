import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { McpNotFoundError, withMcpErrors } from "@/lib/mcp/errors";

/**
 * MCP qatlami — src/lib/goals-actions.ts'ning bir qismi (o'qish to'liq,
 * yozish tor: daraxt yaratish + step done/title). UI'dagi granular
 * amallar (subGoal/step qayta tartiblash, step'ni kalendarga bog'lash/
 * uzish — scheduleStep/unscheduleStep) v1'da MCP'ga chiqarilmagan —
 * bular sof UI-interaktsiya, LLM caller uchun ustuvor emas deb topildi.
 */

export type McpGoalStatus = "ACTIVE" | "DONE" | "ARCHIVED";

export type McpGoalStep = { id: string; title: string; done: boolean; order: number; scheduledFor: string | null; time: string | null };
export type McpSubGoal = { id: string; title: string; order: number; steps: McpGoalStep[] };
export type McpGoal = {
  id: string;
  title: string;
  icon: string | null;
  deadline: string | null;
  status: McpGoalStatus;
  order: number;
  createdAt: string;
  subGoals: McpSubGoal[];
};

const GOAL_INCLUDE = {
  subGoals: {
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      steps: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { plan: { select: { id: true, scheduledFor: true, time: true } } },
      },
    },
  },
} satisfies Prisma.GoalInclude;

type DbGoalFull = Prisma.GoalGetPayload<{ include: typeof GOAL_INCLUDE }>;

function toGoal(g: DbGoalFull): McpGoal {
  return {
    id: g.id,
    title: g.title,
    icon: g.icon,
    deadline: g.deadline,
    status: g.status as McpGoalStatus,
    order: g.order,
    createdAt: g.createdAt.toISOString(),
    subGoals: g.subGoals.map((s) => ({
      id: s.id,
      title: s.title,
      order: s.order,
      steps: s.steps.map((st) => ({
        id: st.id,
        title: st.title,
        done: st.done,
        order: st.order,
        scheduledFor: st.plan?.scheduledFor ?? null,
        time: st.plan?.time ?? null,
      })),
    })),
  };
}

async function returnGoal(ownerUserId: string, id: string): Promise<McpGoal> {
  const g = await prisma.goal.findFirst({ where: { id, userId: ownerUserId }, include: GOAL_INCLUDE });
  if (!g) throw new McpNotFoundError(`Maqsad topilmadi yoki sizga tegishli emas: ${id}`);
  return toGoal(g);
}

/* ─── list_goals ──────────────────────────────────────────── */

async function listGoalsImpl(ownerUserId: string): Promise<{ goals: McpGoal[] }> {
  const rows = await prisma.goal.findMany({
    where: { userId: ownerUserId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: GOAL_INCLUDE,
  });
  return { goals: rows.map(toGoal) };
}

export const mcpListGoals = withMcpErrors(listGoalsImpl);

/* ─── create_goal (ixtiyoriy to'liq daraxt bilan) ─────────── */

export type McpCreateGoalInput = {
  id?: string;
  title: string;
  icon?: string;
  deadline?: string;
  subGoals?: Array<{ title: string; steps?: Array<{ title: string }> }>;
};

async function createGoalImpl(ownerUserId: string, input: McpCreateGoalInput): Promise<{ goal: McpGoal }> {
  const last = await prisma.goal.findFirst({ where: { userId: ownerUserId }, orderBy: { order: "desc" }, select: { order: true } });
  const created = await prisma.goal.create({
    data: {
      id: input.id,
      userId: ownerUserId,
      title: input.title.trim(),
      icon: input.icon ?? null,
      deadline: input.deadline ?? null,
      order: (last?.order ?? -1) + 1,
    },
  });

  for (const [subIdx, sub] of (input.subGoals ?? []).entries()) {
    const createdSub = await prisma.subGoal.create({
      data: { goalId: created.id, title: sub.title.trim(), order: subIdx },
    });
    for (const [stepIdx, step] of (sub.steps ?? []).entries()) {
      await prisma.goalStep.create({
        data: { subGoalId: createdSub.id, title: step.title.trim(), order: stepIdx },
      });
    }
  }

  return { goal: await returnGoal(ownerUserId, created.id) };
}

export const mcpCreateGoal = withMcpErrors(createGoalImpl);

/* ─── create_subgoal / create_step (mavjud maqsadga qo'shish) ─ */

async function createSubgoalImpl(ownerUserId: string, goalId: string, title: string): Promise<{ goal: McpGoal }> {
  const owns = await prisma.goal.findFirst({ where: { id: goalId, userId: ownerUserId }, select: { id: true } });
  if (!owns) throw new McpNotFoundError(`Maqsad topilmadi yoki sizga tegishli emas: ${goalId}`);
  const last = await prisma.subGoal.findFirst({ where: { goalId }, orderBy: { order: "desc" }, select: { order: true } });
  await prisma.subGoal.create({ data: { goalId, title: title.trim(), order: (last?.order ?? -1) + 1 } });
  return { goal: await returnGoal(ownerUserId, goalId) };
}

export const mcpCreateSubgoal = withMcpErrors(createSubgoalImpl);

async function createStepImpl(ownerUserId: string, subGoalId: string, title: string): Promise<{ goal: McpGoal }> {
  const sub = await prisma.subGoal.findFirst({ where: { id: subGoalId, goal: { userId: ownerUserId } }, select: { goalId: true } });
  if (!sub) throw new McpNotFoundError(`Kichik maqsad topilmadi yoki sizga tegishli emas: ${subGoalId}`);
  const last = await prisma.goalStep.findFirst({ where: { subGoalId }, orderBy: { order: "desc" }, select: { order: true } });
  await prisma.goalStep.create({ data: { subGoalId, title: title.trim(), order: (last?.order ?? -1) + 1 } });
  return { goal: await returnGoal(ownerUserId, sub.goalId) };
}

export const mcpCreateStep = withMcpErrors(createStepImpl);

/* ─── update_goal ─────────────────────────────────────────── */

export type McpUpdateGoalPatch = Partial<{ title: string; icon: string | null; deadline: string | null; status: McpGoalStatus }>;

async function updateGoalImpl(ownerUserId: string, id: string, patch: McpUpdateGoalPatch): Promise<{ goal: McpGoal }> {
  const existing = await prisma.goal.findFirst({ where: { id, userId: ownerUserId }, select: { id: true } });
  if (!existing) throw new McpNotFoundError(`Maqsad topilmadi yoki sizga tegishli emas: ${id}`);
  await prisma.goal.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.icon !== undefined && { icon: patch.icon }),
      ...(patch.deadline !== undefined && { deadline: patch.deadline }),
      ...(patch.status !== undefined && { status: patch.status, archivedAt: patch.status === "ARCHIVED" ? new Date() : null }),
    },
  });
  return { goal: await returnGoal(ownerUserId, id) };
}

export const mcpUpdateGoal = withMcpErrors(updateGoalImpl);

/* ─── update_step (title/done — kalendarga bog'langan bo'lsa sinxron) ─ */

export type McpUpdateStepPatch = Partial<{ title: string; done: boolean }>;

async function updateStepImpl(ownerUserId: string, id: string, patch: McpUpdateStepPatch): Promise<{ goal: McpGoal }> {
  const step = await prisma.goalStep.findFirst({
    where: { id, subGoal: { goal: { userId: ownerUserId } } },
    select: { id: true, plan: { select: { id: true } }, subGoal: { select: { goalId: true } } },
  });
  if (!step) throw new McpNotFoundError(`Qadam topilmadi yoki sizga tegishli emas: ${id}`);

  await prisma.goalStep.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.done !== undefined && { done: patch.done }),
    },
  });

  if (patch.title !== undefined && step.plan) {
    await prisma.plan.update({ where: { id: step.plan.id }, data: { title: patch.title.trim() } });
  }
  if (patch.done !== undefined && step.plan) {
    await prisma.plan.update({
      where: { id: step.plan.id },
      data: { status: patch.done ? "DONE" : "TODO", completedAt: patch.done ? new Date() : null },
    });
  }

  return { goal: await returnGoal(ownerUserId, step.subGoal.goalId) };
}

export const mcpUpdateStep = withMcpErrors(updateStepImpl);

/* ─── delete_subgoal ──────────────────────────────────────── */
// ON DELETE CASCADE: steps → bog'langan occurrence Plan'lar.

async function deleteSubgoalImpl(ownerUserId: string, id: string): Promise<{ id: string; title: string }> {
  const existing = await prisma.subGoal.findFirst({ where: { id, goal: { userId: ownerUserId } } });
  if (!existing) throw new McpNotFoundError(`Kichik maqsad topilmadi yoki sizga tegishli emas: ${id}`);
  await prisma.subGoal.delete({ where: { id } });
  return { id: existing.id, title: existing.title };
}

export const mcpDeleteSubgoal = withMcpErrors(deleteSubgoalImpl);

/* ─── delete_step ─────────────────────────────────────────── */
// ON DELETE CASCADE: bog'langan occurrence Plan (kalendarga belgilangan bo'lsa).

async function deleteStepImpl(ownerUserId: string, id: string): Promise<{ id: string; title: string }> {
  const existing = await prisma.goalStep.findFirst({ where: { id, subGoal: { goal: { userId: ownerUserId } } } });
  if (!existing) throw new McpNotFoundError(`Qadam topilmadi yoki sizga tegishli emas: ${id}`);
  await prisma.goalStep.delete({ where: { id } });
  return { id: existing.id, title: existing.title };
}

export const mcpDeleteStep = withMcpErrors(deleteStepImpl);

/* ─── delete_goal ─────────────────────────────────────────── */
// ON DELETE CASCADE: subGoals → steps → bog'langan occurrence Plan'lar.

async function deleteGoalImpl(ownerUserId: string, id: string): Promise<{ id: string; title: string }> {
  const existing = await prisma.goal.findFirst({ where: { id, userId: ownerUserId } });
  if (!existing) throw new McpNotFoundError(`Maqsad topilmadi yoki sizga tegishli emas: ${id}`);
  await prisma.goal.deleteMany({ where: { id, userId: ownerUserId } });
  return { id: existing.id, title: existing.title };
}

export const mcpDeleteGoal = withMcpErrors(deleteGoalImpl);
