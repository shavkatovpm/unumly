import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { hashCode } from "@/lib/otp";
import { sendLoginSuccess } from "@/lib/telegram-bot";

export const runtime = "nodejs";

const APP_URL = "https://www.unumly.uz/bugun";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const codeRaw = (body as { code?: unknown })?.code;
  if (typeof codeRaw !== "string") {
    return NextResponse.json({ error: "missing_code" }, { status: 400 });
  }
  const code = codeRaw.replace(/\D/g, "");
  if (code.length !== 6) {
    return NextResponse.json({ error: "invalid_code_format" }, { status: 400 });
  }

  const otp = await prisma.otpCode.findFirst({
    where: {
      codeHash: hashCode(code),
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return NextResponse.json(
      { error: "invalid_code", attemptsLeft: null },
      { status: 401 }
    );
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { phone: otp.phone } });
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
  });
  await createSession({ userId: user.id, telegramId: Number(user.telegramId) });

  // Fire-and-forget: send a Telegram confirmation with a Mini App button.
  // We don't await the send — login should succeed even if Telegram is slow.
  void sendLoginSuccess(Number(user.telegramId), APP_URL).catch((err) => {
    console.error("sendLoginSuccess failed", err);
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      photoUrl: user.photoUrl,
    },
  });
}
