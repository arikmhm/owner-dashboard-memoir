// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Auth API
// Authentication-related API calls (login, logout, subscription status)
// ─────────────────────────────────────────────────────────────────────────────

import { api, setToken, setStoredUser, getToken, ApiError } from "./api";
import type {
  LoginRequest,
  LoginResponse,
  AuthUser,
  SubscriptionResponse,
} from "./types";

/**
 * Login with email & password.
 * Stores accessToken in localStorage on success.
 * Backend also sends refresh_token via Set-Cookie (HttpOnly).
 */
export async function login(
  credentials: LoginRequest,
): Promise<{ accessToken: string; user: AuthUser }> {
  const res = await api.post<LoginResponse>("/auth/login", credentials);
  setToken(res.data.accessToken);
  setStoredUser(res.data.user);
  return res.data;
}

/**
 * Server-side logout: revoke refresh token via API.
 * Fire-and-forget — caller (AuthProvider) handles token removal and redirect.
 */
export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Ignore errors — logging out regardless
  }
}

/**
 * Check if user has a valid token stored.
 */
export function isAuthenticated(): boolean {
  return !!getToken();
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

