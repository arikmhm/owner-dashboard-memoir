"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Kiosk Management Page
// EPIC-OD-03: Full kiosk CRUD with SWR data fetching
// FEAT-OD-03.1 (List), FEAT-OD-03.2 (Create/Edit), FEAT-OD-03.3 (Pairing)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useKiosks } from "@/hooks/use-kiosks";
import { usePlans } from "@/hooks/use-subscription";
import { KioskCard } from "@/components/kiosks/kiosk-card";
import { CreateKioskDialog } from "@/components/kiosks/create-kiosk-dialog";
import { EditKioskDialog } from "@/components/kiosks/edit-kiosk-dialog";
import { PairingCodeDialog } from "@/components/kiosks/pairing-code-dialog";
import { KioskListSkeleton } from "@/components/kiosks/kiosk-skeleton";
import { KioskEmptyState } from "@/components/kiosks/kiosk-empty-state";
import type { Kiosk } from "@/lib/types";

export default function KiosksPage() {
  // ── Auth context — subscription data for max kiosk limit ───────────────
  const { subscription } = useAuth();

  // ── Fetch plans to resolve maxKiosks from subscription.planId ──────────
  const { plans } = usePlans();
  const activePlan = plans.find((p) => p.id === subscription?.planId);
  const maxKiosks = activePlan?.maxKiosks ?? 0;
  const planName = activePlan?.name ?? "—";

  // ── Kiosk data via SWR ─────────────────────────────────────────────────
  const {
    kiosks,
    activeCount,
    isLoading,
    error,
    createKiosk,
    isCreating,
    updateKiosk,
    isUpdating,
    generatePairing,
    isGeneratingPairing,
  } = useKiosks();

  // ── Dialog state ───────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [editKiosk, setEditKiosk] = useState<Kiosk | null>(null);
  const [pairingKiosk, setPairingKiosk] = useState<Kiosk | null>(null);
  const maxReached = activeCount >= maxKiosks && maxKiosks > 0;

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleOpenCreate = useCallback(() => {
    setCreateOpen(true);
  }, []);

  const handleEditKiosk = useCallback((kiosk: Kiosk) => {
    setEditKiosk(kiosk);
  }, []);

  const handleGeneratePairing = useCallback((kiosk: Kiosk) => {
    setPairingKiosk(kiosk);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
            Manajemen Kiosk
          </h1>
          <p className="text-sm text-zinc-500">
            Kelola semua booth fisik dan kode pairing kamu.
            {!isLoading && (
              <span className="text-zinc-400 ml-1">
                {activeCount} / {maxKiosks} kiosk aktif
              </span>
            )}
          </p>
        </div>

        {/* Add Kiosk Button — disabled with tooltip when max reached */}
        {maxReached ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="shrink-0">
                <Button
                  size="sm"
                  className="bg-zinc-950 text-white hover:bg-zinc-800 pointer-events-none opacity-50"
                  disabled
                  aria-disabled="true"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Tambah Kiosk
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>
                Limit kiosk dari plan {planName} tercapai. Upgrade plan untuk
                menambah.
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            size="sm"
            className="bg-zinc-950 text-white hover:bg-zinc-800 shrink-0"
            onClick={handleOpenCreate}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Tambah Kiosk
          </Button>
        )}
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Gagal memuat data kiosk
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {error.message || "Terjadi kesalahan, coba lagi nanti"}
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && <KioskListSkeleton />}

      {/* Empty state */}
      {!isLoading && !error && kiosks.length === 0 && (
        <KioskEmptyState onAdd={handleOpenCreate} />
      )}

      {/* Kiosk list */}
      {!isLoading && kiosks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
          {kiosks.map((kiosk) => (
            <KioskCard
              key={kiosk.id}
              kiosk={kiosk}
              onEdit={handleEditKiosk}
              onGeneratePairing={handleGeneratePairing}
            />
          ))}
        </div>
      )}

      {/* Create Kiosk Dialog */}
      <CreateKioskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={createKiosk}
        isSubmitting={isCreating}
        maxReached={maxReached}
        planName={planName}
      />

      {/* Edit Kiosk Dialog */}
      <EditKioskDialog
        kiosk={editKiosk}
        open={!!editKiosk}
        onOpenChange={(open) => {
          if (!open) setEditKiosk(null);
        }}
        onSubmit={updateKiosk}
        isSubmitting={isUpdating}
      />

      {/* Pairing Code Dialog */}
      <PairingCodeDialog
        kiosk={pairingKiosk}
        open={!!pairingKiosk}
        onOpenChange={(open) => {
          if (!open) setPairingKiosk(null);
        }}
        onGenerate={generatePairing}
        isGenerating={isGeneratingPairing}
      />
    </div>
  );
}
