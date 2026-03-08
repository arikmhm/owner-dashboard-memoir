import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiPaginatedResponse } from "@/lib/api";
import type {
  Transaction,
  TxStatus,
  PaymentMethod,
  PaginationMeta,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Transaction History Hook
// TanStack Query data fetching for EPIC-OD-05
// Best practices: client-query-dedup, keepPreviousData for pagination
// ─────────────────────────────────────────────────────────────────────────────

// ── Filter params ────────────────────────────────────────────────────────────

export interface TransactionFilters {
  kioskId?: string;
  status?: TxStatus;
  paymentMethod?: PaymentMethod;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ── Response type (paginated) ────────────────────────────────────────────────

interface TransactionPageData {
  items: Transaction[];
  meta: PaginationMeta;
}

// ── Build query string from filters ──────────────────────────────────────────

function buildQueryString(filters: TransactionFilters): string {
  const params = new URLSearchParams();

  if (filters.kioskId) params.set("kioskId", filters.kioskId);
  if (filters.status) params.set("status", filters.status);
  if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));

  return params.toString();
}

// ── Main Hook ────────────────────────────────────────────────────────────────

export interface UseTransactionsReturn {
  /** Paginated list of transactions */
  transactions: Transaction[];
  /** Pagination metadata */
  meta: PaginationMeta | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error from fetch */
  error: Error | null;
  /** Revalidate list */
  refresh: () => void;
}

export function useTransactions(
  filters: TransactionFilters = {},
): UseTransactionsReturn {
  const queryClient = useQueryClient();
  const qs = buildQueryString(filters);
  const endpoint = `/owner/transactions?${qs}`;

  const { data, error, isLoading } = useQuery<TransactionPageData>({
    queryKey: ["transactions", qs],
    queryFn: async (): Promise<TransactionPageData> => {
      const res = await api.get<ApiPaginatedResponse<Transaction>>(endpoint);
      return {
        items: res.data,
        meta: res.meta,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  return {
    transactions: data?.items ?? [],
    meta: data?.meta ?? null,
    isLoading,
    error: (error as Error) ?? null,
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: ["transactions", qs] }),
  };
}
