import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { ApiPaginatedResponse, ApiSuccessResponse } from "@/lib/api";
import type {
  SubscriptionPlan,
  SubscriptionInvoice,
  PaginationMeta,
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  CheckPaymentResponse,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Subscription Management Hooks
// TanStack Query data fetching for EPIC-OD-07
// Best practices: client-query-dedup, keepPreviousData, staleTime
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

interface InvoicePageData {
  items: SubscriptionInvoice[];
  meta: PaginationMeta;
}

// ── Plans Hook ───────────────────────────────────────────────────────────────

export interface UsePlansReturn {
  /** Available subscription plans */
  plans: SubscriptionPlan[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Error from fetch */
  error: Error | null;
}

export function usePlans(): UsePlansReturn {
  const { data, error, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<SubscriptionPlan[]>>(
        "/owner/subscription/plans",
      );
      return res.data;
    },
    staleTime: 5 * 60_000, // plans rarely change
  });

  return {
    plans: data ?? [],
    isLoading,
    error: (error as Error) ?? null,
  };
}

// ── Invoices Hook ────────────────────────────────────────────────────────────

export interface UseInvoicesReturn {
  /** Paginated list of invoices */
  invoices: SubscriptionInvoice[];
  /** Pagination meta */
  meta: PaginationMeta | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error from fetch */
  error: Error | null;
  /** Revalidate list */
  refresh: () => void;
}

export function useInvoices(page = 1, limit = 20): UseInvoicesReturn {
  const queryClient = useQueryClient();
  const endpoint = `/owner/subscription/invoices?page=${page}&limit=${limit}`;

  const { data, error, isLoading } = useQuery<InvoicePageData>({
    queryKey: ["invoices", page, limit],
    queryFn: async (): Promise<InvoicePageData> => {
      const res =
        await api.get<ApiPaginatedResponse<SubscriptionInvoice>>(endpoint);
      return {
        items: res.data,
        meta: res.meta,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  return {
    invoices: data?.items ?? [],
    meta: data?.meta ?? null,
    isLoading,
    error: (error as Error) ?? null,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  };
}

// ── Subscription Actions ─────────────────────────────────────────────────────

/**
 * Create/upgrade subscription. Returns payment URL for redirect.
 */
export async function submitSubscription(
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
 */
export async function checkInvoicePayment(
  invoiceId: string,
): Promise<CheckPaymentResponse["data"]> {
  const res = await api.post<CheckPaymentResponse>(
    `/owner/subscription/invoices/${invoiceId}/check-payment`,
    {},
  );
  return res.data;
}
