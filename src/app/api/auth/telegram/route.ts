import { NextResponse } from "next/server";
import {
  createSession,
  upsertUser,
  verifyInitData,
  verifyLoginWidget,
  type TelegramUser,
} from "@/lib/auth";

export const runtime = "nodejs"; // we use node's `crypto` for HMAC

/**
 * POST /api/auth/telegram
 *
 * Body:
 *   { initData: string }                 — Telegram Mini App
 *   { widget: { id, hash, ... } }        — Telegram Login Widget
 *
 * Returns:
 *   200 { user: { id, firstName, username, ... } } on success
 *   401 on invalid HMAC / expired auth_date
 *   400 on malformed body
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;
  let tgUser: TelegramUser | null = null;

  if (typeof obj.initData === "string") {
    tgUser = verifyInitData(obj.initData);
  } else if (obj.widget && typeof obj.widget === "object") {
    tgUser = verifyLoginWidget(obj.widget as Record<string, string | number | undefined>);
  } else {
    return NextResponse.json({ error: "missing_payload" }, { status: 400 });
  }

  if (!tgUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await upsertUser(tgUser);
  await createSession({ userId: user.id, telegramId: Number(user.telegramId) });

  return NextResponse.json({
    user: {
      id: user.id,
      telegramId: Number(user.telegramId),
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      photoUrl: user.photoUrl,
    },
  });
}
