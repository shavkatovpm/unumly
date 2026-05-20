import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askForContact } from "@/lib/telegram-bot";
import { normalisePhone } from "@/lib/phone";
import { issueAndSendOtp } from "@/lib/otp";

export const runtime = "nodejs";

const SECRET_HEADER = "x-telegram-bot-api-secret-token";

type TgUpdate = {
  message?: TgMessage;
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
      await issueAndSendOtp({ telegramId: user.telegramId, phone: user.phone });
      return NextResponse.json({ ok: true });
    }

    // /start — for registered users, send fresh OTP immediately;
    // for new users, ask for contact first.
    const text = (msg.text ?? "").trim();
    const isStart = text === "/start" || text.startsWith("/start ");
    if (isStart) {
      const existing = await prisma.user.findUnique({
        where: { telegramId: BigInt(from.id) },
      });
      if (existing?.phone) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { lastSeenAt: new Date() },
        });
        await issueAndSendOtp({ telegramId: existing.telegramId, phone: existing.phone });
        return NextResponse.json({ ok: true });
      }
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

    // Any other text from a registered user → send a fresh code (acts as
    // an implicit "send me a new code" command).
    const existing = await prisma.user.findUnique({
      where: { telegramId: BigInt(from.id) },
    });
    if (existing?.phone) {
      await issueAndSendOtp({ telegramId: existing.telegramId, phone: existing.phone });
      return NextResponse.json({ ok: true });
    }

    // New user typed something other than /start → onboard them
    await askForContact(chatId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("webhook error", err);
    // Always 200 to Telegram so it doesn't retry
    return NextResponse.json({ ok: false });
  }
}
