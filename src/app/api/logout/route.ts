import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

/**
 * Server-side logout route handler.
 * Clears the refresh_token cookie directly (same origin — guaranteed to work)
 * and forwards the logout request to the backend to delete the token from DB.
 *
 * Always returns 204 No Content (success), regardless of backend state.
 * This is for security — never hint if refresh token exists.
 *
 * Frontend flow:
 * 1. Call /api/logout
 * 2. Server clears cookie + notifies backend (best-effort)
 * 3. Frontend clears in-memory token
 * 4. Hard redirect to /login
 */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh_token")?.value;

  // Forward to backend to delete token from DB (best-effort, don't block)
  // Send token in body (not Cookie header) to avoid runtime header stripping
  if (refreshToken) {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (err) {
      // Backend unreachable or error — still clear the cookie below
      // This is intentional: always logout the client, even if DB cleanup fails
      console.error("[logout] Backend logout failed:", err);
    }
  }

  // Clear cookie directly at Next.js level (guaranteed, same origin)
  // Always return 204 No Content — security practice (no info leak)
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete("refresh_token");
  return response;
}
