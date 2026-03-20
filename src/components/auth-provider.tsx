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
import { getToken, setToken, removeToken, getStoredUser, ApiError, TOKEN_REMOVED_EVENT } from "@/lib/api";
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

// ── Helper: restore user from localStorage or JWT fallback ───────────────────

function restoreUser(): AuthUser | null {
  // Prefer stored user data (set during login) — has email.
  // JWT only contains { id, role }, so email would be lost on decode.
  const stored = getStoredUser();
  if (stored && stored.id && stored.role) {
    return {
      id: stored.id,
      email: stored.email,
      role: stored.role as AuthUser["role"],
    };
  }

  // Fallback: decode JWT for minimal info (id + role only)
  const token = getToken();
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return {
      id: payload.id ?? payload.sub,
      email: "",
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
      const token = getToken();

      if (!token) {
        setIsLoading(false);
        if (!isPublicRoute(pathname)) {
          router.replace("/login");
        }
        return;
      }

      // Restore user from localStorage (has email) or JWT fallback (id+role only)
      const restored = restoreUser();
      if (!restored) {
        removeToken();
        setIsLoading(false);
        if (!isPublicRoute(pathname)) {
          router.replace("/login");
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // 1. Not authenticated + not on public route → redirect to login
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
        // If getSubscription hit a 401, apiFetch already called removeToken()
        // and scheduled window.location.href = "/login". Restore the token so
        // the redirect (or page reload) lands with valid auth state.
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

      // Navigate to the appropriate page.
      // Use window.location.href (full reload) instead of router.replace to:
      // 1. Override any pending hard redirect to /login from apiFetch's 401 handler
      // 2. Ensure clean state initialization on the destination page
      const destination = hasActiveSubscription(subStatus) ? "/" : "/onboarding";
      window.location.href = destination;
    },
    [],
  );

  const handleLogout = useCallback(() => {
    setUser(null);
    setSubscription(null);
    setSubscriptionStatus(null);
    setGracePeriodDaysRemaining(0);
    setPendingUpgrade(null);
    // apiLogout is async but we don't need to wait — it handles redirect
    apiLogout();
  }, []);

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

  // Show a loading indicator on protected routes while redirect to /login is
  // pending. Without this guard, the protected page component renders with no
  // auth data and produces a blank white screen.
  if (
    !isLoading &&
    !isAuthenticated &&
    !isPublicRoute(pathname) &&
    !isAuthOnlyRoute(pathname)
  ) {
    return (
      <AuthContext.Provider value={value}>
        <div className="min-h-screen flex items-center justify-center bg-zinc-50">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
        </div>
      </AuthContext.Provider>
    );
  }

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
