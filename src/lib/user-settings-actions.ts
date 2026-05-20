"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export type NotificationPrefs = {
  notifyLow: boolean;
  notifyMedium: boolean;
  notifyHigh: boolean;
};

export async function getNotificationPrefs(): Promise<NotificationPrefs | null> {
  const u = await getSessionUser();
  if (!u) return null;
  return {
    notifyLow: u.notifyLow,
    notifyMedium: u.notifyMedium,
    notifyHigh: u.notifyHigh,
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
      ...(patch.notifyLow    !== undefined && { notifyLow:    patch.notifyLow }),
      ...(patch.notifyMedium !== undefined && { notifyMedium: patch.notifyMedium }),
      ...(patch.notifyHigh   !== undefined && { notifyHigh:   patch.notifyHigh }),
    },
    select: { notifyLow: true, notifyMedium: true, notifyHigh: true },
  });
  return updated;
}
