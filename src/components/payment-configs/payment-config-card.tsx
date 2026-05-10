"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { PAYMENT_CONFIG_STATUS_CONFIG } from "@/lib/constants";
import type { PaymentConfig } from "@/lib/types";
import type {
  ValidateConfigResponse,
  UpdatePaymentConfigRequest,
} from "@/hooks/use-payment-configs";

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
    placeholder: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
    isTextarea: true,
  },
  { key: "merchant_id", label: "Merchant ID", placeholder: "M-001" },
  { key: "terminal_id", label: "Terminal ID", placeholder: "T-001" },
];

type EditingField = "label" | "credentials" | null;

interface PaymentConfigCardProps {
  config: PaymentConfig;
  onValidate: () => Promise<ValidateConfigResponse>;
  onSetDefault: () => Promise<PaymentConfig>;
  onUpdate: (id: string, data: UpdatePaymentConfigRequest) => Promise<PaymentConfig>;
  onDelete: () => Promise<void>;
}

export function PaymentConfigCard({
  config,
  onValidate,
  onSetDefault,
  onUpdate,
  onDelete,
}: PaymentConfigCardProps) {
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Label edit state
  const [labelValue, setLabelValue] = useState("");
  const [labelError, setLabelError] = useState("");

  // Credentials edit state
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [credErrors, setCredErrors] = useState<Record<string, string>>({});

  const [isValidating, setIsValidating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const statusConfig = PAYMENT_CONFIG_STATUS_CONFIG[config.status];
  const canValidate =
    config.status === "PENDING_VALIDATION" || config.status === "INVALID";

  function startEdit(field: EditingField) {
    if (field === "label") {
      setLabelValue(config.label);
      setLabelError("");
    }
    if (field === "credentials") {
      setCredentials({});
      setCredErrors({});
    }
    setEditingField(field);
  }

  function cancelEdit() {
    setEditingField(null);
    setLabelError("");
    setCredErrors({});
  }

  async function saveLabel() {
    if (!labelValue.trim()) {
      setLabelError("Label tidak boleh kosong");
      return;
    }
    if (labelValue.trim() === config.label) {
      toast.info("Tidak ada perubahan");
      setEditingField(null);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(config.id, { label: labelValue.trim() });
      toast.success("Label berhasil diperbarui");
      setEditingField(null);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || "Gagal memperbarui label");
      } else {
        toast.error("Terjadi kesalahan, coba lagi nanti");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function saveCredentials() {
    const newErrors: Record<string, string> = {};
    for (const field of DOKU_CREDENTIAL_FIELDS) {
      if (!credentials[field.key]?.trim()) {
        newErrors[field.key] = `${field.label} tidak boleh kosong`;
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setCredErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(config.id, { credentials });
      toast.success("Credentials diperbarui. Silakan validasi ulang config ini.");
      setEditingField(null);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || "Gagal memperbarui credentials");
      } else {
        toast.error("Terjadi kesalahan, coba lagi nanti");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleValidate() {
    setIsValidating(true);
    try {
      const result = await onValidate();
      if (result.validatedOk) {
        try {
          await onSetDefault();
        } catch {
          // set default gagal tidak perlu blokir — validasi sudah berhasil
        }
        toast.success("Credentials valid, config aktif sebagai payment gateway");
      } else {
        toast.error(
          `Validasi gagal: ${result.error ?? "Provider menolak credentials"}`,
        );
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 501) {
          toast.error("Validasi otomatis belum tersedia untuk provider ini");
        } else {
          toast.error(err.message || "Validasi gagal");
        }
      } else {
        toast.error("Terjadi kesalahan, coba lagi nanti");
      }
    } finally {
      setIsValidating(false);
    }
  }

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      await onDelete();
      toast.success("Config berhasil dihapus");
      setDeleteOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          toast.error("Config masih digunakan oleh kiosk aktif");
        } else if (err.status === 403) {
          toast.error("Subscription harus aktif untuk menghapus config");
        } else {
          toast.error(err.message || "Gagal menghapus config");
        }
      } else {
        toast.error("Terjadi kesalahan, coba lagi nanti");
      }
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <>
      <div className="space-y-0 divide-y divide-zinc-100">
        {/* Label */}
        <FieldRow
          label="Label"
          onEdit={editingField === null ? () => startEdit("label") : undefined}
          disabled={isSaving}
        >
          {editingField === "label" ? (
            <InlineEditWrapper
              onSave={saveLabel}
              onCancel={cancelEdit}
              isSaving={isSaving}
            >
              <Input
                value={labelValue}
                onChange={(e) => {
                  setLabelValue(e.target.value);
                  if (labelError) setLabelError("");
                }}
                disabled={isSaving}
                autoFocus
                aria-invalid={!!labelError}
                className="h-8 text-sm"
              />
              {labelError && (
                <p className="text-xs text-red-500">{labelError}</p>
              )}
            </InlineEditWrapper>
          ) : (
            <p className="text-sm font-medium text-zinc-900">{config.label}</p>
          )}
        </FieldRow>

        {/* Status */}
        <FieldRow label="Status">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusConfig.dotClass}`} />
            <p className="text-sm font-medium text-zinc-900">{statusConfig.label}</p>
          </div>
        </FieldRow>

        {/* Credentials */}
        <FieldRow
          label="Credentials"
          sublabel="Provider: DOKU"
          onEdit={editingField === null ? () => startEdit("credentials") : undefined}
          disabled={isSaving}
        >
          {editingField === "credentials" ? (
            <InlineEditWrapper
              onSave={saveCredentials}
              onCancel={cancelEdit}
              isSaving={isSaving}
            >
              <div className="space-y-3">
                {DOKU_CREDENTIAL_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label
                      htmlFor={`cred-${field.key}`}
                      className="text-xs text-zinc-500 font-normal"
                    >
                      {field.label}
                    </Label>
                    {field.isTextarea ? (
                      <Textarea
                        id={`cred-${field.key}`}
                        value={credentials[field.key] ?? ""}
                        onChange={(e) => {
                          setCredentials((p) => ({ ...p, [field.key]: e.target.value }));
                          if (credErrors[field.key])
                            setCredErrors((p) => ({ ...p, [field.key]: "" }));
                        }}
                        placeholder={field.placeholder}
                        disabled={isSaving}
                        className="rounded-sm font-mono text-xs min-h-24"
                        aria-invalid={!!credErrors[field.key]}
                      />
                    ) : (
                      <Input
                        id={`cred-${field.key}`}
                        value={credentials[field.key] ?? ""}
                        onChange={(e) => {
                          setCredentials((p) => ({ ...p, [field.key]: e.target.value }));
                          if (credErrors[field.key])
                            setCredErrors((p) => ({ ...p, [field.key]: "" }));
                        }}
                        placeholder={field.placeholder}
                        disabled={isSaving}
                        className="h-8 text-sm"
                        aria-invalid={!!credErrors[field.key]}
                      />
                    )}
                    {credErrors[field.key] && (
                      <p className="text-xs text-red-500">{credErrors[field.key]}</p>
                    )}
                  </div>
                ))}
                <div className="flex items-start gap-2 rounded-sm bg-yellow-50 border border-yellow-200 px-3 py-2.5">
                  <AlertCircle className="h-3.5 w-3.5 text-yellow-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-800">
                    Menyimpan credentials baru akan mereset status validasi.
                  </p>
                </div>
              </div>
            </InlineEditWrapper>
          ) : (
            <p className="text-sm font-medium text-zinc-900 font-mono">
              {config.credentialsLastFour ? `••••${config.credentialsLastFour}` : "—"}
            </p>
          )}
        </FieldRow>

        {/* Tervalidasi */}
        <FieldRow label="Tervalidasi">
          <p className="text-sm font-medium text-zinc-900">
            {config.lastValidatedAt ? formatDate(config.lastValidatedAt) : "—"}
          </p>
        </FieldRow>

        {/* Provider */}
        <FieldRow label="Provider">
          <p className="text-sm font-medium text-zinc-900">DOKU</p>
        </FieldRow>
      </div>

      {/* Error banner */}
      {config.status === "INVALID" && config.lastError && (
        <div className="flex items-start gap-2 rounded-sm bg-red-50 border border-red-200 px-3 py-2.5 mt-4">
          <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{config.lastError}</p>
        </div>
      )}

      <Separator className="mt-6" />

      {/* Bottom actions */}
      <div className="flex flex-wrap items-center gap-2 mt-6">
        {canValidate && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleValidate}
            disabled={isValidating || editingField !== null}
          >
            {isValidating ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
            )}
            Validasi
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="text-xs text-red-600 hover:text-red-700 hover:border-red-300 hover:bg-red-50"
          onClick={() => setDeleteOpen(true)}
          disabled={editingField !== null}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Hapus
        </Button>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Konfigurasi?</DialogTitle>
            <DialogDescription>
              Konfigurasi QRIS Dinamis &ldquo;{config.label}&rdquo; akan dihapus
              permanen. Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                "Hapus"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FieldRow({
  label,
  sublabel,
  onEdit,
  disabled,
  children,
}: {
  label: string;
  sublabel?: string;
  onEdit?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="w-36 shrink-0 pt-0.5 space-y-0.5">
        <p className="text-xs text-zinc-400">{label}</p>
        {sublabel && <p className="text-xs text-zinc-300">{sublabel}</p>}
      </div>
      <div className="flex-1 min-w-0 space-y-2">{children}</div>
      <div className="shrink-0 pt-0.5">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            disabled={disabled}
            className="text-zinc-400 hover:text-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function InlineEditWrapper({
  onSave,
  onCancel,
  isSaving,
  children,
}: {
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {children}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="h-7 text-xs bg-zinc-950 text-white hover:bg-zinc-800 px-3"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
          ) : (
            <Check className="h-3 w-3 mr-1.5" />
          )}
          Simpan
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-zinc-500 px-2"
          onClick={onCancel}
          disabled={isSaving}
        >
          <X className="h-3 w-3 mr-1" />
          Batal
        </Button>
      </div>
    </div>
  );
}
