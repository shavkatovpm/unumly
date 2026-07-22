"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  computeNotifyAt,
  sanitizeLeadMin,
  type LeadMin,
} from "@/lib/notify-time";

export type NotificationPrefs = {
  notifyHigh: boolean;
  notifyMedium: boolean;
  notifyLow: boolean;
  notifyUnprioritized: boolean;
  notifyLeadMin: LeadMin;
};

export type MyProfile = { name: string; photoUrl: string | null };

/** Joriy foydalanuvchining ko'rsatish profili (ism + Telegram rasmi). */
export async function getMyProfile(): Promise<MyProfile | null> {
  const u = await getSessionUser();
  if (!u) return null;
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.username || "Foydalanuvchi";
  return { name, photoUrl: u.photoUrl ?? null };
}

export async function getNotificationPrefs(): Promise<NotificationPrefs | null> {
  const u = await getSessionUser();
  if (!u) return null;
  return {
    notifyHigh: u.notifyHigh,
    notifyMedium: u.notifyMedium,
    notifyLow: u.notifyLow,
    notifyUnprioritized: u.notifyUnprioritized,
    notifyLeadMin: sanitizeLeadMin(u.notifyLeadMin),
  };
}

export async function updateNotificationPrefs(
  patch: Partial<NotificationPrefs>
): Promise<NotificationPrefs> {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");

  const nextLeadMin =
    patch.notifyLeadMin !== undefined
      ? sanitizeLeadMin(patch.notifyLeadMin)
      : undefined;

  const updated = await prisma.user.update({
    where: { id: u.id },
    data: {
      ...(patch.notifyHigh          !== undefined && { notifyHigh:          patch.notifyHigh }),
      ...(patch.notifyMedium        !== undefined && { notifyMedium:        patch.notifyMedium }),
      ...(patch.notifyLow           !== undefined && { notifyLow:           patch.notifyLow }),
      ...(patch.notifyUnprioritized !== undefined && { notifyUnprioritized: patch.notifyUnprioritized }),
      ...(nextLeadMin               !== undefined && { notifyLeadMin:       nextLeadMin }),
    },
    select: {
      notifyHigh: true,
      notifyMedium: true,
      notifyLow: true,
      notifyUnprioritized: true,
      notifyLeadMin: true,
    },
  });

  // Lead-time changed → recompute notifyAt only for TODO plans that:
  //   1. Haven't been notified yet, AND
  //   2. Don't have their own per-task lead override (notifyLeadMin IS NULL).
  // Plans with a per-task override should keep their explicit setting.
  if (nextLeadMin !== undefined) {
    const pending = await prisma.plan.findMany({
      where: {
        userId: u.id,
        status: "TODO",
        deletedAt: null,
        notifiedAt: null,
        time: { not: null },
        notifyLeadMin: null,
      },
      select: { id: true, scheduledFor: true, time: true },
    });
    if (pending.length > 0) {
      await prisma.$transaction(
        pending.map((p) =>
          prisma.plan.update({
            where: { id: p.id },
            data: {
              notifyAt: computeNotifyAt(p.scheduledFor, p.time, nextLeadMin),
            },
          })
        )
      );
    }
  }

  return {
    notifyHigh: updated.notifyHigh,
    notifyMedium: updated.notifyMedium,
    notifyLow: updated.notifyLow,
    notifyUnprioritized: updated.notifyUnprioritized,
    notifyLeadMin: sanitizeLeadMin(updated.notifyLeadMin),
  };
}

/* ─── Loyihalar taqsimoti (Reja bo'limi) sozlamalari ─── */

export type TaqsimotSettings = {
  weeklyCapacity: number[]; // 7 ta son, Du..Ya, soat
  categoryPct: Record<string, number>; // {"A":50,"B":30,"C":15,"D":5}
};

const DEFAULT_WEEKLY_CAPACITY = [12, 12, 12, 12, 12, 4, 4];
const DEFAULT_CATEGORY_PCT: Record<string, number> = { A: 50, B: 30, C: 15, D: 5 };

function sanitizeCapacity(v: unknown): number[] {
  if (!Array.isArray(v) || v.length !== 7) return DEFAULT_WEEKLY_CAPACITY;
  return v.map((n) => (typeof n === "number" && n >= 0 ? n : 0));
}

function sanitizePct(v: unknown): Record<string, number> {
  if (!v || typeof v !== "object") return DEFAULT_CATEGORY_PCT;
  const o = v as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const k of ["A", "B", "C", "D"]) {
    const n = o[k];
    out[k] = typeof n === "number" && n >= 0 ? n : (DEFAULT_CATEGORY_PCT[k] ?? 0);
  }
  return out;
}

export async function getTaqsimotSettings(): Promise<TaqsimotSettings | null> {
  const u = await getSessionUser();
  if (!u) return null;
  return {
    weeklyCapacity: sanitizeCapacity(u.weeklyCapacity),
    categoryPct: sanitizePct(u.categoryPct),
  };
}

export async function updateTaqsimotSettings(
  patch: Partial<TaqsimotSettings>
): Promise<TaqsimotSettings> {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");

  const updated = await prisma.user.update({
    where: { id: u.id },
    data: {
      ...(patch.weeklyCapacity !== undefined && { weeklyCapacity: patch.weeklyCapacity }),
      ...(patch.categoryPct !== undefined && { categoryPct: patch.categoryPct }),
    },
    select: { weeklyCapacity: true, categoryPct: true },
  });

  return {
    weeklyCapacity: sanitizeCapacity(updated.weeklyCapacity),
    categoryPct: sanitizePct(updated.categoryPct),
  };
}
