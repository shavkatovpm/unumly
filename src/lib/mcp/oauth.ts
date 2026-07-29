import "server-only";

import { createHash, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";

/**
 * Minimal, to'liq statesiz OAuth 2.1 qatlami (single-user MCP connector uchun).
 * Hech narsa bazaga yozilmaydi — client_id, authorization code va access
 * token'larning barchasi MCP_OAUTH_SECRET bilan imzolangan JWT: haqiqiyligi
 * faqat imzo + muddat tekshiruvi orqali aniqlanadi, saqlash shart emas.
 */

const ISSUER = "urn:unumly:mcp";

function oauthSecret(): Uint8Array {
  const s = process.env.MCP_OAUTH_SECRET;
  if (!s) throw new Error("MCP_OAUTH_SECRET env is not set");
  return new TextEncoder().encode(s);
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/* ─── PKCE (RFC 7636, S256) ────────────────────────────────── */

export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const computed = createHash("sha256").update(codeVerifier).digest("base64url");
  return safeEqual(computed, codeChallenge);
}

/* ─── Dynamic Client Registration (RFC 7591) ──────────────── */
// client_id — o'zida redirect_uris ro'yxatini imzolab saqlaydigan JWT.

export type RegisteredClient = { redirectUris: string[] };

export async function mintClientId(redirectUris: string[]): Promise<string> {
  return new SignJWT({ typ: "client", redirect_uris: redirectUris })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .sign(oauthSecret());
}

export async function verifyClientId(clientId: string): Promise<RegisteredClient | null> {
  try {
    const { payload } = await jwtVerify(clientId, oauthSecret(), { issuer: ISSUER });
    if (payload.typ !== "client" || !Array.isArray(payload.redirect_uris)) return null;
    return { redirectUris: payload.redirect_uris as string[] };
  } catch {
    return null;
  }
}

/* ─── Authorization code ──────────────────────────────────── */
// 5 daqiqa amal qiladi. Statesiz bo'lgani uchun "bir marta ishlatiladi" qat'iy
// kafolatlanmaydi — bitta userga xizmat qiluvchi shaxsiy server uchun qabul
// qilingan murosa (qisqa muddat bilan cheklangan).

export type AuthCodePayload = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope?: string;
};

export async function mintAuthorizationCode(data: AuthCodePayload): Promise<string> {
  return new SignJWT({
    typ: "code",
    client_id: data.clientId,
    redirect_uri: data.redirectUri,
    code_challenge: data.codeChallenge,
    code_challenge_method: data.codeChallengeMethod,
    scope: data.scope ?? "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(oauthSecret());
}

export async function verifyAuthorizationCode(code: string): Promise<AuthCodePayload | null> {
  try {
    const { payload } = await jwtVerify(code, oauthSecret(), { issuer: ISSUER });
    if (payload.typ !== "code") return null;
    return {
      clientId: String(payload.client_id ?? ""),
      redirectUri: String(payload.redirect_uri ?? ""),
      codeChallenge: String(payload.code_challenge ?? ""),
      codeChallengeMethod: String(payload.code_challenge_method ?? ""),
      scope: typeof payload.scope === "string" && payload.scope ? payload.scope : undefined,
    };
  } catch {
    return null;
  }
}

/* ─── Access token ────────────────────────────────────────── */
// Refresh token yo'q (v1'da ataylab qo'shilmagan) — o'rniga uzun (90 kun)
// muddatli access token. Bekor qilish yo'li yo'q, faqat MCP_OAUTH_SECRET'ni
// almashtirish orqali (bu barcha OAuth token'larni birdek bekor qiladi).

const ACCESS_TOKEN_TTL = "90d";
const ACCESS_TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60;

export async function mintAccessToken(ownerUserId: string): Promise<{ token: string; expiresIn: number }> {
  const token = await new SignJWT({ typ: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setSubject(ownerUserId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(oauthSecret());
  return { token, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

export async function verifyAccessToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, oauthSecret(), { issuer: ISSUER });
    if (payload.typ !== "access" || typeof payload.sub !== "string") return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}
