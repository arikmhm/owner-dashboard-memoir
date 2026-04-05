import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiSuccessResponse } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Dashboard Data Hook
// Single query to GET /owner/dashboard — server-side aggregation
// ─────────────────────────────────────────────────────────────────────────────

interface UseDashboardReturn {
  /** Server-aggregated dashboard stats */
  summary: DashboardSummary | null;
  /** Whether data is still loading */
  isLoading: boolean;
  /** Whether data is being refetched in background */
  isRefetching: boolean;
  /** Error from fetch */
  error: Error | null;
  /** Revalidate dashboard data */
  refresh: () => void;
}

export function useDashboard(): UseDashboardReturn {
  const queryClient = useQueryClient();

  const { data, isLoading, isRefetching, error } = useQuery<DashboardSummary>({
    queryKey: ["/owner/dashboard"],
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<DashboardSummary>>(
        "/owner/dashboard",
      );
      return res.data;
    },
    staleTime: 30_000,
  });

  return {
    summary: data ?? null,
    isLoading,
    isRefetching,
    error: (error as Error) ?? null,
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: ["/owner/dashboard"] }),
  };
}
