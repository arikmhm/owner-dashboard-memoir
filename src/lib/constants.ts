import type {
  TxStatus,
  WithdrawalStatus,
  BillingPeriod,
  SubscriptionStatus,
} from "./types";

type InvoiceStatus = TxStatus; // invoices use same status enum

// ── Status display configs ────────────────────────────────────────────────────

export const TX_STATUS_CONFIG: Record<
  TxStatus,
  { label: string; className: string }
> = {
  PAID: { label: "Lunas", className: "bg-emerald-100 text-emerald-700" },
  PENDING: { label: "Menunggu", className: "bg-yellow-100 text-yellow-700" },
  FAILED: {
    label: "Gagal",
    className: "bg-red-100 text-red-700",
  },
  EXPIRED: {
    label: "Kedaluwarsa",
    className: "bg-zinc-100 text-zinc-400",
  },
};

export const WITHDRAWAL_STATUS_CONFIG: Record<
  WithdrawalStatus,
  { label: string; className: string }
> = {
  PENDING: { label: "Diproses", className: "bg-yellow-100 text-yellow-700" },
  PROCESSED: {
    label: "Selesai",
    className: "bg-emerald-100 text-emerald-700",
  },
  REJECTED: { label: "Ditolak", className: "bg-red-100 text-red-700" },
};

export const INVOICE_STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  PAID: { label: "Lunas", className: "bg-emerald-100 text-emerald-700" },
  PENDING: { label: "Menunggu", className: "bg-yellow-100 text-yellow-700" },
  FAILED: { label: "Gagal", className: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Kedaluwarsa", className: "bg-zinc-100 text-zinc-400" },
};

export const SUBSCRIPTION_STATUS_CONFIG: Record<
  SubscriptionStatus,
  { label: string; className: string }
> = {
  ACTIVE: { label: "Aktif", className: "bg-emerald-100 text-emerald-700" },
  PENDING_PAYMENT: {
    label: "Menunggu Pembayaran",
    className: "bg-yellow-100 text-yellow-700",
  },
  EXPIRED: { label: "Expired", className: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Dibatalkan", className: "bg-zinc-100 text-zinc-400" },
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
