import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { scrypt as scryptCb, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

import { prisma } from "@/lib/prisma";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const ADMIN_COOKIE = "unumly-admin";
const ADMIN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 kun

function adminSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET env is not set");
  return new TextEncoder().encode(s);
}

function envFallbackPassword(): string {
  // Faqat first-time login uchun (DB'da hash yo'q paytda).
  // Admin tomondan parol o'zgartirilgandan keyin DB hash ishlatiladi.
  return process.env.ADMIN_PASSWORD || "unumlyad321";
}

/* ─── Scrypt hash helpers ──────────────────────────────── */

async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(pw, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

async function verifyHash(pw: string, stored: string): Promise<boolean> {
  const [salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;
  let candidate: Buffer;
  try {
    candidate = await scrypt(pw, salt, 64);
  } catch {
    return false;
  }
  let target: Buffer;
  try {
    target = Buffer.from(keyHex, "hex");
  } catch {
    return false;
  }
  if (target.length !== candidate.length) return false;
  return timingSafeEqual(target, candidate);
}

/* ─── DB-backed verification + change ──────────────────── */

/** AdminConfig jadvali yo'q bo'lsa (migration hali ishlatilmagan) — null. */
async function readConfig(): Promise<{ passwordHash: string } | null> {
  try {
    return await prisma.adminConfig.findUnique({ where: { id: 1 } });
  } catch {
    return null;
  }
}

export async function verifyAdminPassword(pw: string): Promise<boolean> {
  if (!pw) return false;
  const config = await readConfig();
  if (config) {
    return verifyHash(pw, config.passwordHash);
  }
  // Hech qachon parol o'zgartirilmagan (yoki jadval yo'q) — env default
  return pw === envFallbackPassword();
}

/**
 * Admin parolni o'zgartiradi. Yangi parol DB'da hash sifatida saqlanadi.
 * Eski parol DB'dagi yoki env fallback ga mos bo'lishi shart.
 */
export async function changeAdminPassword(
  currentPw: string,
  newPw: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!currentPw || !newPw) return { ok: false, error: "Maydonlarni to'ldiring" };
  if (newPw.length < 6) return { ok: false, error: "Yangi parol kamida 6 ta belgi" };

  const ok = await verifyAdminPassword(currentPw);
  if (!ok) return { ok: false, error: "Joriy parol noto'g'ri" };
  if (currentPw === newPw)
    return { ok: false, error: "Yangi parol joriysidan farq qilsin" };

  const hash = await hashPassword(newPw);
  try {
    await prisma.adminConfig.upsert({
      where: { id: 1 },
      create: { id: 1, passwordHash: hash },
      update: { passwordHash: hash },
    });
  } catch {
    return {
      ok: false,
      error: "AdminConfig jadvali topilmadi — `npx prisma migrate dev` ishlatib ko'ring",
    };
  }
  return { ok: true };
}

/* ─── Cookie management ────────────────────────────────── */

export async function setAdminCookie(): Promise<void> {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_MAX_AGE_SECONDS}s`)
    .sign(adminSecret());
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_MAX_AGE_SECONDS,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function isAdminAuthed(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, adminSecret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

/** True bo'lsa, admin hali env default parol bilan ishlaydi (DB'da hash yo'q yoki jadval mavjud emas). */
export async function isUsingDefaultPassword(): Promise<boolean> {
  const config = await readConfig();
  return config === null;
}
