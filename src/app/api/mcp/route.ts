import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { checkBearerToken } from "@/lib/mcp/auth";
import { registerMcpTools } from "@/lib/mcp/tools";

/**
 * Unumly MCP server (v1, single-user) — Streamable HTTP transport.
 * claude.ai custom connector URL: https://www.unumly.uz/api/mcp
 *
 * Env (hujjatlashtirilgan joy — bu fayl):
 *   MCP_AUTH_TOKEN     — static bearer token (curl/qo'lda test). Generatsiya: openssl rand -hex 32
 *   MCP_OWNER_USER_ID  — User.id (Prisma cuid) — barcha so'rovlar shu userga
 *                        qattiq bog'lanadi (src/lib/mcp/auth.ts:getOwnerUserId).
 *   MCP_OAUTH_SECRET   — OAuth JWT'larni imzolash uchun (src/lib/mcp/oauth.ts).
 *                        Generatsiya: openssl rand -base64 32
 *
 * OAuth 2.1 discovery/authorize/register/token endpoint'lari:
 *   /.well-known/oauth-protected-resource, /.well-known/oauth-authorization-server,
 *   /api/mcp/register, /api/mcp/authorize, /api/mcp/token — claude.ai custom
 *   connector shular orqali avtomatik ulanadi (bearer token'ni qo'lda kiritish
 *   shart emas).
 *
 * Har so'rovda yangi McpServer + transport (statesiz rejim, Vercel
 * serverless'ga mos — sessiya xotirada saqlanmaydi). Haqiqiy multi-user
 * kelajakda alohida qatlam sifatida qo'shilishi mumkin — hozir qurilmagan.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: Request): Promise<Response> {
  const authError = await checkBearerToken(req);
  if (authError) return authError;

  try {
    const server = new McpServer({ name: "unumly-mcp", version: "1.0.0" });
    registerMcpTools(server);

    const transport = new WebStandardStreamableHTTPServerTransport();
    await server.connect(transport);
    return await transport.handleRequest(req);
  } catch (err) {
    console.error("MCP request handling failed", err);
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null },
      { status: 500 }
    );
  }
}

export { handle as GET, handle as POST, handle as DELETE };
