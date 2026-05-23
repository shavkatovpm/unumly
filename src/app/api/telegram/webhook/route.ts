import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  answerCallbackQuery,
  askForContact,
  editQuickListSummary,
  markReminderDone,
  sendOnboardingComplete,
  sendPlain,
  sendStartWelcome,
  setMessageReaction,
} from "@/lib/telegram-bot";
import { normalisePhone } from "@/lib/phone";
import { issueAndSendOtp, issueOtp } from "@/lib/otp";
import { defaultListName } from "@/lib/tezkor-utils";

export const runtime = "nodejs";

const SECRET_HEADER = "x-telegram-bot-api-secret-token";
const APP_URL = "https://www.unumly.uz/bugun";

// How long a bot-created QuickList stays "open" (accumulating items)
// after the most recent message. Mirrors the cron tick threshold so the
// webhook agrees with the cron on what counts as "still active".
const TEZKOR_WINDOW_MS = 20 * 1000;

type TgUpdate = {
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
};

type TgCallbackQuery = {
  id: string;
  from: TgFrom;
  message?: { message_id: number; chat: { id: number } };
  data?: string;
};

type TgMessage = {
  message_id: number;
  from?: TgFrom;
  chat: { id: number; type: string };
  text?: string;
  contact?: TgContact;
};

type TgFrom = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
};

type TgContact = {
  phone_number: string;
  first_name?: string;
  last_name?: string;
  user_id?: number;       // present only when user shared their own contact
};

