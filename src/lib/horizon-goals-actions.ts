"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { createPlan } from "@/lib/plans-actions";
import { recomputeHorizonGoal, setHorizonGoalDoneDeep, setHorizonStepDoneDeep } from "@/lib/horizon-goal-sync";
import { lowerHorizon, moveTargetPeriod } from "@/lib/horizon-goals";
import type { GoalHorizon, HorizonGoal } from "@/lib/types";

async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

const PLAN_SELECT = { select: { id: true, scheduledFor: true, deletedAt: true } };
const GOAL_INCLUDE = {
  plan: PLAN_SELECT,
  steps: {
    orderBy: [{ order: "asc" as const }, { createdAt: "asc" as const }],
    include: { plan: PLAN_SELECT },
  },
};

type DbPlan = { id: string; scheduledFor: string; deletedAt: Date | null } | null;
type DbGoal = {
  id: string; horizon: GoalHorizon; periodStart: string; title: string; done: boolean; order: number;
  parentId: string | null; sourceStepId: string | null; plan: DbPlan;
  steps: { id: string; goalId: string; title: string; done: boolean; order: number; plan: DbPlan }[];
};

// O'chirilgan task hisobga olinmaydi — qayta o'tkazsa bo'ladi.
const liveDate = (p: DbPlan) => (p && !p.deletedAt ? p.scheduledFor : undefined);

function toGoal(g: DbGoal): HorizonGoal {
  return {
    id: g.id, horizon: g.horizon, periodStart: g.periodStart, title: g.title, done: g.done, order: g.order,
    parentId: g.parentId ?? undefined, sourceStepId: g.sourceStepId ?? undefined,
    scheduledFor: liveDate(g.plan),
    steps: g.steps.map((s) => ({
      id: s.id, goalId: s.goalId, title: s.title, done: s.done, order: s.order, scheduledFor: liveDate(s.plan),
    })),
  };
}

async function loadGoal(id: string, userId: string): Promise<HorizonGoal> {
  const g = await prisma.horizonGoal.findFirst({ where: { id, userId }, include: GOAL_INCLUDE });
  if (!g) throw new Error("NOT_FOUND");
  return toGoal(g);
}

async function ownedGoal(id: string, userId: string) {
  const g = await prisma.horizonGoal.findFirst({
    where: { id, userId },
    include: { plan: { select: { id: true, deletedAt: true } } },
  });
  if (!g) throw new Error("NOT_FOUND");
  return g;
}

async function ownedStep(stepId: string, userId: string) {
  const step = await prisma.horizonGoalStep.findFirst({
    where: { id: stepId, goal: { userId } },
    include: {
      plan: { select: { id: true, deletedAt: true } },
      goal: { select: { horizon: true, periodStart: true } },
    },
  });
  if (!step) throw new Error("NOT_FOUND");
  return step;
}

async function nextOrder(userId: string, horizon: GoalHorizon, periodStart: string) {
  const last = await prisma.horizonGoal.findFirst({
    where: { userId, horizon, periodStart },
    orderBy: { order: "desc" }, select: { order: true },
  });
  return (last?.order ?? -1) + 1;
}

