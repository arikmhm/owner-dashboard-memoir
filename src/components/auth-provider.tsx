"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Auth Context Provider
// Provides auth state (user, subscription) to the entire app.
// Routes: /login (public), /onboarding (auth-only, no subscription needed),
//         everything else (auth + active subscription required).
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken, setToken, removeToken, refreshAccessToken, ApiError, TOKEN_REMOVED_EVENT } from "@/lib/api";
import {
  login as apiLogin,
  logout as apiLogout,
  getSubscription,
} from "@/lib/auth-api";
import type {
  AuthUser,
  LoginRequest,
  Subscription,
  SubscriptionResponse,
  SubscriptionStatus,
} from "@/lib/types";

// ── Context types ────────────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null;
  subscription: Subscription | null;
  subscriptionStatus: SubscriptionStatus | null;
  gracePeriodDaysRemaining: number;
  /** PENDING_PAYMENT subscription for in-flight upgrade; null if none */
  pendingUpgrade: Subscription | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshSubscription: () => Promise<void>;
}

type AuthContextType = AuthState & AuthActions;

const AuthContext = createContext<AuthContextType | null>(null);

// ── Helper: decode JWT payload to extract user info ─────────────────────────

function decodeTokenUser(token: string): AuthUser | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    if (!payload.id || !payload.role) return null;
    return {
      id: payload.id,
      email: payload.email ?? "",
      role: payload.role,
    };
  } catch {
    return null;
  }
}

// ── Route classification ─────────────────────────────────────────────────────

/** Routes that don't require any authentication */
const PUBLIC_ROUTES = ["/login"];

