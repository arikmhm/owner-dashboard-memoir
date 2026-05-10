"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, AlertCircle, QrCode } from "lucide-react";
import Image from "next/image";
import { usePaymentConfigs } from "@/hooks/use-payment-configs";
import { PaymentConfigCard } from "@/components/payment-configs/payment-config-card";
import { SetupQrisDinamisDialog } from "@/components/payment-configs/create-payment-config-dialog";

export default function PaymentConfigsPage() {
  const {
    configs,
    isLoading,
    error,
    createConfig,
    updateConfig,
    deleteConfig,
    validateConfig,
    setDefaultConfig,
  } = usePaymentConfigs();

  const [setupOpen, setSetupOpen] = useState(false);

  const config = configs[0] ?? null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-5 border-b border-zinc-200">
        <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
          Payment Gateway
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Konfigurasi payment gateway untuk memproses QRIS Dinamis di kiosk Anda.
        </p>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex items-start gap-3 rounded-sm border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Gagal memuat konfigurasi
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {error.message || "Terjadi kesalahan, coba lagi nanti"}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && <PaymentConfigSkeleton />}

      {/* Empty */}
      {!isLoading && !error && !config && (
        <QrisDinamisEmptyState onSetup={() => setSetupOpen(true)} />
      )}

      {/* Config */}
      {!isLoading && config && (
        <PaymentConfigCard
          config={config}
          onValidate={() => validateConfig(config.id)}
          onSetDefault={() => setDefaultConfig(config.id)}
          onUpdate={updateConfig}
          onDelete={() => deleteConfig(config.id)}
        />
      )}

      {/* Provider note */}
      {!isLoading && (
        <div className="flex items-center gap-2.5 pt-4 border-t border-zinc-100">
          <Image
            src="/logos/doku.png"
            alt="DOKU"
            width={28}
            height={28}
            className="rounded-sm opacity-60"
            unoptimized
          />
          <p className="text-xs text-zinc-400">
            Payment gateway saat ini menggunakan DOKU sebagai provider.
          </p>
        </div>
      )}

      {/* Setup Dialog */}
      <SetupQrisDinamisDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onSubmit={createConfig}
      />
    </div>
  );
}

function PaymentConfigSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
      <div className="pt-1 flex gap-2 border-t border-zinc-100">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-16" />
      </div>
    </div>
  );
}

function QrisDinamisEmptyState({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-zinc-100 p-4 mb-4">
        <QrCode className="h-6 w-6 text-zinc-400" />
      </div>
      <p className="text-sm font-medium text-zinc-700 mb-1">
        Belum dikonfigurasi
      </p>
      <p className="text-xs text-zinc-400 mb-5 max-w-xs">
        Setup QRIS Dinamis untuk menerima pembayaran langsung dari kiosk Anda.
      </p>
      <Button
        size="sm"
        className="bg-zinc-950 text-white hover:bg-zinc-800"
        onClick={onSetup}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Setup QRIS Dinamis
      </Button>
    </div>
  );
}
