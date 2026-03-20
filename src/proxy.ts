// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Server-Side Auth Proxy
// Redirects unauthenticated users at the server level before page JS loads.
// Checks `auth_session` cookie (set by client on login, cleared on logout).
// Subscription checks remain client-side in AuthProvider.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Migration: support both cookies during transition for existing sessions.
  // Remove `refresh_token` fallback after 1 week (refresh token lifetime).
  const hasSession =
    request.cookies.has("auth_session") ||
    request.cookies.has("refresh_token");
  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );

  // Unauthenticated + protected route → /login
  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated + login page → / (AuthProvider handles subscription redirect)
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)",
  ],
};
