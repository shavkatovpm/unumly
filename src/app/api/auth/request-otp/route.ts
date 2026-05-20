import { NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalisePhone } from "@/lib/phone";
import { sendOtpMessage } from "@/lib/telegram-bot";

export const runtime = "nodejs";

const OTP_TTL_MS = 5 * 60 * 1000;          // 5 minutes
const REQUEST_WINDOW_MS = 60 * 1000;       // 1 minute between sends (per phone)
const REQUEST_DAILY_LIMIT = 8;             // hard cap per phone per day

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  // 6-digit numeric, leading zeros allowed
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const phoneRaw = (body as { phone?: unknown })?.phone;
  if (typeof phoneRaw !== "string") {
    return NextResponse.json({ error: "missing_phone" }, { status: 400 });
  }
  const phone = normalisePhone(phoneRaw);
  if (!phone) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  // Is the phone known? (User must have shared it via the bot first)
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    return NextResponse.json(
      {
        error: "not_registered",
        hint: "Avval @unumlybot ga kirib /start bosing va telefon raqamingizni ulashing.",
      },
      { status: 404 }
    );
  }

  // Throttle: at most one code per minute per phone
  const recent = await prisma.otpCode.findFirst({
    where: { phone, createdAt: { gt: new Date(Date.now() - REQUEST_WINDOW_MS) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    const wait = Math.ceil(
      (recent.createdAt.getTime() + REQUEST_WINDOW_MS - Date.now()) / 1000
    );
    return NextResponse.json(
      { error: "too_soon", retryAfterSec: Math.max(1, wait) },
      { status: 429 }
    );
  }

  // Daily hard limit
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dailyCount = await prisma.otpCode.count({
    where: { phone, createdAt: { gte: startOfDay } },
  });
  if (dailyCount >= REQUEST_DAILY_LIMIT) {
    return NextResponse.json({ error: "daily_limit" }, { status: 429 });
  }

  // Invalidate any prior unused codes for this phone
  await prisma.otpCode.updateMany({
    where: { phone, used: false, expiresAt: { gt: new Date() } },
    data: { used: true },
  });

  const code = generateCode();
  await prisma.otpCode.create({
    data: {
      phone,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  // Deliver via Telegram bot
  try {
    await sendOtpMessage(Number(user.telegramId), code);
  } catch (err) {
    console.error("sendOtpMessage failed", err);
    return NextResponse.json({ error: "delivery_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, expiresInSec: OTP_TTL_MS / 1000 });
}
