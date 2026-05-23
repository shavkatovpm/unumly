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

  // Lead-time changed → recompute notifyAt for every TODO plan that hasn't
  // been notified yet, so the new setting takes effect immediately for
  // upcoming reminders. Already-fired (notifiedAt set) reminders are left
  // alone — they won't re-send.
  if (nextLeadMin !== undefined) {
    const pending = await prisma.plan.findMany({
      where: {
        userId: u.id,
        status: "TODO",
        deletedAt: null,
        notifiedAt: null,
        time: { not: null },
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
