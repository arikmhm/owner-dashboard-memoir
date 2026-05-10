// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Auth API
// Authentication-related API calls (login, logout, subscription status)
// ─────────────────────────────────────────────────────────────────────────────

import { api, setToken, ApiError } from "./api";
import type {
  LoginRequest,
  LoginResponse,
  AuthUser,
  SubscriptionResponse,
} from "./types";

/**
 * Login with email & password.
 * Stores accessToken in memory on success.
 * Backend also sends refresh_token via Set-Cookie (HttpOnly).
 */
export async function login(
  credentials: LoginRequest,
): Promise<{ accessToken: string; user: AuthUser }> {
  const res = await api.post<LoginResponse>("/auth/login", credentials);
  setToken(res.data.accessToken);
  return res.data;
}

/**
 * Logout the current user.
 *
 * Flow:
 * 1. POST /api/logout (Next.js handler)
 * 2. Server clears refresh_token cookie
 * 3. Server notifies backend to delete refresh token from DB (best-effort)
 * 4. Always returns 204 No Content (even if no refresh token or backend fails)
 *
 * Frontend handles response:
 * - Ignores response status (always treat as success per security spec)
 * - Clears access token from memory (done by caller)
 * - Redirects to /login (done by caller)
 *
 * Note: This is a same-origin call, so errors are extremely unlikely.
 * Any errors are ignored (silent fail) — logout is best-effort.
 */
export async function logout(): Promise<void> {
  try {
    await fetch("/api/logout", { method: "POST" });
  } catch (err) {
    // Network error or fetch failure (extremely unlikely, same-origin)
    // Still treat as success — caller will clear token and redirect
    console.warn("[logout] API call failed:", err);
  }
}

/**
 * Get the active subscription for the current owner.
 * Returns the full subscription response including status and grace period info.
 * Returns null if no subscription exists or API fails.
 */
export async function getSubscription(): Promise<SubscriptionResponse | null> {
  try {
    const res = await api.get<{ data: SubscriptionResponse }>(
      "/owner/subscription",
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      throw err;
    }
    return null;
  }
}
