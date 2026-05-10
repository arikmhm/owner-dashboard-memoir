"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import type { PaymentConfig } from "@/lib/types";
import type { UpdatePaymentConfigRequest } from "@/hooks/use-payment-configs";

interface CredentialField {
  key: string;
  label: string;
  placeholder?: string;
  isTextarea?: boolean;
}

const CREDENTIAL_FIELDS: Record<string, CredentialField[]> = {
  DOKU: [
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
  ],
  MIDTRANS: [
    { key: "server_key", label: "Server Key" },
    { key: "client_key", label: "Client Key" },
    { key: "merchant_id", label: "Merchant ID" },
  ],
  XENDIT: [
    { key: "api_key", label: "API Key" },
    { key: "webhook_token", label: "Webhook Token" },
    { key: "business_id", label: "Business ID" },
  ],
};

interface EditPaymentConfigDialogProps {
  config: PaymentConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (
    id: string,
    data: UpdatePaymentConfigRequest,
  ) => Promise<PaymentConfig>;
}

export function EditPaymentConfigDialog({
  config,
  open,
  onOpenChange,
  onUpdate,
}: EditPaymentConfigDialogProps) {
  const [label, setLabel] = useState("");
  const [labelError, setLabelError] = useState("");
  const [isSubmittingLabel, setIsSubmittingLabel] = useState(false);

  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [credErrors, setCredErrors] = useState<Record<string, string>>({});
  const [isSubmittingCreds, setIsSubmittingCreds] = useState(false);

  const isAnySubmitting = isSubmittingLabel || isSubmittingCreds;

  // Populate from config when it changes
  useEffect(() => {
    if (config) {
      setLabel(config.label);
      setLabelError("");
      setCredentials({});
      setCredErrors({});
    }
  }, [config]);

  const credentialFields = useMemo(
    () => (config ? (CREDENTIAL_FIELDS[config.providerCode] ?? []) : []),
    [config],
  );

  const handleSaveLabel = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!config) return;

      if (!label.trim()) {
        setLabelError("Label tidak boleh kosong");
        return;
      }
      if (label.trim() === config.label) {
        toast.info("Tidak ada perubahan");
        return;
      }

      setIsSubmittingLabel(true);
      try {
        await onUpdate(config.id, { label: label.trim() });
        toast.success("Label berhasil diperbarui");
        onOpenChange(false);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 403) {
            toast.error("Subscription harus aktif untuk mengubah config");
          } else {
            toast.error(err.message || "Gagal memperbarui label");
          }
        } else {
          toast.error("Terjadi kesalahan, coba lagi nanti");
        }
      } finally {
        setIsSubmittingLabel(false);
      }
    },
    [config, label, onUpdate, onOpenChange],
  );

  const validateCredentials = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of credentialFields) {
      if (!credentials[field.key]?.trim()) {
        newErrors[field.key] = `${field.label} tidak boleh kosong`;
      }
    }
    setCredErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [credentialFields, credentials]);

  const handleSaveCredentials = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!config || !validateCredentials()) return;

      setIsSubmittingCreds(true);
      try {
        await onUpdate(config.id, { credentials });
        toast.success(
          "Credentials diperbarui. Silakan validasi ulang config ini.",
        );
        onOpenChange(false);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 400) {
            toast.error(err.message || "Credentials tidak valid");
          } else if (err.status === 403) {
            toast.error("Subscription harus aktif untuk mengubah credentials");
          } else {
            toast.error(err.message || "Gagal memperbarui credentials");
          }
        } else {
          toast.error("Terjadi kesalahan, coba lagi nanti");
        }
      } finally {
        setIsSubmittingCreds(false);
      }
    },
    [config, credentials, validateCredentials, onUpdate, onOpenChange],
  );

  if (!config) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={isAnySubmitting ? undefined : onOpenChange}
    >
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit QRIS Dinamis</DialogTitle>
          <DialogDescription>{config.label}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-4">
          {/* Section: Label */}
          <form onSubmit={handleSaveLabel} className="space-y-3">
            <p className="text-sm font-medium text-zinc-700">Label</p>
            <div className="space-y-2">
              <Label htmlFor="edit-config-label" className="sr-only">
                Label
              </Label>
              <Input
                id="edit-config-label"
                type="text"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  if (labelError) setLabelError("");
                }}
                disabled={isAnySubmitting}
                aria-invalid={!!labelError}
              />
              {labelError && (
                <p className="text-xs text-red-500" role="alert">
                  {labelError}
                </p>
              )}
            </div>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={isAnySubmitting}
            >
              {isSubmittingLabel ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Label"
              )}
            </Button>
          </form>

          <Separator />

          {/* Section: Credentials */}
          <form onSubmit={handleSaveCredentials} className="space-y-3">
            <p className="text-sm font-medium text-zinc-700">Credentials</p>

            <div className="flex items-start gap-2 rounded-sm bg-yellow-50 border border-yellow-200 px-3 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-800">
                Memperbarui credentials akan mereset status ke &ldquo;Belum
                divalidasi&rdquo; dan membatalkan status default.
              </p>
            </div>

            <div className="space-y-3">
              {credentialFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`edit-cred-${field.key}`}>
                    {field.label}
                  </Label>
                  {field.isTextarea ? (
                    <Textarea
                      id={`edit-cred-${field.key}`}
                      value={credentials[field.key] ?? ""}
                      onChange={(e) => {
                        setCredentials((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }));
                        if (credErrors[field.key])
                          setCredErrors((prev) => ({
                            ...prev,
                            [field.key]: "",
                          }));
                      }}
                      placeholder={field.placeholder}
                      disabled={isAnySubmitting}
                      className="rounded-sm font-mono text-xs min-h-24"
                      aria-invalid={!!credErrors[field.key]}
                    />
                  ) : (
                    <Input
                      id={`edit-cred-${field.key}`}
                      type="text"
                      value={credentials[field.key] ?? ""}
                      onChange={(e) => {
                        setCredentials((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }));
                        if (credErrors[field.key])
                          setCredErrors((prev) => ({
                            ...prev,
                            [field.key]: "",
                          }));
                      }}
                      placeholder={field.placeholder}
                      disabled={isAnySubmitting}
                      aria-invalid={!!credErrors[field.key]}
                    />
                  )}
                  {credErrors[field.key] && (
                    <p className="text-xs text-red-500" role="alert">
                      {credErrors[field.key]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <Button type="submit" size="sm" disabled={isAnySubmitting}>
              {isSubmittingCreds ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Credentials"
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
