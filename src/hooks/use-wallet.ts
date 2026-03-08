import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { ApiSuccessResponse } from "@/lib/api";
import type {
  WalletMutation,
  Withdrawal,
  WithdrawalStatus,
  PaginationMeta,
  CreateWithdrawalRequest,
  CreateWithdrawalResponse,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Wallet & Withdrawal Hooks
// TanStack Query data fetching + mutations for EPIC-OD-06
// Best practices: client-query-dedup, keepPreviousData, optimistic-updates
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

interface WalletApiResponse {
  data: {
    balance: number;
    mutations: WalletMutation[];
  };
  meta: PaginationMeta;
}

interface WalletPageData {
  balance: number;
  mutations: WalletMutation[];
  meta: PaginationMeta;
}

interface WithdrawalPageData {
  items: Withdrawal[];
  meta: PaginationMeta;
}

interface WithdrawalApiResponse {
  data: Withdrawal[];
  meta: PaginationMeta;
}

// ── Wallet Hook ──────────────────────────────────────────────────────────────

export interface UseWalletReturn {
  /** Current wallet balance */
  balance: number;
  /** Paginated wallet mutations */
  mutations: WalletMutation[];
  /** Pagination meta for mutations */
  meta: PaginationMeta | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error from fetch */
  error: Error | null;
  /** Revalidate wallet data */
  refresh: () => void;
}

export function useWallet(page = 1, limit = 20): UseWalletReturn {
  const queryClient = useQueryClient();
  const endpoint = `/owner/wallet?page=${page}&limit=${limit}`;

  const { data, error, isLoading } = useQuery<WalletPageData>({
    queryKey: ["wallet", page, limit],
    queryFn: async (): Promise<WalletPageData> => {
      const res = await api.get<WalletApiResponse>(endpoint);
      return {
        balance: res.data.balance,
        mutations: res.data.mutations,
        meta: res.meta,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  return {
    balance: data?.balance ?? 0,
    mutations: data?.mutations ?? [],
    meta: data?.meta ?? null,
    isLoading,
    error: (error as Error) ?? null,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["wallet"] }),
  };
}

// ── Withdrawal Hook ──────────────────────────────────────────────────────────

export interface UseWithdrawalsReturn {
  /** Paginated list of withdrawals */
  withdrawals: Withdrawal[];
  /** Pagination meta */
  meta: PaginationMeta | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error from fetch */
  error: Error | null;
  /** Whether there's a PENDING withdrawal */
  hasPending: boolean;
  /** Revalidate list */
  refresh: () => void;
  /** Create a new withdrawal request */
  createWithdrawal: (
    data: CreateWithdrawalRequest,
  ) => Promise<CreateWithdrawalResponse>;
  /** Whether create mutation is in flight */
  isCreating: boolean;
  /** Error from create mutation (typed for specific error codes) */
  createError: ApiError | null;
}

export function useWithdrawals(page = 1, limit = 20): UseWithdrawalsReturn {
  const queryClient = useQueryClient();
  const endpoint = `/owner/withdrawals?page=${page}&limit=${limit}`;

  const { data, error, isLoading } = useQuery<WithdrawalPageData>({
    queryKey: ["withdrawals", page, limit],
    queryFn: async (): Promise<WithdrawalPageData> => {
      const res = await api.get<WithdrawalApiResponse>(endpoint);
      return {
        items: res.data,
        meta: res.meta,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (
      reqData: CreateWithdrawalRequest,
    ): Promise<CreateWithdrawalResponse> => {
      const res = await api.post<ApiSuccessResponse<CreateWithdrawalResponse>>(
        "/owner/withdrawals",
        reqData,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });

  const hasPending =
    data?.items.some((w: Withdrawal) => w.status === "PENDING") ?? false;

  return {
    withdrawals: data?.items ?? [],
    meta: data?.meta ?? null,
    isLoading,
    error: (error as Error) ?? null,
    hasPending,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["withdrawals"] }),
    createWithdrawal: async (reqData: CreateWithdrawalRequest) => {
      return createMutation.mutateAsync(reqData);
    },
    isCreating: createMutation.isPending,
    createError: (createMutation.error as ApiError) ?? null,
  };
}
