import "server-only";

import { createHash, randomInt } from "crypto";
import type { User } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendOtpMessage } from "@/lib/telegram-bot";

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_GEN_ATTEMPTS = 10;

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Generate a 6-digit code that does not collide with any other
 * currently-active (unused, not expired) code in the database.
 * Codes are hashed at rest, so we compare hashes.
 */
async function generateUniqueCode(): Promise<string> {
  for (let i = 0; i < MAX_GEN_ATTEMPTS; i++) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const hash = hashCode(code);
    const dup = await prisma.otpCode.findFirst({
      where: { codeHash: hash, used: false, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!dup) return code;
  }
  throw new Error("Could not generate a unique OTP code");
}

/**
 * Invalidate any prior active codes for this phone, create a fresh one,
 * persist its hash, and return the plain code (caller decides how to
 * deliver it via the bot).
 */
export async function issueOtp(user: Pick<User, "phone">): Promise<{
  code: string;
  expiresInSec: number;
}> {
  if (!user.phone) throw new Error("user has no phone");

  await prisma.otpCode.updateMany({
    where: { phone: user.phone, used: false, expiresAt: { gt: new Date() } },
    data: { used: true },
  });

  const code = await generateUniqueCode();
  await prisma.otpCode.create({
    data: {
      phone: user.phone,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  return { code, expiresInSec: OTP_TTL_MS / 1000 };
}

/**
 * Convenience: generate + send via the plain OTP template (web-login flow).
 */
export async function issueAndSendOtp(
  user: Pick<User, "telegramId" | "phone">
) {
  const { code, expiresInSec } = await issueOtp(user);
  await sendOtpMessage(Number(user.telegramId), code);
  return { code, expiresInSec };
}
