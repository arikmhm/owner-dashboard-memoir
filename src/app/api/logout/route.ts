import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

/**
 * Server-side logout route handler.
 * Clears the refresh_token cookie directly (same origin — guaranteed to work)
 * and forwards the logout request to the backend to delete the token from DB.
 */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh_token")?.value;

  // Forward to backend to delete token from DB (best-effort)
  // Send token in body (not Cookie header) to avoid runtime header stripping
  if (refreshToken) {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Backend unreachable — still clear the cookie below
    }
  }

  // Clear cookie directly at Next.js level (guaranteed, same origin)
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("refresh_token");
  return response;
}
