"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Pairing Code Dialog
// Generate or reset pairing code for a kiosk (FEAT-OD-03.3)
// Includes confirmation dialog for re-pair and prominent code display
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import type { Kiosk } from "@/lib/types";
import type { GeneratePairingResponse } from "@/hooks/use-kiosks";

type DialogStep = "confirm" | "result";

interface PairingCodeDialogProps {
  kiosk: Kiosk | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (id: string) => Promise<GeneratePairingResponse>;
  isGenerating: boolean;
}

export function PairingCodeDialog({
  kiosk,
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
}: PairingCodeDialogProps) {
  const isPaired = !!kiosk?.pairedAt;
  const [step, setStep] = useState<DialogStep>(
    isPaired ? "confirm" : "confirm",
  );
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state when dialog opens/closes or kiosk changes
  useEffect(() => {
    if (open && kiosk) {
      setStep(isPaired ? "confirm" : "confirm");
      setPairingCode(null);
      setCopied(false);
    }
  }, [open, kiosk, isPaired]);

  const handleGenerate = useCallback(async () => {
    if (!kiosk) return;
    try {
      const result = await onGenerate(kiosk.id);
      setPairingCode(result.pairingCode);
      setStep("result");
      toast.success("Pairing code berhasil di-generate!");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || "Gagal generate pairing code");
      } else {
        toast.error("Terjadi kesalahan, coba lagi nanti");
      }
    }
  }, [kiosk, onGenerate]);

  const handleCopyCode = useCallback(async () => {
    if (!pairingCode) return;
    try {
      await navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      toast.success("Code disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin code");
    }
  }, [pairingCode]);

  if (!kiosk) return null;

  // ── Result step: display pairing code ──────────────────────────────────

  if (step === "result" && pairingCode) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pairing Code</DialogTitle>
            <DialogDescription>
              Masukkan code ini pada Electron kiosk runner untuk menghubungkan
              ke akun Anda.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-4xl font-bold tracking-[0.3em] text-zinc-900 select-all">
                {pairingCode}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 shrink-0"
                onClick={handleCopyCode}
                aria-label="Salin pairing code"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-zinc-500 text-center">
              Kiosk:{" "}
              <span className="font-medium text-zinc-700">{kiosk.name}</span>
            </p>
          </div>

          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Confirm step ───────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isPaired ? "Reset Pairing?" : "Generate Pairing Code"}
          </DialogTitle>
          <DialogDescription>
            {isPaired
              ? "Membuat pairing code baru akan memutuskan koneksi Electron yang sedang aktif. Kiosk perlu dipair ulang."
              : `Generate pairing code untuk kiosk "${kiosk.name}".`}
          </DialogDescription>
        </DialogHeader>

        {isPaired && (
          <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-sm text-yellow-800">
              Electron runner yang sedang aktif akan mendapat error 401 dan
              masuk ke layar pairing ulang.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Batal
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            variant={isPaired ? "destructive" : "default"}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : isPaired ? (
              "Reset Pairing"
            ) : (
              "Generate Code"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