export async function POST(req: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const provided = req.headers.get(SECRET_HEADER);
    if (provided !== expected) {
      return new NextResponse("forbidden", { status: 403 });
    }
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return new NextResponse("bad request", { status: 400 });
  }

  if (update.callback_query) {
    return handleCallback(update.callback_query);
  }

  const msg = update.message;
  if (!msg || !msg.from || msg.from.is_bot) {
    return NextResponse.json({ ok: true });
  }

  const from = msg.from;
  const chatId = msg.chat.id;

  try {
    // Contact share → upsert user with phone, then immediately send OTP
    if (msg.contact) {
      const c = msg.contact;
      if (c.user_id !== from.id) {
        await askForContact(chatId);
        return NextResponse.json({ ok: true });
      }
      const phone = normalisePhone(c.phone_number);
      if (!phone) {
        await askForContact(chatId);
        return NextResponse.json({ ok: true });
      }
      const user = await prisma.user.upsert({
        where: { telegramId: BigInt(from.id) },
        update: {
          phone,
          firstName: from.first_name,
          lastName: from.last_name,
          username: from.username,
          languageCode: from.language_code,
          isPremium: from.is_premium ?? false,
          lastSeenAt: new Date(),
        },
        create: {
          telegramId: BigInt(from.id),
          phone,
          firstName: from.first_name,
          lastName: from.last_name,
          username: from.username,
          languageCode: from.language_code,
          isPremium: from.is_premium ?? false,
        },
      });
      // First-time onboarding: send the Mini App button + an OTP code
      // (in case the user is also coming from the website).
      const { code } = await issueOtp({ phone: user.phone });
      await sendOnboardingComplete(chatId, APP_URL, code);
      return NextResponse.json({ ok: true });
    }

    const text = (msg.text ?? "").trim();
    const isStart = text === "/start" || text.startsWith("/start ");

    // /start — explicit command → welcome (or onboarding for new users).
    if (isStart) {
      const param = text.startsWith("/start ") ? text.slice(7).trim() : "";
      const wantsCode = param === "login";

      const existing = await prisma.user.findUnique({
        where: { telegramId: BigInt(from.id) },
      });

      if (existing?.phone) {
        // Cancel any pending "naming" state — a fresh /start resets context.
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            lastSeenAt: new Date(),
            botNamingListId: null,
          },
        });
        if (wantsCode) {
          await issueAndSendOtp({
            telegramId: existing.telegramId,
            phone: existing.phone,
          });
        } else {
          await sendStartWelcome(chatId, APP_URL);
        }
        return NextResponse.json({ ok: true });
      }

      // New user — onboard regardless of deep-link param
      await prisma.user.upsert({
        where: { telegramId: BigInt(from.id) },
        update: { lastSeenAt: new Date() },
        create: {
          telegramId: BigInt(from.id),
          firstName: from.first_name,
          lastName: from.last_name,
          username: from.username,
          languageCode: from.language_code,
          isPremium: from.is_premium ?? false,
        },
      });
      await askForContact(chatId);
      return NextResponse.json({ ok: true });
    }

    // From here on: arbitrary text. Behaviour depends on user state.
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(from.id) },
    });

    // Not registered → keep current onboarding nudge (no Tezkor for guests).
    if (!user?.phone) {
      if (user) {
        // First-time gibberish from a partially-onboarded user → ask for contact
        await askForContact(chatId);
      } else {
        // Unknown user — create row + ask for contact
        await prisma.user.create({
          data: {
            telegramId: BigInt(from.id),
            firstName: from.first_name,
            lastName: from.last_name,
            username: from.username,
            languageCode: from.language_code,
            isPremium: from.is_premium ?? false,
          },
        });
        await askForContact(chatId);
      }
      return NextResponse.json({ ok: true });
    }

    // User is fully registered — touch lastSeenAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    });

    // If user is in "naming" mode, treat this text as the new list name.
    if (user.botNamingListId) {
      const listId = user.botNamingListId;
      const list = await prisma.quickList.findFirst({
        where: { id: listId, userId: user.id, deletedAt: null },
      });
      if (!list) {
        // Stale state — clear it and fall through to Tezkor-add logic below.
        await prisma.user.update({
          where: { id: user.id },
          data: { botNamingListId: null },
        });
      } else {
        const newName = text.slice(0, 200);
        await prisma.quickList.update({
          where: { id: listId },
          data: { name: newName },
        });
        await prisma.user.update({
          where: { id: user.id },
          data: { botNamingListId: null },
        });
        // Update the summary message in-place if we have its id
        if (list.summaryChatId && list.summaryMessageId) {
          await editQuickListSummary({
            chatId: Number(list.summaryChatId),
            messageId: list.summaryMessageId,
            text: `📝 *${escapeMd(newName)}*\n\n_Nom yangilandi._`,
            parseMode: "Markdown",
          });
        }
        await sendPlain(chatId, `✅ Ro'yhat nomi yangilandi: ${newName}`);
        return NextResponse.json({ ok: true });
      }
    }

    // Default path: treat each non-empty line of the message as a list item,
    // appended to the user's open list (or a fresh one if none open).
    const items = text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 100); // sanity cap

    if (items.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const openList = await findOrCreateOpenList(user.id);
    const lastOrder = await prisma.quickListItem.findFirst({
      where: { listId: openList.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const startOrder = (lastOrder?.order ?? -1) + 1;
    await prisma.quickListItem.createMany({
      data: items.map((textVal, i) => ({
        listId: openList.id,
        text: textVal,
        order: startOrder + i,
      })),
    });
    await prisma.quickList.update({
      where: { id: openList.id },
      data: { updatedAt: new Date() },
    });

    // Silent acknowledgement — a 📝 reaction confirms the bot saw the message
    // without sending a noisy reply. The cron sends/edits the full summary
    // after the user has been silent for the idle window.
    await setMessageReaction({
      chatId,
      messageId: msg.message_id,
      emoji: "📝",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("webhook error", err);
    // Always 200 to Telegram so it doesn't retry
    return NextResponse.json({ ok: false });
  }
}

/** Returns the user's currently-open bot QuickList (source='bot',
 *  closedAt=null, updatedAt within the idle window). Creates a fresh
 *  bot list if none exists. App/web-created lists are intentionally
 *  ignored — they belong to a separate, manual lifecycle and bot items
 *  shouldn't bleed into them. */
async function findOrCreateOpenList(userId: string) {
  const cutoff = new Date(Date.now() - TEZKOR_WINDOW_MS);
  const recent = await prisma.quickList.findFirst({
    where: {
      userId,
      source: "bot",
      deletedAt: null,
      closedAt: null,
      updatedAt: { gte: cutoff },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (recent) return recent;

  return prisma.quickList.create({
    data: {
      userId,
      name: defaultListName(),
      source: "bot",
    },
  });
}

function escapeMd(s: string): string {
  return s.replace(/([_*[\]()`])/g, "\\$1");
}

/* ─── Callback handlers ───────────────────────────────────── */

async function handleCallback(cq: TgCallbackQuery) {
  try {
    const data = cq.data ?? "";
    const colon = data.indexOf(":");
    if (colon < 0) {
      await answerCallbackQuery(cq.id);
      return NextResponse.json({ ok: true });
    }
    const action = data.slice(0, colon);
    const id = data.slice(colon + 1);

    if (action === "done") return handleDoneCallback(cq, id);
    if (action === "qlname") return handleQuickListNameCallback(cq, id);
    if (action === "qldelete") return handleQuickListDeleteCallback(cq, id);
    if (action === "qlconfirm") return handleQuickListConfirmCallback(cq, id);
    if (action === "qlcontinue") return handleQuickListContinueCallback(cq, id);

    await answerCallbackQuery(cq.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("callback handler error", err);
    await answerCallbackQuery(cq.id).catch(() => { /* ignore */ });
    return NextResponse.json({ ok: false });
  }
}

async function handleDoneCallback(cq: TgCallbackQuery, planId: string) {
  // Confirm sender owns the plan (defence in depth)
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: { user: true },
  });
  if (!plan) {
    await answerCallbackQuery(cq.id, "Reja topilmadi");
    return NextResponse.json({ ok: true });
  }
  if (Number(plan.user.telegramId) !== cq.from.id) {
    await answerCallbackQuery(cq.id, "Ruxsat yo'q");
    return NextResponse.json({ ok: true });
  }
  if (plan.status === "DONE") {
    await answerCallbackQuery(cq.id, "Allaqachon bajarilgan");
    return NextResponse.json({ ok: true });
  }

  await prisma.plan.update({
    where: { id: plan.id },
    data: { status: "DONE", completedAt: new Date() },
  });

  const messages = await prisma.botMessage.findMany({
    where: { planId: plan.id },
  });
  await Promise.allSettled(
    messages.map((m) =>
      markReminderDone({
        chatId: Number(m.chatId),
        messageId: m.messageId,
        title: plan.title,
        time: plan.time,
        via: "bot",
      })
    )
  );
  await prisma.botMessage.deleteMany({ where: { planId: plan.id } });

  await answerCallbackQuery(cq.id, "✅ Bajarildi");
  return NextResponse.json({ ok: true });
}

async function handleQuickListNameCallback(cq: TgCallbackQuery, listId: string) {
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(cq.from.id) },
  });
  if (!user) {
    await answerCallbackQuery(cq.id, "Foydalanuvchi topilmadi");
    return NextResponse.json({ ok: true });
  }
  const list = await prisma.quickList.findFirst({
    where: { id: listId, userId: user.id, deletedAt: null },
  });
  if (!list) {
    await answerCallbackQuery(cq.id, "Ro'yhat topilmadi");
    return NextResponse.json({ ok: true });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { botNamingListId: listId },
  });
  await answerCallbackQuery(cq.id);
  await sendPlain(
    cq.message?.chat.id ?? Number(user.telegramId),
    "✏️ Yangi ro'yhat nomini yozib yuboring (oddiy xabar shaklida)."
  );
  return NextResponse.json({ ok: true });
}

async function handleQuickListConfirmCallback(cq: TgCallbackQuery, listId: string) {
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(cq.from.id) },
  });
  if (!user) {
    await answerCallbackQuery(cq.id, "Foydalanuvchi topilmadi");
    return NextResponse.json({ ok: true });
  }
  const list = await prisma.quickList.findFirst({
    where: { id: listId, userId: user.id },
  });
  if (!list || list.deletedAt) {
    await answerCallbackQuery(cq.id, "Ro'yhat topilmadi");
    return NextResponse.json({ ok: true });
  }

  // Lock in the list — strip the inline keyboard and replace the body
  // with a brief confirmation so user knows it's been saved.
  if (list.summaryChatId && list.summaryMessageId) {
    await editQuickListSummary({
      chatId: Number(list.summaryChatId),
      messageId: list.summaryMessageId,
      text: `✅ *Ro'yhatga qo'shildi*\n\n📝 *${escapeMd(list.name)}*\n\n_Tezkor bo'limidan ko'rishingiz mumkin._`,
      parseMode: "Markdown",
    });
  }
  // Make sure it's marked closed (might already be if cron sent the summary).
  if (!list.closedAt) {
    await prisma.quickList.update({
      where: { id: list.id },
      data: { closedAt: new Date() },
    });
  }
  await answerCallbackQuery(cq.id, "✅ Tasdiqlandi");
  return NextResponse.json({ ok: true });
}

async function handleQuickListContinueCallback(cq: TgCallbackQuery, listId: string) {
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(cq.from.id) },
  });
  if (!user) {
    await answerCallbackQuery(cq.id, "Foydalanuvchi topilmadi");
    return NextResponse.json({ ok: true });
  }
  const list = await prisma.quickList.findFirst({
    where: { id: listId, userId: user.id, deletedAt: null },
  });
  if (!list) {
    await answerCallbackQuery(cq.id, "Ro'yhat topilmadi");
    return NextResponse.json({ ok: true });
  }

  // Re-open the list: clear closedAt and refresh updatedAt so cron waits
  // out another full TEZKOR_IDLE_MS before re-closing. The webhook's
  // findOrCreateOpenList will now route incoming items into this list.
  await prisma.quickList.update({
    where: { id: list.id },
    data: { closedAt: null, updatedAt: new Date() },
  });
  if (list.summaryChatId && list.summaryMessageId) {
    await editQuickListSummary({
      chatId: Number(list.summaryChatId),
      messageId: list.summaryMessageId,
      text: `➕ *Davom etmoqdasiz*\n\n📝 *${escapeMd(list.name)}*\n\nYangi narsalarni xabar shaklida yuboring. Sukut bo'lsa qaytadan tasdiqlash so'raladi.`,
      parseMode: "Markdown",
    });
  }
  await answerCallbackQuery(cq.id, "➕ Yangi narsalarni yuboring");
  return NextResponse.json({ ok: true });
}

async function handleQuickListDeleteCallback(cq: TgCallbackQuery, listId: string) {
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(cq.from.id) },
  });
  if (!user) {
    await answerCallbackQuery(cq.id, "Foydalanuvchi topilmadi");
    return NextResponse.json({ ok: true });
  }
  const list = await prisma.quickList.findFirst({
    where: { id: listId, userId: user.id },
  });
  if (!list || list.deletedAt) {
    await answerCallbackQuery(cq.id, "Allaqachon o'chirilgan");
    return NextResponse.json({ ok: true });
  }

  await prisma.quickList.update({
    where: { id: listId },
    data: { deletedAt: new Date() },
  });
  if (list.summaryChatId && list.summaryMessageId) {
    await editQuickListSummary({
      chatId: Number(list.summaryChatId),
      messageId: list.summaryMessageId,
      text: `🗑 *Ro'yhat o'chirildi*\n\n_30 kun davomida \"O'chirilgan\" bo'limidan tiklash mumkin._`,
      parseMode: "Markdown",
    });
  }
  await answerCallbackQuery(cq.id, "🗑 O'chirildi");
  return NextResponse.json({ ok: true });
}
