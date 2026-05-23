import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  refreshQuickListSummary,
  sendQuickListSummary,
  sendTaskReminder,
} from "@/lib/telegram-bot";

export const runtime = "nodejs";
// Cron pings frequently — make sure Vercel doesn't cache this
export const dynamic = "force-dynamic";

const APP_URL = "https://www.unumly.uz/bugun";

// Window: how far in the past we still consider "due" (in case the cron
// was delayed or skipped). 2 minutes is a safe default for 1-minute cron.
const WINDOW_MS = 2 * 60 * 1000;

// How long a Tezkor list stays "open" (accumulating new bot items) after
// the most recent message. Once exceeded, cron closes it and sends summary.
// NOTE: actual close timing also depends on cron frequency (typically 1
// min), so the practical window is [TEZKOR_IDLE_MS, TEZKOR_IDLE_MS + 60s].
const TEZKOR_IDLE_MS = 20 * 1000;

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
        // Effective lead: per-task override (if set) takes precedence over
        // the user's account default. Mirrors the value used to compute
        // notifyAt so the "X daq. qoldi" hint is accurate.
        leadMin: plan.notifyLeadMin ?? plan.user.notifyLeadMin,
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

  // ── Tezkor: close stale open lists and send their summary ──
  const tezkorResult = await processStaleQuickLists();

  return NextResponse.json({
    ok: true,
    scanned: due.length,
    sent,
    failed,
    tezkor: tezkorResult,
  });
}

/** Find every bot-created QuickList that has been idle for > TEZKOR_IDLE_MS,
 *  close it, and send the summary (or edit the existing one if "Davom etish"
 *  was pressed earlier and new items were added). Empty lists are silently
 *  dropped. App/web-created lists are NEVER processed — they don't have a
 *  "draft" lifecycle and the user doesn't expect a bot summary for them. */
async function processStaleQuickLists() {
  const cutoff = new Date(Date.now() - TEZKOR_IDLE_MS);
  const stale = await prisma.quickList.findMany({
    where: {
      source: "bot",
      closedAt: null,
      deletedAt: null,
      updatedAt: { lt: cutoff },
    },
    include: {
      user: { select: { telegramId: true } },
      items: { orderBy: { order: "asc" }, select: { text: true } },
    },
    take: 50, // per-tick cap
  });

  let closed = 0;
  let summarised = 0;
  let dropped = 0;

  for (const list of stale) {
    try {
      const now = new Date();
      if (list.items.length === 0) {
        await prisma.quickList.update({
          where: { id: list.id },
          data: { closedAt: now, deletedAt: now },
        });
        dropped++;
        continue;
      }

      const chatId = Number(list.user.telegramId);
      if (list.summaryChatId && list.summaryMessageId) {
        // List was previously summarised, user pressed "Davom etish" and
        // added more items. Edit the existing message in place rather than
        // spamming a new one.
        await refreshQuickListSummary({
          chatId: Number(list.summaryChatId),
          messageId: list.summaryMessageId,
          listId: list.id,
          name: list.name,
          items: list.items,
        });
        await prisma.quickList.update({
          where: { id: list.id },
          data: { closedAt: now },
        });
      } else {
        const messageId = await sendQuickListSummary({
          chatId,
          listId: list.id,
          name: list.name,
          items: list.items,
        });
        await prisma.quickList.update({
          where: { id: list.id },
          data: {
            closedAt: now,
            summaryChatId: BigInt(chatId),
            summaryMessageId: messageId,
          },
        });
      }
      summarised++;
    } catch (err) {
      console.error(`tezkor close ${list.id} failed`, err);
      await prisma.quickList
        .update({
          where: { id: list.id },
          data: { closedAt: new Date() },
        })
        .catch(() => { /* ignore */ });
    }
    closed++;
  }

  return { closed, summarised, dropped };
}
