"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRupiah, formatDateTime } from "@/lib/format";
import {
  TX_STATUS_CONFIG,
  PAYMENT_METHOD_LABEL,
  TRANSACTION_TYPE_LABEL,
} from "@/lib/constants";
import { useTransactionDetail } from "@/hooks/use-transactions";

// ── Detail Field ──────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="text-sm text-zinc-800">{children}</div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-sm p-5 space-y-4">
      <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { detail, isLoading, error } = useTransactionDetail(id);

  // ── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="pb-5 border-b border-zinc-200 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-sm" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-zinc-200 rounded-sm p-5 space-y-4">
              <Skeleton className="h-3 w-24" />
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="space-y-1.5">
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (error || !detail) {
    return (
      <div className="space-y-6">
        <div className="pb-5 border-b border-zinc-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="h-8 text-xs gap-1.5 text-zinc-500 px-2"
          >
            <ArrowLeft className="size-3.5" />
            Kembali
          </Button>
        </div>
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Transaksi tidak ditemukan atau gagal dimuat.
        </div>
      </div>
    );
  }

  const sc = TX_STATUS_CONFIG[detail.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-5 border-b border-zinc-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="h-7 text-xs gap-1.5 text-zinc-500 px-2 mb-3 -ml-2"
        >
          <ArrowLeft className="size-3.5" />
          Kembali
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight font-mono">
                {detail.orderId}
              </h1>
              {detail.transactionType === "EVENT" && (
                <span className="text-[10px] font-medium text-zinc-500 border border-zinc-200 rounded-sm px-1.5 py-0.5 leading-none">
                  {TRANSACTION_TYPE_LABEL[detail.transactionType]}
                </span>
              )}
            </div>
          </div>
          <div className={cn("flex items-center gap-1.5 shrink-0", sc.textClass)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", sc.dotClass)} />
            <span className="text-sm">{sc.label}</span>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {/* Informasi Transaksi */}
        <Section title="Informasi Transaksi">
          <Field label="Kiosk">{detail.kioskName}</Field>
          <Field label="Template">{detail.templateName}</Field>
          <Field label="Metode Bayar">
            {PAYMENT_METHOD_LABEL[detail.paymentMethod] ?? detail.paymentMethod}
          </Field>
          <Field label="Tipe">
            {TRANSACTION_TYPE_LABEL[detail.transactionType]}
          </Field>
          <Field label="Tanggal Order">{formatDateTime(detail.createdAt)}</Field>
          {detail.paidAt && (
            <Field label="Dibayar pada">{formatDateTime(detail.paidAt)}</Field>
          )}
        </Section>

        {/* Detail Pesanan */}
        <Section title="Detail Pesanan">
          <Field label="Jumlah Cetak">{detail.printQty} lembar</Field>
          <Field label="Digital Copy">{detail.hasDigitalCopy ? "Ya" : "Tidak"}</Field>
        </Section>

        {/* Rincian Harga */}
        <div className="bg-white border border-zinc-200 rounded-sm p-5 space-y-4">
          <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Rincian Harga
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Harga dasar</span>
              <span className="tabular-nums">{formatRupiah(detail.appliedBasePrice)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>
                Extra print × {Math.max(0, detail.printQty - 1)}
              </span>
              <span className="tabular-nums">
                {formatRupiah(detail.appliedExtraPrintPrice * Math.max(0, detail.printQty - 1))}
              </span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Digital copy</span>
              <span className="tabular-nums">
                {detail.hasDigitalCopy
                  ? formatRupiah(detail.appliedDigitalCopyPrice)
                  : "—"}
              </span>
            </div>
            <div className="border-t border-zinc-100 pt-2 flex justify-between font-semibold text-zinc-900">
              <span>Total</span>
              <span className="tabular-nums">{formatRupiah(detail.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Info tambahan — hanya tampil jika ada data relevan */}
        {(detail.providerReferenceId || detail.failedReason) && (
          <Section title="Info Pembayaran">
            {detail.providerReferenceId && (
              <Field label="Referensi Provider">
                <span className="font-mono text-xs">{detail.providerReferenceId}</span>
              </Field>
            )}
            {detail.failedReason && (
              <div className="col-span-full">
                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
                  Alasan Gagal
                </p>
                <p className="text-sm text-red-600">{detail.failedReason}</p>
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}
