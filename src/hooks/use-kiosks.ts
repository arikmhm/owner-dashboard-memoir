import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiSuccessResponse } from "@/lib/api";
import type { Kiosk } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Kiosk Management Hooks
// TanStack Query data fetching + mutations for EPIC-OD-03
// Best practices: client-query-dedup, async-parallel, optimistic-updates
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Create kiosk request body.
 * 
 * Required:
 * - name: Kiosk name (min length 1)
 * 
 * Optional pricing (if not provided, BE applies defaults):
 * - priceBaseSession: 25,000 IDR
 * - pricePerExtraPrint: 5,000 IDR
 * - priceDigitalCopy: 10,000 IDR
 */
export interface CreateKioskRequest {
  name: string;
  priceBaseSession?: number;
  pricePerExtraPrint?: number;
  priceDigitalCopy?: number;
}

export interface CreateKioskResponse {
  kiosk: {
    id: string;
    name: string;
    pairingCode: string | null;
  };
}

/**
 * Update kiosk request body (PATCH /owner/kiosks/{id}).
 * 
 * All fields are optional. Partial update supported by BE per spec:
 * - Only fields provided in request body will be updated
 * - Fields omitted are not changed (immutable)
 * 
 * Important notes:
 * - Pricing updates apply only to new transactions onwards
 * - Previous transaction prices are snapshots (immutable & historic)
 * - Ownership: BE validates ownership (404 NOT_FOUND if unauthorized/not found)
 */
export interface UpdateKioskRequest {
  name?: string;
  priceBaseSession?: number;
  pricePerExtraPrint?: number;
  priceDigitalCopy?: number;
}

/**
 * Generate Pairing Code response (POST /owner/kiosks/{id}/generate-pairing).
 * 
 * Important side effects when new code is generated:
 * - Resets kiosk's deviceToken to null
 * - Resets pairedAt timestamp to null
 * - Sets new pairingCodeExpiresAt with fresh expiry time
 * - Previous pairing code becomes invalid immediately
 * - Any running Electron device loses access (receives 401 unauthorized)
 * 
 * Code format: 6-digit numeric string (000000 - 999999)
 * Code expiry: Device must pair before code expires (backend determines timeframe)
 */
export interface GeneratePairingResponse {
  pairingCode: string;
}

// ── Query Key ────────────────────────────────────────────────────────────────

const KIOSKS_KEY = ["/owner/kiosks"] as const;

// ── Main Hook ────────────────────────────────────────────────────────────────

export interface UseKiosksReturn {
  /** List of all kiosks */
  kiosks: Kiosk[];
  /** Whether kiosk data is loading */
  isLoading: boolean;
  /** Error from list fetch */
  error: Error | null;
  /** Revalidate kiosk list */
  refresh: () => void;

  /** Create a new kiosk. Returns the new kiosk with pairing code. */
  createKiosk: (data: CreateKioskRequest) => Promise<CreateKioskResponse>;
  /** Whether create mutation is in flight */
  isCreating: boolean;

  /** Update an existing kiosk. Returns the updated kiosk. */
  updateKiosk: (id: string, data: UpdateKioskRequest) => Promise<Kiosk>;
  /** Whether update mutation is in flight */
  isUpdating: boolean;

  /** Generate a new pairing code for a kiosk. */
  generatePairing: (id: string) => Promise<GeneratePairingResponse>;
  /** Whether generate-pairing mutation is in flight */
  isGeneratingPairing: boolean;
}

/**
 * Custom hook for Kiosk Management (FEAT-OD-03.1, 03.2, 03.3).
 *
 * Provides:
 * - TanStack Query-cached kiosk list with auto-dedup
 * - Create kiosk mutation with cache invalidation
 * - Edit kiosk with optimistic update
 * - Generate pairing code
 */
export function useKiosks(): UseKiosksReturn {
  const queryClient = useQueryClient();

  // ── List fetch (uses defaultQueryFn which unwraps { data: T }) ─────────

  const {
    data: kiosks,
    error,
    isLoading,
  } = useQuery<Kiosk[]>({
    queryKey: KIOSKS_KEY,
    staleTime: 60_000,
  });

  // ── Create mutation ────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (
      data: CreateKioskRequest,
    ): Promise<CreateKioskResponse> => {
      const res = await api.post<ApiSuccessResponse<CreateKioskResponse>>(
        "/owner/kiosks",
        data,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KIOSKS_KEY });
    },
  });

  // ── Update mutation ────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateKioskRequest;
    }): Promise<Kiosk> => {
      const res = await api.patch<ApiSuccessResponse<{ kiosk: Kiosk }>>(
        `/owner/kiosks/${id}`,
        data,
      );
      return res.data.kiosk;
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: KIOSKS_KEY });

      // Snapshot the previous value
      const previousKiosks = queryClient.getQueryData<Kiosk[]>(KIOSKS_KEY);

      // Optimistically update the cache
      queryClient.setQueryData<Kiosk[]>(KIOSKS_KEY, (old) => {
        if (!old) return [];
        return old.map((k) => (k.id === id ? { ...k, ...data } : k));
      });

      return { previousKiosks };
    },
    onError: (_err, _vars, context) => {
      // Rollback to previous value on error
      if (context?.previousKiosks) {
        queryClient.setQueryData(KIOSKS_KEY, context.previousKiosks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KIOSKS_KEY });
    },
  });

  // ── Generate pairing mutation ──────────────────────────────────────────

  const pairingMutation = useMutation({
    mutationFn: async (id: string): Promise<GeneratePairingResponse> => {
      const res = await api.post<ApiSuccessResponse<GeneratePairingResponse>>(
        `/owner/kiosks/${id}/generate-pairing`,
        {}, // BE requires empty body
      );
      return res.data;
    },
    onSuccess: () => {
      // Revalidate to fetch fresh pairedAt (reset to null on new code)
      queryClient.invalidateQueries({ queryKey: KIOSKS_KEY });
    },
  });

  // ── Derived values ─────────────────────────────────────────────────────

  const kioskList = kiosks ?? [];

  // ── Actions (wrap mutations for a clean API) ───────────────────────────

  async function createKiosk(
    data: CreateKioskRequest,
  ): Promise<CreateKioskResponse> {
    return createMutation.mutateAsync(data);
  }

  async function updateKiosk(
    id: string,
    data: UpdateKioskRequest,
  ): Promise<Kiosk> {
    return updateMutation.mutateAsync({ id, data });
  }

  async function generatePairing(id: string): Promise<GeneratePairingResponse> {
    return pairingMutation.mutateAsync(id);
  }

  return {
    kiosks: kioskList,
    isLoading,
    error: (error as Error) ?? null,
    refresh: () => queryClient.invalidateQueries({ queryKey: KIOSKS_KEY }),
    createKiosk,
    isCreating: createMutation.isPending,
    updateKiosk,
    isUpdating: updateMutation.isPending,
    generatePairing,
    isGeneratingPairing: pairingMutation.isPending,
  };
}
