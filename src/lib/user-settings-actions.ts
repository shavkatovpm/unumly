"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export type NotificationPrefs = {
  notifyHigh: boolean;
  notifyMedium: boolean;
  notifyLow: boolean;
  notifyUnprioritized: boolean;
};

export async function getNotificationPrefs(): Promise<NotificationPrefs | null> {
  const u = await getSessionUser();
  if (!u) return null;
  return {
    notifyHigh: u.notifyHigh,
    notifyMedium: u.notifyMedium,
    notifyLow: u.notifyLow,
    notifyUnprioritized: u.notifyUnprioritized,
  };
}

export async function updateNotificationPrefs(
  patch: Partial<NotificationPrefs>
): Promise<NotificationPrefs> {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  const updated = await prisma.user.update({
    where: { id: u.id },
    data: {
      ...(patch.notifyHigh          !== undefined && { notifyHigh:          patch.notifyHigh }),
      ...(patch.notifyMedium        !== undefined && { notifyMedium:        patch.notifyMedium }),
      ...(patch.notifyLow           !== undefined && { notifyLow:           patch.notifyLow }),
      ...(patch.notifyUnprioritized !== undefined && { notifyUnprioritized: patch.notifyUnprioritized }),
    },
    select: {
      notifyHigh: true,
      notifyMedium: true,
      notifyLow: true,
      notifyUnprioritized: true,
    },
  });
  return updated;
}
