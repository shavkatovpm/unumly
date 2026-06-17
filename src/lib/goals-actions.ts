"use server";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { computeNotifyAt, sanitizeLeadMin } from "@/lib/notify-time";
import type { Goal, GoalStatus, SubGoal, GoalStep } from "@/lib/types";

/* ─── Auth ─── */
async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}
async function getUserLeadMin(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { notifyLeadMin: true } });
  return sanitizeLeadMin(u?.notifyLeadMin);
}

/* ─── Mappers ─── */
type DbStep = {
  id: string; subGoalId: string; title: string; done: boolean; order: number;
  plan: { id: string; scheduledFor: string; time: string | null; status: string } | null;
};
function toStep(s: DbStep): GoalStep {
  return {
    id: s.id, subGoalId: s.subGoalId, title: s.title, done: s.done, order: s.order,
    scheduledFor: s.plan?.scheduledFor ?? undefined,
    time: s.plan?.time ?? undefined,
    planId: s.plan?.id ?? undefined,
  };
}
type DbSub = { id: string; goalId: string; title: string; order: number; steps: DbStep[] };
function toSub(s: DbSub): SubGoal {
  return { id: s.id, goalId: s.goalId, title: s.title, order: s.order, steps: s.steps.map(toStep) };
}
type DbGoal = {
  id: string; title: string; icon: string | null; deadline: string | null;
  status: string; order: number; archivedAt: Date | null; createdAt: Date; subGoals: DbSub[];
};
function toGoal(g: DbGoal): Goal {
  return {
    id: g.id, title: g.title, icon: g.icon ?? undefined, deadline: g.deadline ?? undefined,
    status: g.status as GoalStatus, order: g.order,
    archivedAt: g.archivedAt ? g.archivedAt.toISOString() : undefined,
    createdAt: g.createdAt.toISOString(),
    subGoals: g.subGoals.map(toSub),
  };
}

const GOAL_INCLUDE = {
  subGoals: {
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      steps: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { plan: { select: { id: true, scheduledFor: true, time: true, status: true } } },
      },
    },
  },
} satisfies Prisma.GoalInclude;

/* ─── Read ─── */
export async function listGoals(): Promise<Goal[]> {
  const user = await requireUser();
  const rows = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: GOAL_INCLUDE,
  });
  return rows.map((g) => toGoal(g as unknown as DbGoal));
}

async function returnGoal(id: string): Promise<Goal> {
  const g = await prisma.goal.findUnique({ where: { id }, include: GOAL_INCLUDE });
  if (!g) throw new Error("NOT_FOUND");
  return toGoal(g as unknown as DbGoal);
}

/* ─── Goal CRUD ─── */
export type CreateGoalInput = { id?: string; title: string; icon?: string | null; deadline?: string | null };
export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const user = await requireUser();
  const last = await prisma.goal.findFirst({ where: { userId: user.id }, orderBy: { order: "desc" }, select: { order: true } });
  const row = await prisma.goal.create({
    data: {
      id: input.id, userId: user.id, title: input.title.trim(),
      icon: input.icon ?? null, deadline: input.deadline ?? null,
      order: (last?.order ?? -1) + 1,
    },
    include: GOAL_INCLUDE,
  });
  return toGoal(row as unknown as DbGoal);
}

export type UpdateGoalPatch = Partial<{ title: string; icon: string | null; deadline: string | null; status: GoalStatus; order: number }>;
export async function updateGoal(id: string, patch: UpdateGoalPatch): Promise<Goal> {
  const user = await requireUser();
  const existing = await prisma.goal.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!existing) throw new Error("NOT_FOUND");
  await prisma.goal.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.icon !== undefined && { icon: patch.icon }),
      ...(patch.deadline !== undefined && { deadline: patch.deadline }),
      ...(patch.order !== undefined && { order: patch.order }),
      ...(patch.status !== undefined && { status: patch.status, archivedAt: patch.status === "ARCHIVED" ? new Date() : null }),
    },
  });
  return returnGoal(id);
}

export async function removeGoal(id: string): Promise<void> {
  const user = await requireUser();
  // Cascade removes subGoals → steps → linked occurrence plans.
  await prisma.goal.deleteMany({ where: { id, userId: user.id } });
}

/* ─── SubGoal CRUD ─── */
async function ownsGoal(userId: string, goalId: string): Promise<boolean> {
  const g = await prisma.goal.findFirst({ where: { id: goalId, userId }, select: { id: true } });
  return !!g;
}
export async function createSubGoal(input: { id?: string; goalId: string; title: string }): Promise<Goal> {
  const user = await requireUser();
  if (!(await ownsGoal(user.id, input.goalId))) throw new Error("NOT_FOUND");
  const last = await prisma.subGoal.findFirst({ where: { goalId: input.goalId }, orderBy: { order: "desc" }, select: { order: true } });
  await prisma.subGoal.create({ data: { id: input.id, goalId: input.goalId, title: input.title.trim(), order: (last?.order ?? -1) + 1 } });
  return returnGoal(input.goalId);
}
export async function updateSubGoal(id: string, patch: { title?: string; order?: number }): Promise<Goal> {
  const user = await requireUser();
  const sub = await prisma.subGoal.findFirst({ where: { id, goal: { userId: user.id } }, select: { goalId: true } });
  if (!sub) throw new Error("NOT_FOUND");
  await prisma.subGoal.update({ where: { id }, data: { ...(patch.title !== undefined && { title: patch.title.trim() }), ...(patch.order !== undefined && { order: patch.order }) } });
  return returnGoal(sub.goalId);
}
export async function removeSubGoal(id: string): Promise<Goal | null> {
  const user = await requireUser();
  const sub = await prisma.subGoal.findFirst({ where: { id, goal: { userId: user.id } }, select: { goalId: true } });
  if (!sub) return null;
  await prisma.subGoal.delete({ where: { id } });
  return returnGoal(sub.goalId);
}

