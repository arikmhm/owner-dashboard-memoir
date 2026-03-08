"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — TanStack Query Provider
// Global React Query configuration for data fetching, caching & mutations
// ─────────────────────────────────────────────────────────────────────────────

import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";
import { api } from "@/lib/api";
import type { ApiSuccessResponse } from "@/lib/api";

/**
 * Default query function: uses our API client and unwraps { data: T }.
 * Query keys should be API endpoint paths (e.g., ["/owner/wallet"]).
 */
async function defaultQueryFn<T>({
  queryKey,
}: {
  queryKey: readonly unknown[];
}): Promise<T> {
  const endpoint = queryKey[0] as string;
  const res = await api.get<ApiSuccessResponse<T>>(endpoint);
  return res.data;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: defaultQueryFn,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          // Don't retry on auth/authorization/not-found errors
          const status = (error as { status?: number }).status;
          if (status === 401 || status === 403 || status === 404) return false;
          return failureCount < 3;
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
