// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Auth API
// Authentication-related API calls (login, logout, subscription, plans)
// ─────────────────────────────────────────────────────────────────────────────

import { api, setToken, removeToken, getToken } from "./api";
import type {
  LoginRequest,
  LoginResponse,
  AuthUser,
  SubscriptionPlan,
  SubscriptionResponse,
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  CheckPaymentResponse,
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
  return res.data;
}

/**
 * Logout: revoke refresh token via API, then clear local token.
 * POST /auth/logout clears the refresh_token cookie server-side.
 */
export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Ignore errors — we're logging out regardless
  } finally {
    removeToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
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
  } catch {
    return null;
  }
}

/**
 * Get all available (active) subscription plans.
 * Uses GET /owner/subscription/plans — owner-facing endpoint.
 */
export async function getPlans(): Promise<SubscriptionPlan[]> {
  const res = await api.get<{ data: SubscriptionPlan[] }>(
    "/owner/subscription/plans",
  );
  return res.data;
}

/**
 * Create a new subscription (select plan).
 * Returns payment URL for redirect.
 */
export async function createSubscription(
  data: CreateSubscriptionRequest,
): Promise<CreateSubscriptionResponse["data"]> {
  const res = await api.post<CreateSubscriptionResponse>(
    "/owner/subscription",
    data,
  );
  return res.data;
}

/**
 * Check payment status for a subscription invoice.
 * @param invoiceId - UUID of the invoice (not orderId)
 */
export async function checkPaymentStatus(
  invoiceId: string,
): Promise<CheckPaymentResponse["data"]> {
  const res = await api.post<CheckPaymentResponse>(
    `/owner/subscription/invoices/${invoiceId}/check-payment`,
    {},
  );
  return res.data;
}
