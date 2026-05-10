import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiPaginatedResponse } from "@/lib/api";
import type {
  Transaction,
  TransactionDetail,
  TransactionType,
  TxStatus,
  PaymentMethod,
  PaginationMeta,
} from "@/lib/types";

// ── Filter params ────────────────────────────────────────────────────────────

export interface TransactionFilters {
  kioskId?: string;
  status?: TxStatus;
  paymentMethod?: PaymentMethod;
  transactionType?: TransactionType;
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
  if (filters.transactionType) params.set("transactionType", filters.transactionType);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));

  return params.toString();
}

// ── List Hook ────────────────────────────────────────────────────────────────

export interface UseTransactionsReturn {
  transactions: Transaction[];
  meta: PaginationMeta | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useTransactions(
  filters: TransactionFilters = {},
): UseTransactionsReturn {
  const queryClient = useQueryClient();
  const qs = buildQueryString(filters);
  const endpoint = `/owner/transactions?${qs}`;

  const { data, error, isLoading, isRefetching } = useQuery<TransactionPageData>({
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
    isRefetching,
    error: (error as Error) ?? null,
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: ["transactions", qs] }),
  };
}

// ── Detail Hook ───────────────────────────────────────────────────────────────

export interface UseTransactionDetailReturn {
  detail: TransactionDetail | null;
  isLoading: boolean;
  error: Error | null;
}

export function useTransactionDetail(
  id: string | null,
): UseTransactionDetailReturn {
  const { data, error, isLoading } = useQuery<TransactionDetail>({
    queryKey: ["transaction", id],
    queryFn: async (): Promise<TransactionDetail> => {
      const res = await api.get<{ data: { transaction: TransactionDetail } }>(
        `/owner/transactions/${id}`,
      );
      return res.data.transaction;
    },
    enabled: !!id,
    staleTime: 60_000,
  });

  return {
    detail: data ?? null,
    isLoading,
    error: (error as Error) ?? null,
  };
}
