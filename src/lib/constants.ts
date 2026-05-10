import type {
  TxStatus,
  BillingPeriod,
  SubscriptionStatus,
  PaymentConfigStatus,
  PaymentProviderCode,
  TransactionType,
} from "./types";

type InvoiceStatus = TxStatus; // invoices use same status enum

// ── Status display configs ────────────────────────────────────────────────────

export const TX_STATUS_CONFIG: Record<
  TxStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  PAID: { label: "Lunas", dotClass: "bg-emerald-500", textClass: "text-zinc-700" },
  PENDING: { label: "Menunggu", dotClass: "bg-amber-400", textClass: "text-zinc-700" },
  FAILED: { label: "Gagal", dotClass: "bg-red-500", textClass: "text-zinc-700" },
  EXPIRED: { label: "Kedaluwarsa", dotClass: "bg-zinc-300", textClass: "text-zinc-400" },
};

export const INVOICE_STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  PAID: { label: "Lunas", dotClass: "bg-emerald-500", textClass: "text-zinc-700" },
  PENDING: { label: "Menunggu Pembayaran", dotClass: "bg-amber-400", textClass: "text-zinc-700" },
  FAILED: { label: "Gagal", dotClass: "bg-red-500", textClass: "text-zinc-700" },
  EXPIRED: { label: "Kedaluwarsa", dotClass: "bg-zinc-300", textClass: "text-zinc-400" },
};

export const SUBSCRIPTION_STATUS_CONFIG: Record<
  SubscriptionStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  ACTIVE: { label: "Aktif", dotClass: "bg-emerald-500", textClass: "text-zinc-700" },
  PENDING_PAYMENT: { label: "Menunggu Pembayaran", dotClass: "bg-amber-400", textClass: "text-zinc-700" },
  EXPIRED: { label: "Expired", dotClass: "bg-red-500", textClass: "text-zinc-700" },
  CANCELLED: { label: "Dibatalkan", dotClass: "bg-zinc-300", textClass: "text-zinc-400" },
};

export const BILLING_PERIOD_LABEL: Record<BillingPeriod, string> = {
  MONTHLY: "Bulanan",
  YEARLY: "Tahunan",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Tunai",
  STATIC_QRIS: "QRIS",
  PG: "Payment Gateway",
};

export const PAYMENT_CONFIG_STATUS_CONFIG: Record<
  PaymentConfigStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  PENDING_VALIDATION: { label: "Belum divalidasi", dotClass: "bg-amber-400", textClass: "text-zinc-700" },
  ACTIVE: { label: "Aktif", dotClass: "bg-emerald-500", textClass: "text-zinc-700" },
  INVALID: { label: "Tidak valid", dotClass: "bg-red-500", textClass: "text-zinc-700" },
  DISABLED: { label: "Dinonaktifkan", dotClass: "bg-zinc-300", textClass: "text-zinc-400" },
};

export const PAYMENT_PROVIDER_LABEL: Record<PaymentProviderCode, string> = {
  DOKU: "DOKU",
  MIDTRANS: "Midtrans",
  XENDIT: "Xendit",
};

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  NORMAL: "Normal",
  EVENT: "Event",
};
