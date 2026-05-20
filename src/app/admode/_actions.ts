"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  changeAdminPassword as changeAdminPasswordImpl,
  clearAdminCookie,
  isAdminAuthed,
  setAdminCookie,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { sendMessage } from "@/lib/telegram-bot";

/* ─── Login ─────────────────────────────────────────────── */

export type LoginState = { error?: string } | null;

export async function loginAdmin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const pw = String(formData.get("password") ?? "");
  if (!pw) return { error: "Parolni kiriting" };
  const ok = await verifyAdminPassword(pw);
  if (!ok) {
    return { error: "Parol noto'g'ri" };
  }
  await setAdminCookie();
  redirect("/admode");
}

export async function logoutAdmin() {
  await clearAdminCookie();
  redirect("/admode");
}

/* ─── Change password ──────────────────────────────────── */

export type ChangePwState = { error?: string; success?: boolean } | null;

export async function changeAdminPassword(
  _prev: ChangePwState,
  formData: FormData,
): Promise<ChangePwState> {
  await requireAdmin();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next !== confirm) {
    return { error: "Yangi parollar mos kelmadi" };
  }
  const r = await changeAdminPasswordImpl(current, next);
  if (!r.ok) return { error: r.error || "Xatolik" };
  return { success: true };
}

/* ─── Announcement ─────────────────────────────────────── */

export type AnnounceTarget =
  | { type: "all" }
  | { type: "active" }   // oxirgi 7 kunda faol
  | { type: "ids"; ids: string[] };

export type AnnounceResult = {
  ok: boolean;
  sent: number;
  failed: number;
  error?: string;
};

async function requireAdmin() {
  const ok = await isAdminAuthed();
  if (!ok) throw new Error("UNAUTHORIZED_ADMIN");
}

/**
 * Bot orqali tanlangan foydalanuvchilarga (yoki barchaga) xabar yuborish.
 * Telegram API ~30 msg/sec limit'iga rioya qilish uchun har xabardan keyin
 * 50ms kutamiz (mayda batchlar uchun yetarli).
 */
export async function sendAnnouncement(
  target: AnnounceTarget,
  message: string,
): Promise<AnnounceResult> {
  await requireAdmin();

  const text = message.trim();
  if (!text) return { ok: false, sent: 0, failed: 0, error: "Bo'sh xabar" };
  if (text.length > 4000) {
    return { ok: false, sent: 0, failed: 0, error: "Xabar 4000 belgidan oshmasin" };
  }

  // Telegram chat_id'lar (= User.telegramId)
  const users = await (async () => {
    if (target.type === "ids") {
      return prisma.user.findMany({
        where: { id: { in: target.ids } },
        select: { telegramId: true },
      });
    }
    if (target.type === "active") {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return prisma.user.findMany({
        where: { lastSeenAt: { gte: since } },
        select: { telegramId: true },
      });
    }
    return prisma.user.findMany({ select: { telegramId: true } });
  })();

  if (users.length === 0) {
    return { ok: false, sent: 0, failed: 0, error: "Hech kim topilmadi" };
  }

  let sent = 0;
  let failed = 0;
  for (const u of users) {
    try {
      await sendMessage({
        chat_id: Number(u.telegramId),
        text,
        parse_mode: "Markdown",
        disable_notification: false,
      });
      sent++;
    } catch {
      failed++;
    }
    // throttle — TG rate limit ~30 msg/sec
    await new Promise((r) => setTimeout(r, 50));
  }

  return { ok: failed === 0, sent, failed };
}
