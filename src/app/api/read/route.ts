import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { READERS } from "@/lib/read-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/read?fn=listPlans&args=[...] — o'qish funksiyasini chaqiradi.
   Server action emas: action'lar navigatsiya bilan bitta navbatda turadi va sekin
   tarmoqda sahifadan chiqib ketgandan keyin tugasa, ilovani o'sha sahifaga qaytaradi. */
export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const url = new URL(req.url);
  const fn = url.searchParams.get("fn") ?? "";
  if (!Object.prototype.hasOwnProperty.call(READERS, fn)) {
    return NextResponse.json({ error: "BAD_FN" }, { status: 400 });
  }
  let args: unknown[] = [];
  try {
    const raw = url.searchParams.get("args");
    if (raw) args = JSON.parse(raw);
    if (!Array.isArray(args)) throw new Error();
  } catch {
    return NextResponse.json({ error: "BAD_ARGS" }, { status: 400 });
  }
  try {
    const reader = READERS[fn as keyof typeof READERS] as (...a: unknown[]) => Promise<unknown>;
    const data = await reader(...args);
    return NextResponse.json(data ?? null, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "ERROR" }, { status: 500 });
  }
}
