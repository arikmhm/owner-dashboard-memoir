"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Create Kiosk Dialog
// Modal form for creating a new kiosk (FEAT-OD-03.2)
// After success, displays the generated pairing code (FEAT-OD-03.3)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import type {
  CreateKioskRequest,
  CreateKioskResponse,
} from "@/hooks/use-kiosks";

interface CreateKioskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateKioskRequest) => Promise<CreateKioskResponse>;
  isSubmitting: boolean;
  /** Whether the add kiosk limit has been reached */
  maxReached: boolean;
  /** Current plan name for display */
  planName?: string;
}

export function CreateKioskDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  maxReached,
  planName,
}: CreateKioskDialogProps) {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [pairingResult, setPairingResult] =
    useState<CreateKioskResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && !pairingResult) {
      // Small delay to let dialog animation complete
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open, pairingResult]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setName("");
        setNameError("");
        setPairingResult(null);
        setCopied(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Client-side validation
      const trimmedName = name.trim();
      if (!trimmedName) {
        setNameError("Nama kiosk wajib diisi");
        return;
      }
      setNameError("");

      try {
        const result = await onSubmit({ name: trimmedName });
        setPairingResult(result);
        toast.success(`Kiosk "${result.kiosk.name}" berhasil dibuat!`);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 403 && err.code === "MAX_KIOSKS_REACHED") {
            toast.error("Limit kiosk tercapai. Upgrade plan untuk menambah.");
          } else {
            toast.error(err.message || "Gagal membuat kiosk");
          }
        } else {
          toast.error("Terjadi kesalahan, coba lagi nanti");
        }
      }
    },
    [name, onSubmit],
  );

  const handleCopyCode = useCallback(async () => {
    if (!pairingResult) return;
    try {
      await navigator.clipboard.writeText(pairingResult.kiosk.pairingCode);
      setCopied(true);
      toast.success("Code disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      toast.error("Gagal menyalin code");
    }
  }, [pairingResult]);

  // ── Pairing code result view ───────────────────────────────────────────

  if (pairingResult) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kiosk Berhasil Dibuat</DialogTitle>
            <DialogDescription>
              Masukkan code ini pada Electron kiosk runner untuk menghubungkan
              ke akun Anda.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-6">
            {/* 6-digit pairing code — prominent display */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-4xl font-bold tracking-[0.3em] text-zinc-900 select-all">
                {pairingResult.kiosk.pairingCode}
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

            <p className="text-xs text-zinc-500 text-center max-w-xs">
              Kiosk:{" "}
              <span className="font-medium text-zinc-700">
                {pairingResult.kiosk.name}
              </span>
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

  // ── Create form view ───────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Kiosk Baru</DialogTitle>
          <DialogDescription>
            Buat kiosk baru untuk booth fisik Anda. Setelah dibuat, Anda akan
            mendapat pairing code untuk dihubungkan ke Electron runner.
          </DialogDescription>
        </DialogHeader>

        {maxReached ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">
              Limit kiosk dari plan{" "}
              <span className="font-semibold">{planName}</span> tercapai.{" "}
              <a
                href="/subscription"
                className="underline underline-offset-2 font-medium"
              >
                Upgrade plan
              </a>{" "}
              untuk menambah kiosk.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kiosk-name">Nama Kiosk</Label>
              <Input
                ref={inputRef}
                id="kiosk-name"
                type="text"
                placeholder="Contoh: Booth Mall Jakarta"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError("");
                }}
                disabled={isSubmitting}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "kiosk-name-error" : undefined}
              />
              {nameError && (
                <p
                  id="kiosk-name-error"
                  className="text-xs text-red-500"
                  role="alert"
                >
                  {nameError}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Membuat...
                  </>
                ) : (
                  "Buat Kiosk"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
