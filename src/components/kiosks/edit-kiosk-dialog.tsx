"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Edit Kiosk Dialog
// Modal for editing kiosk name, pricing, and active status (FEAT-OD-03.2)
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import type { Kiosk } from "@/lib/types";
import type { UpdateKioskRequest } from "@/hooks/use-kiosks";

interface EditKioskDialogProps {
  kiosk: Kiosk | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, data: UpdateKioskRequest) => Promise<Kiosk>;
  isSubmitting: boolean;
}

export function EditKioskDialog({
  kiosk,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: EditKioskDialogProps) {
  const [name, setName] = useState("");
  const [priceBaseSession, setPriceBaseSession] = useState("");
  const [pricePerExtraPrint, setPricePerExtraPrint] = useState("");
  const [priceDigitalCopy, setPriceDigitalCopy] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when kiosk changes
  useEffect(() => {
    if (kiosk) {
      setName(kiosk.name);
      setPriceBaseSession(String(kiosk.priceBaseSession));
      setPricePerExtraPrint(String(kiosk.pricePerExtraPrint));
      setPriceDigitalCopy(String(kiosk.priceDigitalCopy));
      setIsActive(kiosk.isActive);
      setErrors({});
    }
  }, [kiosk]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Nama kiosk wajib diisi";
    }

    const basePrice = Number(priceBaseSession);
    if (!priceBaseSession || isNaN(basePrice) || basePrice < 0) {
      newErrors.priceBaseSession = "Harga harus angka valid ≥ 0";
    }

    const extraPrice = Number(pricePerExtraPrint);
    if (!pricePerExtraPrint || isNaN(extraPrice) || extraPrice < 0) {
      newErrors.pricePerExtraPrint = "Harga harus angka valid ≥ 0";
    }

    const digitalPrice = Number(priceDigitalCopy);
    if (!priceDigitalCopy || isNaN(digitalPrice) || digitalPrice < 0) {
      newErrors.priceDigitalCopy = "Harga harus angka valid ≥ 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, priceBaseSession, pricePerExtraPrint, priceDigitalCopy]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!kiosk || !validate()) return;

      try {
        await onSubmit(kiosk.id, {
          name: name.trim(),
          priceBaseSession: Number(priceBaseSession),
          pricePerExtraPrint: Number(pricePerExtraPrint),
          priceDigitalCopy: Number(priceDigitalCopy),
          isActive,
        });
        toast.success("Kiosk berhasil diperbarui");
        onOpenChange(false);
      } catch (err) {
        if (err instanceof ApiError) {
          toast.error(err.message || "Gagal memperbarui kiosk");
        } else {
          toast.error("Terjadi kesalahan, coba lagi nanti");
        }
      }
    },
    [
      kiosk,
      name,
      priceBaseSession,
      pricePerExtraPrint,
      priceDigitalCopy,
      isActive,
      validate,
      onSubmit,
      onOpenChange,
    ],
  );

  if (!kiosk) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Kiosk</DialogTitle>
          <DialogDescription>
            Ubah informasi dan harga default kiosk. Perubahan harga akan berlaku
            untuk transaksi baru.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-kiosk-name">Nama Kiosk</Label>
            <Input
              id="edit-kiosk-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              disabled={isSubmitting}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-red-500" role="alert">
                {errors.name}
              </p>
            )}
          </div>

          <Separator />

          {/* Pricing */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-700">Harga Default</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <PriceField
                id="edit-price-base"
                label="Sesi Dasar"
                value={priceBaseSession}
                onChange={setPriceBaseSession}
                error={errors.priceBaseSession}
                disabled={isSubmitting}
                onClearError={() =>
                  setErrors((prev) => ({ ...prev, priceBaseSession: "" }))
                }
              />
              <PriceField
                id="edit-price-extra"
                label="Extra Print"
                value={pricePerExtraPrint}
                onChange={setPricePerExtraPrint}
                error={errors.pricePerExtraPrint}
                disabled={isSubmitting}
                onClearError={() =>
                  setErrors((prev) => ({ ...prev, pricePerExtraPrint: "" }))
                }
              />
              <PriceField
                id="edit-price-digital"
                label="Digital Copy"
                value={priceDigitalCopy}
                onChange={setPriceDigitalCopy}
                error={errors.priceDigitalCopy}
                disabled={isSubmitting}
                onClearError={() =>
                  setErrors((prev) => ({ ...prev, priceDigitalCopy: "" }))
                }
              />
            </div>
            <p className="text-xs text-zinc-400">
              Perubahan harga akan berlaku untuk transaksi baru. Harga lama
              tetap tersimpan di transaksi yang sudah ada.
            </p>
          </div>

          <Separator />

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="edit-kiosk-active"
                className="text-sm font-medium"
              >
                Status Aktif
              </Label>
              <p className="text-xs text-zinc-400">
                Nonaktifkan kiosk yang sedang tidak beroperasi
              </p>
            </div>
            <Switch
              id="edit-kiosk-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isSubmitting}
            />
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
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Price field helper ───────────────────────────────────────────────────────

interface PriceFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled: boolean;
  onClearError: () => void;
}

function PriceField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  onClearError,
}: PriceFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-zinc-500">
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 pointer-events-none">
          Rp
        </span>
        <Input
          id={id}
          type="number"
          min={0}
          step={1000}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (error) onClearError();
          }}
          disabled={disabled}
          className="pl-8 tabular-nums"
          aria-invalid={!!error}
        />
      </div>
      {error && (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
