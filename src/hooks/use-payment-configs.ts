import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiSuccessResponse } from "@/lib/api";
import type { PaymentConfig, PaymentProviderCode } from "@/lib/types";

const PAYMENT_CONFIGS_KEY = ["/owner/payment-configs"] as const;

export interface CreatePaymentConfigRequest {
  providerCode: PaymentProviderCode;
  label: string;
  credentials: Record<string, string>;
}

export interface UpdatePaymentConfigRequest {
  label?: string;
  credentials?: Record<string, string>;
}

export interface ValidateConfigResponse {
  config: PaymentConfig;
  validatedOk: boolean;
  error: string | null;
}

export function usePaymentConfigs() {
  const queryClient = useQueryClient();

  const {
    data: configs,
    isLoading,
    error,
  } = useQuery<PaymentConfig[]>({
    queryKey: PAYMENT_CONFIGS_KEY,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: async (
      data: CreatePaymentConfigRequest,
    ): Promise<PaymentConfig> => {
      const res = await api.post<ApiSuccessResponse<{ config: PaymentConfig }>>(
        "/owner/payment-configs",
        data,
      );
      return res.data.config;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_CONFIGS_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdatePaymentConfigRequest;
    }): Promise<PaymentConfig> => {
      const res = await api.patch<ApiSuccessResponse<{ config: PaymentConfig }>>(
        `/owner/payment-configs/${id}`,
        data,
      );
      return res.data.config;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_CONFIGS_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/owner/payment-configs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_CONFIGS_KEY });
    },
  });

  const validateMutation = useMutation({
    mutationFn: async (id: string): Promise<ValidateConfigResponse> => {
      const res = await api.post<ApiSuccessResponse<ValidateConfigResponse>>(
        `/owner/payment-configs/${id}/validate`,
        {},
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_CONFIGS_KEY });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string): Promise<PaymentConfig> => {
      const res = await api.post<ApiSuccessResponse<{ config: PaymentConfig }>>(
        `/owner/payment-configs/${id}/set-default`,
        {},
      );
      return res.data.config;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_CONFIGS_KEY });
    },
  });

  return {
    configs: configs ?? [],
    isLoading,
    error: error as Error | null,
    refresh: () => queryClient.invalidateQueries({ queryKey: PAYMENT_CONFIGS_KEY }),

    createConfig: (data: CreatePaymentConfigRequest) =>
      createMutation.mutateAsync(data),
    isCreating: createMutation.isPending,

    updateConfig: (id: string, data: UpdatePaymentConfigRequest) =>
      updateMutation.mutateAsync({ id, data }),

    deleteConfig: (id: string) => deleteMutation.mutateAsync(id),

    validateConfig: (id: string) => validateMutation.mutateAsync(id),

    setDefaultConfig: (id: string) => setDefaultMutation.mutateAsync(id),
  };
}
