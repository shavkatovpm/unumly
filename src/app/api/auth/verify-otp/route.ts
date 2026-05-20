import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalisePhone } from "@/lib/phone";
import { createSession } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const data = body as { phone?: unknown; code?: unknown };
  if (typeof data.phone !== "string" || typeof data.code !== "string") {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const phone = normalisePhone(data.phone);
  if (!phone) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }
  const code = data.code.replace(/\D/g, "");
  if (code.length !== 6) {
    return NextResponse.json({ error: "invalid_code_format" }, { status: 400 });
  }

  // Find the latest unused, non-expired code for this phone
  const otp = await prisma.otpCode.findFirst({
    where: {
      phone,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return NextResponse.json({ error: "no_active_code" }, { status: 400 });
  }

  // Too many wrong attempts → burn this code
  if (otp.attempts >= MAX_ATTEMPTS) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { used: true },
    });
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }

  if (otp.codeHash !== hashCode(code)) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json(
      { error: "invalid_code", attemptsLeft: MAX_ATTEMPTS - otp.attempts - 1 },
      { status: 401 }
    );
  }

  // Valid! Mark code used + create session
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
  });
  await createSession({ userId: user.id, telegramId: Number(user.telegramId) });

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
