import { useQueries, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiSuccessResponse } from "@/lib/api";
import type {
  Kiosk,
  Transaction,
  WalletResponse,
  SubscriptionResponse,
  SubscriptionPlan,
  PaginationMeta,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Dashboard Data Hook
// Parallel TanStack Query fetching for dashboard summary stats
// Best practice: async-parallel — fetch all independent data simultaneously
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardData {
  /** Wallet balance in Rupiah */
  walletBalance: number;
  /** Total revenue this month (sum of PAID transactions) */
  totalRevenueThisMonth: number;
  /** Number of PAID transactions created today */
  totalTransactionsToday: number;
  /** Number of currently active kiosks */
  activeKiosks: number;
  /** Max kiosks allowed by subscription plan */
  maxKiosks: number;
  /** Subscription plan name */
  planName: string;
}

interface UseDashboardReturn {
  /** Aggregated dashboard stats */
  stats: DashboardData | null;
  /** Subscription data from auth context augmented with fresh data */
  subscription: SubscriptionResponse | null;
  /** Whether any required data is still loading */
  isLoading: boolean;
  /** First error encountered across all fetches */
  error: Error | null;
  /** Revalidate all dashboard data */
  refresh: () => void;
}

/** Response shape for paginated transactions (preserves meta for total count) */
type TxPaginatedResponse = { data: Transaction[]; meta: PaginationMeta };

/**
 * Build query params for today's transactions filter.
 * Uses [startOfDay, startOfNextDay) range because BE endDate filter uses
 * strictly-less-than (<), not less-than-or-equal.
 */
function getTodayParams(): string {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfNextDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  return `?status=PAID&startDate=${startOfDay.toISOString()}&endDate=${startOfNextDay.toISOString()}&limit=1`;
}

/**
 * Build query params for this month's transactions (for revenue calculation).
 * Uses [startOfMonth, startOfNextMonth) range for the same reason.
 */
function getMonthParams(): string {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `?status=PAID&startDate=${startOfMonth.toISOString()}&endDate=${startOfNextMonth.toISOString()}&limit=100`;
}

/**
 * Custom hook for Dashboard Home page.
 *
 * Fetches 4 independent API endpoints in parallel using TanStack Query useQueries:
 * - GET /owner/subscription → subscription status + plan info
 * - GET /owner/wallet → wallet balance
 * - GET /owner/kiosks → kiosk count
 * - GET /owner/transactions → today count + monthly revenue
 *
 * @see vercel-react-best-practices: async-parallel
 * @see FEAT-OD-02.1 requirements
 */
export function useDashboard(): UseDashboardReturn {
  const queryClient = useQueryClient();

  const todayKey = `/owner/transactions${getTodayParams()}`;
  const monthKey = `/owner/transactions${getMonthParams()}`;

  const [
    subQuery,
    walletQuery,
    kiosksQuery,
    todayTxQuery,
    monthTxQuery,
    plansQuery,
  ] = useQueries({
    queries: [
      // 1. Subscription (uses defaultQueryFn which unwraps { data: T })
      {
        queryKey: ["/owner/subscription"] as const,
        staleTime: 60_000,
      },
      // 2. Wallet balance (uses defaultQueryFn)
      {
        queryKey: ["/owner/wallet?limit=1"] as const,
        staleTime: 60_000,
      },
      // 3. Kiosks (uses defaultQueryFn)
      {
        queryKey: ["/owner/kiosks"] as const,
        staleTime: 60_000,
      },
      // 4. Today's transactions — custom fetcher to keep meta.total
      {
        queryKey: ["transactions", "today", todayKey] as const,
        queryFn: () => api.get<TxPaginatedResponse>(todayKey),
        staleTime: 30_000,
      },
      // 5. Monthly transactions — custom fetcher to keep data for revenue sum
      {
        queryKey: ["transactions", "month", monthKey] as const,
        queryFn: () => api.get<TxPaginatedResponse>(monthKey),
        staleTime: 60_000,
      },
      // 6. Plans — needed to resolve plan name & maxKiosks from subscription.planId
      {
        queryKey: ["subscription-plans"] as const,
        queryFn: async () => {
          const res = await api.get<ApiSuccessResponse<SubscriptionPlan[]>>(
            "/owner/subscription/plans",
          );
          return res.data;
        },
        staleTime: 5 * 60_000,
      },
    ],
  });

  // Type-narrow the query results
  const subscriptionData = subQuery.data as SubscriptionResponse | undefined;
  const walletData = walletQuery.data as WalletResponse | undefined;
  const kiosksData = kiosksQuery.data as Kiosk[] | undefined;
  const todayTxRaw = todayTxQuery.data as TxPaginatedResponse | undefined;
  const monthTxRaw = monthTxQuery.data as TxPaginatedResponse | undefined;
  const plansData = plansQuery.data as SubscriptionPlan[] | undefined;

  // ── Derive aggregated status ─────────────────────────────────────────────

  const isLoading =
    subQuery.isLoading ||
    walletQuery.isLoading ||
    kiosksQuery.isLoading ||
    todayTxQuery.isLoading ||
    monthTxQuery.isLoading ||
    plansQuery.isLoading;

  const error =
    (subQuery.error as Error | null) ??
    (walletQuery.error as Error | null) ??
    (kiosksQuery.error as Error | null) ??
    (todayTxQuery.error as Error | null) ??
    (monthTxQuery.error as Error | null) ??
    (plansQuery.error as Error | null) ??
    null;

  let stats: DashboardData | null = null;

  if (!isLoading) {
    // Extract today's transaction count from paginated response
    const todayTotal = todayTxRaw?.meta?.total ?? 0;

    // Calculate monthly revenue from PAID transactions
    const monthlyTransactions = monthTxRaw?.data ?? [];
    const totalRevenueThisMonth = monthlyTransactions.reduce(
      (sum: number, tx: Transaction) => sum + (tx.totalAmount ?? 0),
      0,
    );

    // Kiosks: count active vs plan max
    const kiosks = kiosksData ?? [];
    const activeKiosks = kiosks.filter((k) => k.isActive).length;

    // Resolve plan from plans list using subscription.planId
    const activePlan = plansData?.find(
      (p) => p.id === subscriptionData?.subscription?.planId,
    );
    const maxKiosks = activePlan?.maxKiosks ?? activeKiosks;

    stats = {
      walletBalance: walletData?.balance ?? 0,
      totalRevenueThisMonth,
      totalTransactionsToday: todayTotal,
      activeKiosks,
      maxKiosks,
      planName: activePlan?.name ?? "—",
    };
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/owner/subscription"] });
    queryClient.invalidateQueries({ queryKey: ["/owner/wallet?limit=1"] });
    queryClient.invalidateQueries({ queryKey: ["/owner/kiosks"] });
    queryClient.invalidateQueries({ queryKey: ["transactions", "today"] });
    queryClient.invalidateQueries({ queryKey: ["transactions", "month"] });
    queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
  };

  return {
    stats,
    subscription: subscriptionData ?? null,
    isLoading,
    error,
    refresh,
  };
}