/** Routes that require auth but NOT an active subscription */
const AUTH_ONLY_ROUTES = ["/onboarding"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isAuthOnlyRoute(pathname: string): boolean {
  return AUTH_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/** Check if subscription status allows access to dashboard */
function hasActiveSubscription(status: SubscriptionStatus | null): boolean {
  return status === "ACTIVE" || status === "GRACE_PERIOD";
}

// ── Provider component ───────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [gracePeriodDaysRemaining, setGracePeriodDaysRemaining] = useState(0);
  const [pendingUpgrade, setPendingUpgrade] = useState<Subscription | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // ── Initialize: check token on mount ─────────────────────────────────────

  useEffect(() => {
    async function init() {
      // After page refresh, in-memory token is empty.
      // Attempt refresh via HttpOnly refresh_token cookie.
      let token = getToken();
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          setIsLoading(false);
          // Route protection effect handles redirect to /login
          return;
        }
      }

      // Decode JWT for user info (id + role; email is only available during login)
      const restored = decodeTokenUser(token);
      if (!restored) {
        removeToken();
        setIsLoading(false);
        // Route protection effect handles redirect to /login
        return;
      }

      setUser(restored);

      // Fetch subscription status
      try {
        const subResponse = await getSubscription();
        if (subResponse) {
          setSubscription(subResponse.subscription);
          setSubscriptionStatus(subResponse.subscriptionStatus);
          setGracePeriodDaysRemaining(
            subResponse.gracePeriodDaysRemaining ?? 0,
          );
          setPendingUpgrade(subResponse.pendingUpgrade ?? null);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // Token invalid — clear token & user state; apiFetch already
          // attempted refresh and queued a hard redirect, but we also
          // removeToken here defensively in case the flow changes.
          removeToken();
          setUser(null);
          setIsLoading(false);
          return;
        }
        // Non-auth errors: subscription fetch is non-blocking
        setSubscription(null);
        setSubscriptionStatus(null);
        setPendingUpgrade(null);
      }

      setIsLoading(false);
    }

    init();
  }, []);

  // ── Force-logout on token removal (e.g. 401 + refresh failure) ──────────

  useEffect(() => {
    const handleTokenRemoved = () => {
      setUser(null);
      setSubscription(null);
      setSubscriptionStatus(null);
      setGracePeriodDaysRemaining(0);
      setPendingUpgrade(null);
      // isAuthenticated becomes false → route protection effect redirects to /login
    };

    window.addEventListener(TOKEN_REMOVED_EVENT, handleTokenRemoved);
    return () =>
      window.removeEventListener(TOKEN_REMOVED_EVENT, handleTokenRemoved);
  }, []);

  // ── Route protection ─────────────────────────────────────────────────────

  useEffect(() => {
    if (isLoading) return;

    // 1. Not authenticated + not on public route → redirect to login.
    //    Proxy handles this server-side for initial page loads;
    //    this catches client-side state changes (e.g. 401 mid-session).
    if (!isAuthenticated && !isPublicRoute(pathname)) {
      router.replace("/login");
      return;
    }

    // 2. Authenticated + on login page → redirect based on subscription
    if (isAuthenticated && pathname === "/login") {
      if (hasActiveSubscription(subscriptionStatus)) {
        router.replace("/");
      } else {
        router.replace("/onboarding");
      }
      return;
    }

    // 3. Authenticated + on dashboard route (not auth-only) + no active subscription
    //    → redirect to onboarding
    if (
      isAuthenticated &&
      !isPublicRoute(pathname) &&
      !isAuthOnlyRoute(pathname) &&
      !hasActiveSubscription(subscriptionStatus)
    ) {
      router.replace("/onboarding");
      return;
    }

    // 4. Authenticated + on onboarding + HAS active subscription
    //    → redirect to dashboard (no need to onboard again)
    if (
      isAuthenticated &&
      isAuthOnlyRoute(pathname) &&
      hasActiveSubscription(subscriptionStatus)
    ) {
      router.replace("/");
      return;
    }
  }, [isLoading, isAuthenticated, subscriptionStatus, pathname, router]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleLogin = useCallback(
    async (credentials: LoginRequest) => {
      const { user: authUser, accessToken } = await apiLogin(credentials);

      // Fetch subscription BEFORE setting user state.
      // Setting user first would make isAuthenticated=true, which triggers
      // the route-protection effect. That effect would see no subscription
      // yet and prematurely redirect to /onboarding — even if the user has
      // an active subscription that hasn't loaded yet.
      let subStatus: SubscriptionStatus | null = null;
      let subResponse: SubscriptionResponse | null = null;
      try {
        subResponse = await getSubscription();
        if (subResponse) {
          subStatus = subResponse.subscriptionStatus;
        }
      } catch {
        // Non-blocking — treat as no subscription.
        // If getSubscription hit a 401, apiFetch already called removeToken().
        // Restore the token so subsequent navigation works.
        if (!getToken()) {
          setToken(accessToken);
        }
      }

      // Batch all state updates synchronously (React 18+ automatic batching)
      // so the route-protection effect sees the complete picture in one render.
      if (subResponse) {
        setSubscription(subResponse.subscription);
        setSubscriptionStatus(subResponse.subscriptionStatus);
        setGracePeriodDaysRemaining(
          subResponse.gracePeriodDaysRemaining ?? 0,
        );
        setPendingUpgrade(subResponse.pendingUpgrade ?? null);
      }
      setUser(authUser);

      const destination = hasActiveSubscription(subStatus) ? "/" : "/onboarding";
      router.replace(destination);
    },
    [router],
  );

  const handleLogout = useCallback(() => {
    // 1. Clear in-memory token & notify listeners
    removeToken();
    // 2. Clear React state
    setUser(null);
    setSubscription(null);
    setSubscriptionStatus(null);
    setGracePeriodDaysRemaining(0);
    setPendingUpgrade(null);
    // 3. Server-side logout (fire-and-forget — deletes RT + clears HttpOnly cookie)
    apiLogout();
    // 4. SPA redirect
    router.replace("/login");
  }, [router]);

  const refreshSubscription = useCallback(async () => {
    try {
      const subResponse = await getSubscription();
      if (subResponse) {
        setSubscription(subResponse.subscription);
        setSubscriptionStatus(subResponse.subscriptionStatus);
        setGracePeriodDaysRemaining(subResponse.gracePeriodDaysRemaining ?? 0);
        setPendingUpgrade(subResponse.pendingUpgrade ?? null);
      } else {
        setSubscription(null);
        setSubscriptionStatus(null);
        setPendingUpgrade(null);
      }
    } catch {
      setSubscription(null);
      setSubscriptionStatus(null);
      setPendingUpgrade(null);
    }
  }, []);

  // ── Context value ────────────────────────────────────────────────────────

  const value: AuthContextType = {
    user,
    subscription,
    subscriptionStatus,
    gracePeriodDaysRemaining,
    pendingUpgrade,
    isLoading,
    isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
    refreshSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
