import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "unumly-session";

/**
 * Protect (app) routes — Bugun / Agenda / Kalendar / Reja / Bajarilgan /
 * O'chirilgan. If the session cookie is missing or invalid, redirect to
 * /kirish with a `next=` query so we return after login.
 */

const APP_ROUTES = [
  "/bugun",
  "/agenda",
  "/kalendar",
  "/reja",
  "/bajarilgan",
  "/arxiv",
  "/ochirilgan",
  "/dashboard",
];

function isAppRoute(pathname: string): boolean {
  return APP_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );
}

async function isSessionValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (!isAppRoute(pathname)) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (await isSessionValid(token)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/kirish";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Match (app) prefixes only. Static assets, _next, api are excluded.
  matcher: [
    "/bugun/:path*",
    "/agenda/:path*",
    "/kalendar/:path*",
    "/reja/:path*",
    "/bajarilgan/:path*",
    "/arxiv/:path*",
    "/ochirilgan/:path*",
    "/dashboard/:path*",
  ],
};
