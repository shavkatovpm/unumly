import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  refreshQuickListSummary,
  sendDebtReminder,
  sendQuickListSummary,
  sendTaskReminder,
} from "@/lib/telegram-bot";
import { computeNotifyAt } from "@/lib/notify-time";
import { purgeExpiredTrash } from "@/lib/plans-actions";

export const runtime = "nodejs";
// Cron pings frequently — make sure Vercel doesn't cache this
export const dynamic = "force-dynamic";

const APP_URL = "https://www.unumly.uz/bugun";
const DEBT_URL = "https://www.unumly.uz/moliya";

// Window: how far in the past we still consider "due" (in case the cron
// was delayed or skipped). The cron runs every 10 minutes, so the window
// must exceed one interval or due reminders would slip between ticks.
// 21 minutes ≈ 2× the interval + jitter: it absorbs a single skipped tick
// while still skipping reminders that are too stale to be useful.
const WINDOW_MS = 21 * 60 * 1000;

// How long a Tezkor list stays "open" (accumulating new bot items) after
// the most recent message. Once exceeded, cron closes it and sends summary.
// NOTE: actual close timing also depends on cron frequency (every 10 min),
// so the practical window is [TEZKOR_IDLE_MS, TEZKOR_IDLE_MS + 10 min].
const TEZKOR_IDLE_MS = 20 * 1000;

/**
 * GET /api/cron/notify
 *
 * Called by an external scheduler (cron-job.org) every 10 minutes.
 * Requires Authorization: Bearer ${CRON_SECRET}.
 *
 * Scans plans whose notifyAt fell within [now-21min, now], filters by
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
      // Actual minutes until the task's scheduled time (not the nominal lead).
      // A task created after its lead window, or a cron tick that fired late,
      // would otherwise always claim the configured lead ("10 daq. qoldi")
      // even when the time has already arrived. Compute the real remaining
      // time so the header shows "X daq. qoldi" or "vaqti keldi" accurately.
      const scheduledAt = computeNotifyAt(plan.scheduledFor, plan.time, 0);
      const minutesLeft = scheduledAt
        ? Math.round((scheduledAt.getTime() - now.getTime()) / 60_000)
        : undefined;
      const messageId = await sendTaskReminder({
        chatId,
        title: plan.title,
        time: plan.time,
        priority: plan.priority,
        minutesLeft,
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

  // ── Qarz: muddati yetgan qarzlar uchun bot eslatmasi ──
  const debtResult = await processDueDebts();

  // ── Eski trash tozalash (30 kundan oshgan o'chirilgan rejalar) ──
  // Avval har listPlans'da edi (sekin); endi shu yerda — DB allaqachon uyg'oq.
  let purgedTrash = 0;
  try { purgedTrash = await purgeExpiredTrash(); } catch { /* ignore */ }

  return NextResponse.json({
    ok: true,
    scanned: due.length,
    sent,
    failed,
    tezkor: tezkorResult,
    debts: debtResult,
    purgedTrash,
  });
}

/** Muddati [now-WINDOW, now] oralig'iga tushgan, hali eslatilmagan va hal
 *  qilinmagan qarzlar uchun bot eslatmasi yuboradi va notifiedAt qo'yadi. */
async function processDueDebts() {
  const now = new Date();
  const earliest = new Date(now.getTime() - WINDOW_MS);
  const due = await prisma.debt.findMany({
    where: {
      settledAt: null,
      notifiedAt: null,
      agendaReminder: true,
      notifyAt: { gt: earliest, lte: now },
    },
    include: { user: { select: { telegramId: true } } },
    take: 100,
  });

  let sent = 0;
  let failed = 0;
  for (const d of due) {
    const outstanding = Number(d.amount) - Number(d.paidAmount);
    try {
      if (outstanding > 0) {
        await sendDebtReminder({
          chatId: Number(d.user.telegramId),
          type: d.type,
          counterparty: d.counterparty,
          outstanding,
          dueDate: d.dueDate,
          leadDays: d.reminderLeadDays,
          appUrl: DEBT_URL,
        });
        sent++;
      }
      await prisma.debt.update({ where: { id: d.id }, data: { notifiedAt: new Date() } });
    } catch (err) {
      console.error(`debt reminder ${d.id} failed`, err);
      await prisma.debt
        .update({ where: { id: d.id }, data: { notifiedAt: new Date() } })
        .catch(() => { /* ignore */ });
      failed++;
    }
  }
  return { scanned: due.length, sent, failed };
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
