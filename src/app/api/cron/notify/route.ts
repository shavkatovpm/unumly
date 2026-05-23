import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendQuickListSummary, sendTaskReminder } from "@/lib/telegram-bot";

export const runtime = "nodejs";
// Cron pings frequently — make sure Vercel doesn't cache this
export const dynamic = "force-dynamic";

const APP_URL = "https://www.unumly.uz/bugun";

// Window: how far in the past we still consider "due" (in case the cron
// was delayed or skipped). 2 minutes is a safe default for 1-minute cron.
const WINDOW_MS = 2 * 60 * 1000;

// How long a Tezkor list stays "open" (accumulating new bot items) after
// the most recent message. Once exceeded, cron closes it and sends summary.
const TEZKOR_IDLE_MS = 3 * 60 * 1000;

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

/** Find every QuickList that has been idle for > TEZKOR_IDLE_MS, close it,
 *  and send the summary message (with [Nom kiritish] [O'chirish] buttons).
 *  Empty lists are silently dropped — no message needed. */
async function processStaleQuickLists() {
  const cutoff = new Date(Date.now() - TEZKOR_IDLE_MS);
  const stale = await prisma.quickList.findMany({
    where: {
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
        // Empty open list — close silently (also drop it to keep storage clean).
        await prisma.quickList.update({
          where: { id: list.id },
          data: { closedAt: now, deletedAt: now },
        });
        dropped++;
        continue;
      }

      const chatId = Number(list.user.telegramId);
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
      summarised++;
    } catch (err) {
      console.error(`tezkor close ${list.id} failed`, err);
      // Defensive: still close so we don't retry forever
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
