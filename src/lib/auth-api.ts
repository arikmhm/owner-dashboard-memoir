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
 * Server-side logout via Next.js route handler.
 * Clears HttpOnly cookie at same origin (guaranteed) and deletes token from DB.
 */
export async function logout(): Promise<void> {
  await fetch("/api/logout", { method: "POST" });
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

