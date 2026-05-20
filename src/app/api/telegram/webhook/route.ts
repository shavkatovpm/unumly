import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askForContact, sendWelcome } from "@/lib/telegram-bot";
import { normalisePhone } from "@/lib/phone";

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
    // Contact share → upsert user with phone
    if (msg.contact) {
      // Only accept the user's OWN contact (user_id must match sender)
      const c = msg.contact;
      if (c.user_id !== from.id) {
        // Different person's contact — ignore politely
        await askForContact(chatId);
        return NextResponse.json({ ok: true });
      }
      const phone = normalisePhone(c.phone_number);
      if (!phone) {
        await askForContact(chatId);
        return NextResponse.json({ ok: true });
      }
      await prisma.user.upsert({
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
      await sendWelcome(chatId);
      return NextResponse.json({ ok: true });
    }

    // /start (or any first message) → ask for contact
    const text = (msg.text ?? "").trim();
    if (text === "/start" || text.startsWith("/start ")) {
      // Ensure the user exists (without phone yet) so /start counts as engagement
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

    // Anything else — gentle reminder
    await askForContact(chatId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("webhook error", err);
    // Always 200 to Telegram so it doesn't retry
    return NextResponse.json({ ok: false });
  }
}
