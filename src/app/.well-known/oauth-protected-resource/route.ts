import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** RFC 9728 — Protected Resource Metadata. /api/mcp 401 qaytarganda
 *  WWW-Authenticate header shu manzilga ishora qiladi. */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  return NextResponse.json({
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
  });
}
