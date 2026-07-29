import { verifyAuthorizationCode, verifyPkce, mintAccessToken } from "@/lib/mcp/oauth";
import { getOwnerUserId } from "@/lib/mcp/auth";

export const dynamic = "force-dynamic";

function jsonError(error: string, description: string, status = 400): Response {
  return Response.json({ error, error_description: description }, { status });
}

/** Token endpoint standart bo'yicha application/x-www-form-urlencoded kutadi,
 *  lekin ba'zi client'lar JSON yuborishi mumkin — ikkalasini ham qo'llab-quvvatlaymiz. */
async function parseParams(req: Request): Promise<URLSearchParams> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) params.set(k, String(v));
    return params;
  }
  const form = await req.formData();
  const params = new URLSearchParams();
  for (const [k, v] of form.entries()) params.set(k, String(v));
  return params;
}

/** RFC 6749 token endpoint — faqat authorization_code grant (refresh yo'q,
 *  o'rniga uzun muddatli access token, src/lib/mcp/oauth.ts izohiga qarang). */
export async function POST(req: Request) {
  const params = await parseParams(req);

  const grantType = params.get("grant_type");
  if (grantType !== "authorization_code") {
    return jsonError("unsupported_grant_type", "Faqat authorization_code qo'llab-quvvatlanadi.");
  }

  const code = params.get("code");
  const redirectUri = params.get("redirect_uri");
  const clientId = params.get("client_id");
  const codeVerifier = params.get("code_verifier");

  if (!code || !redirectUri || !clientId || !codeVerifier) {
    return jsonError("invalid_request", "code, redirect_uri, client_id, code_verifier majburiy.");
  }

  const payload = await verifyAuthorizationCode(code);
  if (!payload) {
    return jsonError("invalid_grant", "Kod yaroqsiz yoki muddati o'tgan.");
  }
  if (payload.clientId !== clientId || payload.redirectUri !== redirectUri) {
    return jsonError("invalid_grant", "client_id yoki redirect_uri mos kelmadi.");
  }
  if (payload.codeChallengeMethod !== "S256" || !verifyPkce(codeVerifier, payload.codeChallenge)) {
    return jsonError("invalid_grant", "PKCE tekshiruvi muvaffaqiyatsiz.");
  }

  let ownerUserId: string;
  try {
    ownerUserId = getOwnerUserId();
  } catch {
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  const { token, expiresIn } = await mintAccessToken(ownerUserId);

  return Response.json({
    access_token: token,
    token_type: "Bearer",
    expires_in: expiresIn,
    scope: payload.scope,
  });
}
