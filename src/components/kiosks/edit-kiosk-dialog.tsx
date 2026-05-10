"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Edit Kiosk Dialog
// Modal for editing kiosk name and/or pricing (FEAT-OD-03.2)
// PATCH /owner/kiosks/{id}: partial update allowed. Only changed fields submitted.
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when kiosk changes
  useEffect(() => {
    if (kiosk) {
      setName(kiosk.name);
      setPriceBaseSession(String(kiosk.priceBaseSession));
      setPricePerExtraPrint(String(kiosk.pricePerExtraPrint));
      setPriceDigitalCopy(String(kiosk.priceDigitalCopy));
      setErrors({});
    }
  }, [kiosk]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Name is optional per BE (partial update), but if provided must not be empty
    if (name.trim() === "") {
      newErrors.name = "Nama kiosk tidak boleh kosong jika diubah";
    }

    // Validate each price only if it has a value (optional fields)
    if (priceBaseSession) {
      const basePrice = Number(priceBaseSession);
      if (isNaN(basePrice) || basePrice < 0) {
        newErrors.priceBaseSession = "Harga harus angka valid ≥ 0";
      }
    }

    if (pricePerExtraPrint) {
      const extraPrice = Number(pricePerExtraPrint);
      if (isNaN(extraPrice) || extraPrice < 0) {
        newErrors.pricePerExtraPrint = "Harga harus angka valid ≥ 0";
      }
    }

    if (priceDigitalCopy) {
      const digitalPrice = Number(priceDigitalCopy);
      if (isNaN(digitalPrice) || digitalPrice < 0) {
        newErrors.priceDigitalCopy = "Harga harus angka valid ≥ 0";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, priceBaseSession, pricePerExtraPrint, priceDigitalCopy]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!kiosk || !validate()) return;

      try {
        // Build update payload with only changed fields (partial update per BE spec)
        const updateData: Record<string, unknown> = {};
        if (name.trim() !== kiosk.name) updateData.name = name.trim();
        if (priceBaseSession && Number(priceBaseSession) !== kiosk.priceBaseSession) {
          updateData.priceBaseSession = Number(priceBaseSession);
        }
        if (
          pricePerExtraPrint &&
          Number(pricePerExtraPrint) !== kiosk.pricePerExtraPrint
        ) {
          updateData.pricePerExtraPrint = Number(pricePerExtraPrint);
        }
        if (
          priceDigitalCopy &&
          Number(priceDigitalCopy) !== kiosk.priceDigitalCopy
        ) {
          updateData.priceDigitalCopy = Number(priceDigitalCopy);
        }

        // Only submit if there are actual changes
        if (Object.keys(updateData).length === 0) {
          toast.info("Tidak ada perubahan");
          return;
        }

        await onSubmit(kiosk.id, updateData as UpdateKioskRequest);
        toast.success("Kiosk berhasil diperbarui");
        onOpenChange(false);
      } catch (err) {
        if (err instanceof ApiError) {
          // Handle specific error codes from BE API
          if (err.status === 400) {
            toast.error(
              err.message || "Data tidak valid. Periksa kembali form Anda."
            );
          } else if (err.status === 404) {
            toast.error(
              "Kiosk tidak ditemukan atau Anda tidak memiliki akses. Coba refresh halaman."
            );
          } else if (err.status === 401) {
            toast.error("Session expired. Silakan login kembali.");
          } else {
            toast.error(err.message || "Gagal memperbarui kiosk");
          }
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
            Ubah informasi dan harga default kiosk.
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