export async function listHorizonGoals(): Promise<HorizonGoal[]> {
  const user = await requireUser();
  const rows = await prisma.horizonGoal.findMany({
    where: { userId: user.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: GOAL_INCLUDE,
  });
  return rows.map(toGoal);
}

export async function createHorizonGoal(input: { id: string; horizon: GoalHorizon; periodStart: string; title: string }): Promise<HorizonGoal> {
  const user = await requireUser();
  await prisma.horizonGoal.create({
    data: {
      id: input.id, userId: user.id, horizon: input.horizon, periodStart: input.periodStart,
      title: input.title.trim(), order: await nextOrder(user.id, input.horizon, input.periodStart),
    },
  });
  return loadGoal(input.id, user.id);
}

export async function renameHorizonGoal(id: string, title: string): Promise<HorizonGoal> {
  const user = await requireUser();
  const g = await ownedGoal(id, user.id);
  await prisma.horizonGoal.update({ where: { id }, data: { title: title.trim() } });
  if (g.plan && !g.plan.deletedAt) await prisma.plan.update({ where: { id: g.plan.id }, data: { title: title.trim() } });
  return loadGoal(id, user.id);
}

export async function setHorizonGoalDone(id: string, done: boolean): Promise<HorizonGoal> {
  const user = await requireUser();
  await ownedGoal(id, user.id);
  await setHorizonGoalDoneDeep(id, done);
  return loadGoal(id, user.id);
}

export async function removeHorizonGoal(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.horizonGoal.deleteMany({ where: { id, userId: user.id } });
}

/** Maqsadni bir pog'ona pastga o'tkazadi: haftalik — kunlik task, qolgani —
 *  pastki davrda yangi maqsad. Manbasi joyida qoladi. */
export async function moveHorizonGoal(id: string, today: string, childId: string): Promise<HorizonGoal> {
  const user = await requireUser();
  const g = await ownedGoal(id, user.id);
  const lower = lowerHorizon(g.horizon);
  const target = moveTargetPeriod(g.horizon, g.periodStart, today);
  if (lower && target) {
    const exists = await prisma.horizonGoal.findFirst({
      where: { parentId: id, sourceStepId: null, horizon: lower, periodStart: target }, select: { id: true },
    });
    if (!exists) {
      await prisma.horizonGoal.create({
        data: {
          id: childId, userId: user.id, horizon: lower, periodStart: target, title: g.title, parentId: id,
          order: await nextOrder(user.id, lower, target),
        },
      });
    }
  } else if (!g.plan || g.plan.deletedAt) {
    // O'chirilgan eski task bog'lanishni band qilib turmasin (unique).
    if (g.plan) await prisma.plan.update({ where: { id: g.plan.id }, data: { horizonGoalId: null } });
    const plan = await createPlan({ title: g.title, scope: "DAILY", scheduledFor: today });
    await prisma.plan.update({ where: { id: plan.id }, data: { horizonGoalId: id } });
  }
  return loadGoal(id, user.id);
}

export async function addHorizonStep(input: { id: string; goalId: string; title: string }): Promise<HorizonGoal> {
  const user = await requireUser();
  await ownedGoal(input.goalId, user.id);
  const last = await prisma.horizonGoalStep.findFirst({ where: { goalId: input.goalId }, orderBy: { order: "desc" }, select: { order: true } });
  await prisma.horizonGoalStep.create({
    data: { id: input.id, goalId: input.goalId, title: input.title.trim(), order: (last?.order ?? -1) + 1 },
  });
  await recomputeHorizonGoal(input.goalId);
  return loadGoal(input.goalId, user.id);
}

export async function renameHorizonStep(id: string, title: string): Promise<HorizonGoal> {
  const user = await requireUser();
  const step = await ownedStep(id, user.id);
  await prisma.horizonGoalStep.update({ where: { id }, data: { title: title.trim() } });
  if (step.plan && !step.plan.deletedAt) {
    await prisma.plan.update({ where: { id: step.plan.id }, data: { title: title.trim() } });
  }
  return loadGoal(step.goalId, user.id);
}

export async function setHorizonStepDone(id: string, done: boolean): Promise<HorizonGoal> {
  const user = await requireUser();
  const step = await ownedStep(id, user.id);
  await setHorizonStepDoneDeep(id, done);
  return loadGoal(step.goalId, user.id);
}

export async function removeHorizonStep(id: string): Promise<HorizonGoal> {
  const user = await requireUser();
  const step = await ownedStep(id, user.id);
  await prisma.horizonGoalStep.delete({ where: { id } });
  await recomputeHorizonGoal(step.goalId);
  return loadGoal(step.goalId, user.id);
}

/** Qadamni bir pog'ona pastga o'tkazadi (maqsad bilan bir xil qoida). */
export async function moveHorizonStep(id: string, today: string, childId: string): Promise<HorizonGoal> {
  const user = await requireUser();
  const step = await ownedStep(id, user.id);
  const lower = lowerHorizon(step.goal.horizon);
  const target = moveTargetPeriod(step.goal.horizon, step.goal.periodStart, today);
  if (lower && target) {
    const exists = await prisma.horizonGoal.findFirst({
      where: { sourceStepId: id, horizon: lower, periodStart: target }, select: { id: true },
    });
    if (!exists) {
      await prisma.horizonGoal.create({
        data: {
          id: childId, userId: user.id, horizon: lower, periodStart: target, title: step.title, sourceStepId: id,
          order: await nextOrder(user.id, lower, target),
        },
      });
    }
  } else if (!step.plan || step.plan.deletedAt) {
    if (step.plan) await prisma.plan.update({ where: { id: step.plan.id }, data: { horizonStepId: null } });
    const plan = await createPlan({ title: step.title, scope: "DAILY", scheduledFor: today });
    await prisma.plan.update({ where: { id: plan.id }, data: { horizonStepId: id } });
  }
  return loadGoal(step.goalId, user.id);
}
