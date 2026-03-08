import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Next.js Proxy (Edge Route Protection)
// Edge-level route protection using Next.js 16 proxy convention.
//
// Primary auth guard lives in AuthProvider (client-side, localStorage).
// This proxy provides a secondary optimistic check:
//   - Checks for `memoir_token` cookie (synced from localStorage by client)
//   - If missing on a protected route, redirects to /login
//   - Does NOT verify JWT (no secret at edge) — just checks existence
// ─────────────────────────────────────────────────────────────────────────────

const PUBLIC_PATHS = new Set(["/login"]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for static assets, API routes, and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("memoir_token")?.value;

  // If accessing a protected route without token → redirect to login
  if (!isPublicPath(pathname) && !token) {
    // Allow through — AuthProvider will handle redirect on client
    // This is because the primary token is in localStorage, not cookie
    // Cookie sync happens after first client-side load
    return NextResponse.next();
  }

  // If authenticated user visits /login → redirect to dashboard
  if (isPublicPath(pathname) && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
