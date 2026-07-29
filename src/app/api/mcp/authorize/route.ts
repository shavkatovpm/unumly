import { verifyClientId, mintAuthorizationCode, type RegisteredClient } from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

/** OAuth 2.1 authorization endpoint — to'liq login sahifasi emas, bitta
 *  token maydonli minimal shakl. Kiritilgan qiymat MCP_AUTH_TOKEN'ga
 *  solishtiriladi (yangi parol o'ylab topilmaydi — bitta sirni eslab
 *  qolasiz). PKCE (S256) majburiy. */

function escapeHtml(s: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return s.replace(/[&<>"']/g, (c) => map[c]);
}

function renderPage(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  error?: string;
}): string {
  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Unumly MCP — kirish</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; background: #f7f7f5; }
  @media (prefers-color-scheme: dark) { body { background: #17171a; } }
  .card { width: 100%; max-width: 360px; padding: 32px 28px; border-radius: 16px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.06); }
  @media (prefers-color-scheme: dark) { .card { background: #232326; box-shadow: none; border: 1px solid #333; } }
  h1 { font-size: 17px; font-weight: 600; margin: 0 0 4px; color: #18181b; }
  @media (prefers-color-scheme: dark) { h1 { color: #f4f4f5; } }
  p.sub { font-size: 13px; color: #71717a; margin: 0 0 20px; }
  input[type=password] { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #d4d4d8; font-size: 14px; margin-bottom: 12px; }
  @media (prefers-color-scheme: dark) { input[type=password] { background: #18181b; border-color: #3f3f46; color: #f4f4f5; } }
  button { width: 100%; padding: 10px 12px; border-radius: 10px; border: none; background: #18181b; color: #fff; font-size: 14px; font-weight: 500; cursor: pointer; }
  @media (prefers-color-scheme: dark) { button { background: #f4f4f5; color: #18181b; } }
  .error { color: #dc2626; font-size: 13px; margin: -4px 0 12px; }
</style>
</head>
<body>
  <div class="card">
    <h1>Unumly MCP</h1>
    <p class="sub">Claude'ni ulash uchun tokeningizni kiriting.</p>
    ${opts.error ? `<div class="error">${escapeHtml(opts.error)}</div>` : ""}
    <form method="POST">
      <input type="hidden" name="client_id" value="${escapeHtml(opts.clientId)}" />
      <input type="hidden" name="redirect_uri" value="${escapeHtml(opts.redirectUri)}" />
      <input type="hidden" name="state" value="${escapeHtml(opts.state)}" />
      <input type="hidden" name="code_challenge" value="${escapeHtml(opts.codeChallenge)}" />
      <input type="hidden" name="code_challenge_method" value="${escapeHtml(opts.codeChallengeMethod)}" />
      <input type="hidden" name="scope" value="${escapeHtml(opts.scope)}" />
      <input type="password" name="token" placeholder="Token" autofocus autocomplete="off" />
      <button type="submit">Kirish</button>
    </form>
  </div>
</body>
</html>`;
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

function plainError(message: string, status = 400): Response {
  return new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

async function resolveClient(clientId: string | null, redirectUri: string | null): Promise<RegisteredClient | null> {
  if (!clientId || !redirectUri) return null;
  const client = await verifyClientId(clientId);
  if (!client) return null;
  if (!client.redirectUris.includes(redirectUri)) return null;
  return client;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const state = url.searchParams.get("state") ?? "";
  const codeChallenge = url.searchParams.get("code_challenge") ?? "";
  const codeChallengeMethod = url.searchParams.get("code_challenge_method") ?? "";
  const responseType = url.searchParams.get("response_type");
  const scope = url.searchParams.get("scope") ?? "";

  const client = await resolveClient(clientId, redirectUri);
  if (!client || !clientId || !redirectUri) {
    // client_id/redirect_uri tasdiqlanmagan bo'lsa redirect qilinmaydi
    // (open-redirect himoyasi) — to'g'ridan-to'g'ri xato ko'rsatiladi.
    return plainError("invalid_request: noma'lum client_id yoki redirect_uri", 400);
  }

  if (responseType !== "code" || codeChallengeMethod !== "S256" || !codeChallenge) {
    const redirect = new URL(redirectUri);
    redirect.searchParams.set("error", "invalid_request");
    if (state) redirect.searchParams.set("state", state);
    return Response.redirect(redirect.toString(), 302);
  }

  return htmlResponse(renderPage({ clientId, redirectUri, state, codeChallenge, codeChallengeMethod, scope }));
}

export async function POST(req: Request) {
  const form = await req.formData();
  const clientId = String(form.get("client_id") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const state = String(form.get("state") ?? "");
  const codeChallenge = String(form.get("code_challenge") ?? "");
  const codeChallengeMethod = String(form.get("code_challenge_method") ?? "");
  const scope = String(form.get("scope") ?? "");
  const token = String(form.get("token") ?? "");

  const client = await resolveClient(clientId, redirectUri);
  if (!client) {
    return plainError("invalid_request: noma'lum client_id yoki redirect_uri", 400);
  }

  const expected = process.env.MCP_AUTH_TOKEN;
  if (!expected || token !== expected) {
    return htmlResponse(
      renderPage({
        clientId,
        redirectUri,
        state,
        codeChallenge,
        codeChallengeMethod,
        scope,
        error: "Noto'g'ri token — qayta urinib ko'ring.",
      }),
      401
    );
  }

  const code = await mintAuthorizationCode({
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    scope: scope || undefined,
  });

  const redirect = new URL(redirectUri);
  redirect.searchParams.set("code", code);
  if (state) redirect.searchParams.set("state", state);
  return Response.redirect(redirect.toString(), 302);
}
