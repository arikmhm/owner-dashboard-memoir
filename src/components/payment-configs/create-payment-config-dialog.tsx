"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import type { PaymentConfig } from "@/lib/types";
import type { CreatePaymentConfigRequest } from "@/hooks/use-payment-configs";

interface CredentialField {
  key: string;
  label: string;
  placeholder?: string;
  isTextarea?: boolean;
}

const DOKU_CREDENTIAL_FIELDS: CredentialField[] = [
  { key: "client_id", label: "Client ID", placeholder: "CID-12345" },
  { key: "secret_key", label: "Secret Key", placeholder: "SK-ABCDEFGH1234" },
  {
    key: "private_key",
    label: "Private Key (PEM)",
    placeholder:
      "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
    isTextarea: true,
  },
  { key: "merchant_id", label: "Merchant ID", placeholder: "M-001" },
  { key: "terminal_id", label: "Terminal ID", placeholder: "T-001" },
];

interface SetupQrisDinamisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePaymentConfigRequest) => Promise<PaymentConfig>;
}

export function SetupQrisDinamisDialog({
  open,
  onOpenChange,
  onSubmit,
}: SetupQrisDinamisDialogProps) {
  const [label, setLabel] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setLabel("");
        setCredentials({});
        setErrors({});
        setIsSubmitting(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!label.trim()) {
      newErrors.label = "Label tidak boleh kosong";
    }

    for (const field of DOKU_CREDENTIAL_FIELDS) {
      if (!credentials[field.key]?.trim()) {
        newErrors[field.key] = `${field.label} tidak boleh kosong`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [label, credentials]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setIsSubmitting(true);
      try {
        await onSubmit({
          providerCode: "DOKU",
          label: label.trim(),
          credentials,
        });
        toast.success("QRIS Dinamis berhasil dikonfigurasi");
        onOpenChange(false);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 400) {
            toast.error(err.message || "Data tidak valid. Periksa kembali form.");
          } else if (err.status === 403) {
            toast.error("Subscription harus aktif untuk mengatur payment config");
          } else {
            toast.error(err.message || "Gagal menyimpan config");
          }
        } else {
          toast.error("Terjadi kesalahan, coba lagi nanti");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [label, credentials, validate, onSubmit, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Setup QRIS Dinamis</DialogTitle>
          <DialogDescription>
            Hubungkan akun DOKU untuk memproses pembayaran QRIS di kiosk Anda.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto space-y-5 pr-4"
        >
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="config-label">Label</Label>
            <Input
              id="config-label"
              type="text"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (errors.label) setErrors((prev) => ({ ...prev, label: "" }));
              }}
              placeholder="Contoh: DOKU Production"
              disabled={isSubmitting}
              aria-invalid={!!errors.label}
            />
            {errors.label && (
              <p className="text-xs text-red-500" role="alert">
                {errors.label}
              </p>
            )}
          </div>

          <Separator />

          {/* Credentials */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">Credentials</p>
              <Image
                src="/logos/doku.png"
                alt="DOKU"
                width={28}
                height={28}
                className="rounded-sm"
                unoptimized
              />
            </div>
            {DOKU_CREDENTIAL_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`cred-${field.key}`}>{field.label}</Label>
                {field.isTextarea ? (
                  <Textarea
                    id={`cred-${field.key}`}
                    value={credentials[field.key] ?? ""}
                    onChange={(e) => {
                      setCredentials((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }));
                      if (errors[field.key])
                        setErrors((prev) => ({ ...prev, [field.key]: "" }));
                    }}
                    placeholder={field.placeholder}
                    disabled={isSubmitting}
                    className="rounded-sm font-mono text-xs min-h-24"
                    aria-invalid={!!errors[field.key]}
                  />
                ) : (
                  <Input
                    id={`cred-${field.key}`}
                    type="text"
                    value={credentials[field.key] ?? ""}
                    onChange={(e) => {
                      setCredentials((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }));
                      if (errors[field.key])
                        setErrors((prev) => ({ ...prev, [field.key]: "" }));
                    }}
                    placeholder={field.placeholder}
                    disabled={isSubmitting}
                    aria-invalid={!!errors[field.key]}
                  />
                )}
                {errors[field.key] && (
                  <p className="text-xs text-red-500" role="alert">
                    {errors[field.key]}
                  </p>
                )}
              </div>
            ))}
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
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
