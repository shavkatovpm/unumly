import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTaskReminder } from "@/lib/telegram-bot";

export const runtime = "nodejs";
// Cron pings frequently — make sure Vercel doesn't cache this
export const dynamic = "force-dynamic";

const APP_URL = "https://www.unumly.uz/bugun";

// Window: how far in the past we still consider "due" (in case the cron
// was delayed or skipped). 2 minutes is a safe default for 1-minute cron.
const WINDOW_MS = 2 * 60 * 1000;

/**
 * GET /api/cron/notify
 *
 * Called by an external scheduler (cron-job.org) once per minute.
 * Requires Authorization: Bearer ${CRON_SECRET}.
 *
 * Scans plans whose notifyAt fell within [now-2min, now], filters by
 * user preferences and priority, sends the reminder via the bot, and
 * marks `notifiedAt` to prevent re-send.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_secret_missing" }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const now = new Date();
  const earliest = new Date(now.getTime() - WINDOW_MS);

  const due = await prisma.plan.findMany({
    where: {
      status: "TODO",
      deletedAt: null,
      notifiedAt: null,
      notifyAt: { gt: earliest, lte: now },
      // Notify if the user has opted in for this task's bucket. By default
      // all four are ON; the user can disable any of them from Settings.
      OR: [
        { priority: "HIGH",   user: { notifyHigh: true } },
        { priority: "MEDIUM", user: { notifyMedium: true } },
        { priority: "LOW",    user: { notifyLow: true } },
        { priority: null,     user: { notifyUnprioritized: true } },
      ],
    },
    include: { user: true },
    take: 100, // per-tick cap; if we ever exceed this, increase or batch
  });

  let sent = 0;
  let failed = 0;

  for (const plan of due) {
    try {
      const chatId = Number(plan.user.telegramId);
      const messageId = await sendTaskReminder({
        chatId,
        planId: plan.id,
        title: plan.title,
        time: plan.time,
        priority: plan.priority,
        appUrl: APP_URL,
      });
      await prisma.$transaction([
        prisma.plan.update({
          where: { id: plan.id },
          data: { notifiedAt: new Date() },
        }),
        prisma.botMessage.create({
          data: {
            planId: plan.id,
            chatId: plan.user.telegramId,
            messageId,
          },
        }),
      ]);
      sent++;
    } catch (err) {
      console.error(`notify plan ${plan.id} failed`, err);
      // Mark notifiedAt so we don't retry forever on a broken send
      await prisma.plan
        .update({ where: { id: plan.id }, data: { notifiedAt: new Date() } })
        .catch(() => { /* ignore */ });
      failed++;
    }
  }

  return NextResponse.json({ ok: true, scanned: due.length, sent, failed });
}
