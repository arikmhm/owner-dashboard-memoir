import type { TxStatus, WithdrawalStatus, BillingPeriod } from "./dummy-data";

type InvoiceStatus = TxStatus; // invoices use same status enum

// ── Status display configs ────────────────────────────────────────────────────

export const TX_STATUS_CONFIG: Record<
  TxStatus,
  { label: string; className: string }
> = {
  PAID: { label: "Lunas", className: "bg-zinc-950 text-white" },
  PENDING: { label: "Menunggu", className: "bg-zinc-100 text-zinc-500" },
  FAILED: {
    label: "Gagal",
    className: "bg-zinc-100 text-zinc-400 line-through",
  },
};

export const WITHDRAWAL_STATUS_CONFIG: Record<
  WithdrawalStatus,
  { label: string; className: string }
> = {
  PENDING: { label: "Diproses", className: "bg-zinc-100 text-zinc-500" },
  PROCESSED: { label: "Selesai", className: "bg-zinc-950 text-white" },
  REJECTED: { label: "Ditolak", className: "bg-zinc-100 text-zinc-400" },
};

export const INVOICE_STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  PAID: { label: "Lunas", className: "bg-zinc-950 text-white" },
  PENDING: { label: "Menunggu", className: "bg-zinc-100 text-zinc-500" },
  FAILED: { label: "Gagal", className: "bg-zinc-100 text-zinc-400" },
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
