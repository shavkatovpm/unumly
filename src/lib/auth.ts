import "server-only";

import { createHmac, createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "unumly-session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function botToken(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN env is not set");
  return t;
}

function sessionSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET env is not set");
  return new TextEncoder().encode(s);
}

/* ─── Telegram payload types ──────────────────────────────── */

export type TelegramUser = {
  id: number;            // Telegram numeric id
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
};

/* ─── HMAC verification ───────────────────────────────────── */

function safeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/**
 * Verify Telegram Mini App initData.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyInitData(initData: string, maxAgeSeconds = 60 * 60 * 24): TelegramUser | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }

  const hash = params.get("hash");
  if (!hash) return null;

  const authDate = parseInt(params.get("auth_date") ?? "0", 10);
  if (!Number.isFinite(authDate) || authDate <= 0) return null;
  const ageSec = Math.floor(Date.now() / 1000) - authDate;
  if (ageSec > maxAgeSeconds) return null;

  // Build the data-check string: sorted "key=value\n" pairs (excluding 'hash')
  const pairs: string[] = [];
  for (const [k, v] of params.entries()) {
    if (k === "hash") continue;
    pairs.push(`${k}=${v}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  // Secret key = HMAC_SHA256("WebAppData", bot_token)
  const secretKey = createHmac("sha256", "WebAppData").update(botToken()).digest();
  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!safeEqualString(computed, hash)) return null;

  // Parse user JSON
  const userRaw = params.get("user");
  if (!userRaw) return null;
  try {
    const user = JSON.parse(userRaw) as TelegramUser;
    if (!user || typeof user.id !== "number") return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Verify Telegram Login Widget data.
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyLoginWidget(
  data: Record<string, string | number | undefined>,
  maxAgeSeconds = 60 * 60 * 24
): TelegramUser | null {
  const hash = data.hash;
  if (typeof hash !== "string") return null;

  const authDate = typeof data.auth_date === "number"
    ? data.auth_date
    : parseInt(String(data.auth_date ?? "0"), 10);
  if (!Number.isFinite(authDate) || authDate <= 0) return null;
  const ageSec = Math.floor(Date.now() / 1000) - authDate;
  if (ageSec > maxAgeSeconds) return null;

  const pairs: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (k === "hash" || v === undefined || v === null) continue;
    pairs.push(`${k}=${v}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  // Secret key = SHA256(bot_token)
  const secretKey = createHash("sha256").update(botToken()).digest();
  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!safeEqualString(computed, hash)) return null;

  const id = typeof data.id === "number" ? data.id : parseInt(String(data.id ?? "0"), 10);
  if (!Number.isFinite(id) || id <= 0) return null;

  return {
    id,
    first_name: typeof data.first_name === "string" ? data.first_name : undefined,
    last_name:  typeof data.last_name  === "string" ? data.last_name  : undefined,
    username:   typeof data.username   === "string" ? data.username   : undefined,
    photo_url:  typeof data.photo_url  === "string" ? data.photo_url  : undefined,
  };
}

/* ─── User upsert ─────────────────────────────────────────── */

export async function upsertUser(tg: TelegramUser) {
  return prisma.user.upsert({
    where: { telegramId: BigInt(tg.id) },
    update: {
      username: tg.username,
      firstName: tg.first_name,
      lastName: tg.last_name,
      photoUrl: tg.photo_url,
      languageCode: tg.language_code,
      isPremium: tg.is_premium ?? false,
      lastSeenAt: new Date(),
    },
    create: {
      telegramId: BigInt(tg.id),
      username: tg.username,
      firstName: tg.first_name,
      lastName: tg.last_name,
      photoUrl: tg.photo_url,
      languageCode: tg.language_code,
      isPremium: tg.is_premium ?? false,
    },
  });
}

/* ─── Session JWT (httpOnly cookie) ───────────────────────── */

type SessionPayload = {
  uid: string;        // internal user id
  tid: number;        // telegram id (for quick reference / future bot mapping)
};

async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ uid: payload.uid, tid: payload.tid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE_SECONDS}s`)
    .sign(sessionSecret());
}

export async function createSession(opts: { userId: string; telegramId: number }) {
  const token = await signSession({ uid: opts.userId, tid: opts.telegramId });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/** Read & verify current session. Returns the user record or null. */
export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    const uid = typeof payload.uid === "string" ? payload.uid : null;
    if (!uid) return null;
    const user = await prisma.user.findUnique({ where: { id: uid } });
    return user ?? null;
  } catch {
    return null;
  }
}
