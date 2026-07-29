import { NextResponse } from "next/server";

import { mintClientId } from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

/** RFC 7591 — Dynamic Client Registration. Bazaga hech narsa yozilmaydi —
 *  qaytariladigan client_id ichida redirect_uris imzolangan holda saqlanadi. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400 });
  }

  const redirectUris = extractRedirectUris(body);
  if (!redirectUris) {
    return NextResponse.json(
      {
        error: "invalid_redirect_uri",
        error_description: "redirect_uris majburiy va bo'sh bo'lmagan massiv (har biri valid URL) bo'lishi kerak.",
      },
      { status: 400 }
    );
  }

  const clientId = await mintClientId(redirectUris);
  const clientName =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).client_name === "string"
      ? ((body as Record<string, unknown>).client_name as string)
      : undefined;

  return NextResponse.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: clientName,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
    },
    { status: 201 }
  );
}

function extractRedirectUris(body: unknown): string[] | null {
  if (!body || typeof body !== "object") return null;
  const uris = (body as Record<string, unknown>).redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0) return null;
  const valid: string[] = [];
  for (const u of uris) {
    if (typeof u !== "string") return null;
    try {
      new URL(u);
    } catch {
      return null;
    }
    valid.push(u);
  }
  return valid;
}
