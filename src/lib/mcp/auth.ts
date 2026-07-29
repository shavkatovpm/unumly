import "server-only";

import { verifyAccessToken } from "@/lib/mcp/oauth";

/** MCP serverning yagona egasi — barcha so'rovlar shu userId'ga qattiq bog'lanadi.
 *  OAuth access token'lar ham shu userId (sub) bilan berilgan bo'lishi shart
 *  (src/lib/mcp/oauth.ts:mintAccessToken). Haqiqiy multi-user hali qurilmagan. */
export function getOwnerUserId(): string {
  const id = process.env.MCP_OWNER_USER_ID;
  if (!id) throw new Error("MCP_OWNER_USER_ID env is not set");
  return id;
}

function unauthorized(req: Request): Response {
  // RFC 9728 — resource_metadata OAuth discovery'ning boshlanish nuqtasi:
  // claude.ai shu header orqali qayerdan authorization server'ni topishni biladi.
  const origin = new URL(req.url).origin;
  return new Response("unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
    },
  });
}

/** Bearer token tekshiruvi — ikki turdagi token qabul qilinadi:
 *  1) statik MCP_AUTH_TOKEN (curl/qo'lda test uchun, api/cron/notify'dagi
 *     CRON_SECRET pattern'iga o'xshash)
 *  2) OAuth access token (claude.ai custom connector uchun — /api/mcp/token'da
 *     berilgan, sub === OWNER_USER_ID bo'lishi shart).
 *  Xato bo'lsa Response qaytaradi (chaqiruvchi shuni to'g'ridan-to'g'ri
 *  qaytarishi kerak); OK bo'lsa null. */
export async function checkBearerToken(req: Request): Promise<Response | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return unauthorized(req);
  const token = auth.slice("Bearer ".length);

  const staticSecret = process.env.MCP_AUTH_TOKEN;
  if (staticSecret && token === staticSecret) return null;

  const oauth = await verifyAccessToken(token);
  if (oauth) {
    try {
      if (oauth.sub === getOwnerUserId()) return null;
    } catch {
      // MCP_OWNER_USER_ID sozlanmagan — quyida unauthorized qaytadi.
    }
  }

  return unauthorized(req);
}