/* ─── Step CRUD + scheduling ─── */
async function stepOwner(userId: string, stepId: string) {
  return prisma.goalStep.findFirst({
    where: { id: stepId, subGoal: { goal: { userId } } },
    select: { id: true, title: true, done: true, plan: { select: { id: true } }, subGoal: { select: { goalId: true } } },
  });
}

export async function createStep(input: { id?: string; subGoalId: string; title: string }): Promise<Goal> {
  const user = await requireUser();
  const sub = await prisma.subGoal.findFirst({ where: { id: input.subGoalId, goal: { userId: user.id } }, select: { goalId: true } });
  if (!sub) throw new Error("NOT_FOUND");
  const last = await prisma.goalStep.findFirst({ where: { subGoalId: input.subGoalId }, orderBy: { order: "desc" }, select: { order: true } });
  await prisma.goalStep.create({ data: { id: input.id, subGoalId: input.subGoalId, title: input.title.trim(), order: (last?.order ?? -1) + 1 } });
  return returnGoal(sub.goalId);
}

export async function updateStep(id: string, patch: { title?: string; order?: number }): Promise<Goal> {
  const user = await requireUser();
  const step = await stepOwner(user.id, id);
  if (!step) throw new Error("NOT_FOUND");
  await prisma.goalStep.update({ where: { id }, data: { ...(patch.title !== undefined && { title: patch.title.trim() }), ...(patch.order !== undefined && { order: patch.order }) } });
  // Keep linked occurrence's title in sync.
  if (patch.title !== undefined && step.plan) {
    await prisma.plan.update({ where: { id: step.plan.id }, data: { title: patch.title.trim() } });
  }
  return returnGoal(step.subGoal.goalId);
}

export async function setStepDone(id: string, done: boolean): Promise<Goal> {
  const user = await requireUser();
  const step = await stepOwner(user.id, id);
  if (!step) throw new Error("NOT_FOUND");
  await prisma.goalStep.update({ where: { id }, data: { done } });
  // Sync the linked occurrence status (so Bugun/Agenda reflect it too).
  if (step.plan) {
    await prisma.plan.update({ where: { id: step.plan.id }, data: { status: done ? "DONE" : "TODO", completedAt: done ? new Date() : null } });
  }
  return returnGoal(step.subGoal.goalId);
}

export async function removeStep(id: string): Promise<Goal | null> {
  const user = await requireUser();
  const step = await stepOwner(user.id, id);
  if (!step) return null;
  await prisma.goalStep.delete({ where: { id } }); // cascade removes its occurrence plan
  return returnGoal(step.subGoal.goalId);
}

/** Qadamni biror kunga (ixtiyoriy vaqt bilan) belgilash — Plan occurrence
 *  yaratadi yoki yangilaydi (goalStepId unique → bitta occurrence). */
export async function scheduleStep(id: string, date: string, time?: string): Promise<Goal> {
  const user = await requireUser();
  const step = await stepOwner(user.id, id);
  if (!step) throw new Error("NOT_FOUND");
  const lead = await getUserLeadMin(user.id);
  const notifyAt = computeNotifyAt(date, time, lead);
  if (step.plan) {
    await prisma.plan.update({
      where: { id: step.plan.id },
      data: { scheduledFor: date, time: time ?? null, notifyAt, notifiedAt: null, status: step.done ? "DONE" : "TODO" },
    });
  } else {
    await prisma.plan.create({
      data: {
        userId: user.id, title: step.title, scope: "DAILY",
        status: step.done ? "DONE" : "TODO", scheduledFor: date, time: time ?? null,
        notifyAt, goalStepId: id, order: 0, completedAt: step.done ? new Date() : null,
      },
    });
  }
  return returnGoal(step.subGoal.goalId);
}

/* ─── Tartiblash (reorder) ─── */
export async function reorderSubGoals(goalId: string, orderedIds: string[]): Promise<Goal> {
  const user = await requireUser();
  if (!(await ownsGoal(user.id, goalId))) throw new Error("NOT_FOUND");
  await prisma.$transaction(orderedIds.map((id, i) => prisma.subGoal.update({ where: { id }, data: { order: i } })));
  return returnGoal(goalId);
}

export async function reorderSteps(subGoalId: string, orderedIds: string[]): Promise<Goal> {
  const user = await requireUser();
  const sub = await prisma.subGoal.findFirst({ where: { id: subGoalId, goal: { userId: user.id } }, select: { goalId: true } });
  if (!sub) throw new Error("NOT_FOUND");
  await prisma.$transaction(orderedIds.map((id, i) => prisma.goalStep.update({ where: { id }, data: { order: i } })));
  return returnGoal(sub.goalId);
}

/** Belgilashni bekor qilish — bog'langan occurrence o'chiriladi. */
export async function unscheduleStep(id: string): Promise<Goal | null> {
  const user = await requireUser();
  const step = await stepOwner(user.id, id);
  if (!step) return null;
  if (step.plan) {
    await prisma.botMessage.deleteMany({ where: { planId: step.plan.id } });
    await prisma.plan.delete({ where: { id: step.plan.id } });
  }
  return returnGoal(step.subGoal.goalId);
}
