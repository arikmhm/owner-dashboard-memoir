"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRupiah, formatDate, formatDateTime } from "@/lib/format";
import { QRCodeSVG } from "qrcode.react";
import {
  INVOICE_STATUS_CONFIG,
  BILLING_PERIOD_LABEL,
  PAYMENT_METHOD_LABEL,
} from "@/lib/constants";
import { api, ApiError, type ApiSuccessResponse } from "@/lib/api";
import { toast } from "sonner";
import type { SubscriptionInvoice } from "@/lib/types";

// ── Field ─────────────────────────────────────────────────────────────────────

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

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  const {
    data: invoice,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const res = await api.get<
        ApiSuccessResponse<{ invoice: SubscriptionInvoice }>
      >(`/owner/subscription/invoices/${invoiceId}`);
      return res.data.invoice;
    },
    enabled: !!invoiceId,
  });

  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!invoice?.paymentExpiresAt || invoice.status !== "PENDING") {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const expiryTime = new Date(invoice.paymentExpiresAt!).getTime();
      const diff = expiryTime - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
      } else {
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [invoice]);

  const handleCheckPayment = useCallback(async () => {
    if (!invoiceId) return;
    setIsCheckingPayment(true);
    try {
      const res = await api.post<ApiSuccessResponse<{ status: string }>>(
        `/owner/subscription/invoices/${invoiceId}/check-payment`,
        {},
      );
      const result = res.data;
      if (result.status === "PAID") {
        toast.success("Pembayaran berhasil! Subscription aktif.");
        await refetch();
        setTimeout(() => router.push("/subscription"), 1000);
      } else if (result.status === "FAILED") {
        toast.error("Pembayaran gagal atau kadaluarsa.");
        await refetch();
      } else {
        toast("Pembayaran belum terdeteksi. Coba lagi nanti.", {
          icon: <AlertCircle className="size-4 text-yellow-500" />,
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || "Gagal mengecek pembayaran.");
      } else {
        toast.error("Terjadi kesalahan saat mengecek pembayaran.");
      }
    } finally {
      setIsCheckingPayment(false);
    }
  }, [invoiceId, refetch, router]);

  // ── Loading ─────────────────────────────────────────────────────────────

  if (isLoading && !invoice) {
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
          {[1, 2].map((i) => (
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

  if (error || !invoice) {
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
          Invoice tidak ditemukan atau gagal dimuat.
        </div>
      </div>
    );
  }

  const sc = INVOICE_STATUS_CONFIG[invoice.status];

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
          <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight font-mono">
            {invoice.invoiceNumber}
          </h1>
          <div className={cn("flex items-center gap-1.5 shrink-0", sc.textClass)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", sc.dotClass)} />
            <span className="text-sm">{sc.label}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Informasi Pembayaran */}
        <div className="bg-white border border-zinc-200 rounded-sm p-5 space-y-4">
          <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Informasi Pembayaran
          </h2>
          <p className="text-3xl font-bold text-zinc-950">
            {formatRupiah(invoice.amount)}
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
            <Field label="ID Pesanan">
              <span className="font-mono text-xs">{invoice.orderId}</span>
            </Field>
            <Field label="Tanggal Dibuat">{formatDateTime(invoice.createdAt)}</Field>
            {invoice.paidAt && (
              <Field label="Tanggal Bayar">{formatDateTime(invoice.paidAt)}</Field>
            )}
            {invoice.paymentMethod && (
              <Field label="Metode Bayar">
                {PAYMENT_METHOD_LABEL[invoice.paymentMethod] ?? invoice.paymentMethod}
              </Field>
            )}
          </div>
        </div>

        {/* Periode Subscription */}
        <Section title="Periode Subscription">
          <Field label="Tipe">{BILLING_PERIOD_LABEL[invoice.billingPeriod]}</Field>
          <Field label="Mulai">{formatDate(invoice.periodStart)}</Field>
          <Field label="Berakhir">{formatDate(invoice.periodEnd)}</Field>
        </Section>

        {/* QR Code — hanya untuk PENDING */}
        {invoice.status === "PENDING" && invoice.qrString && (
          <div className="bg-white border border-zinc-200 rounded-sm p-5 space-y-4">
            <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Scan untuk Bayar
            </h2>
            <div className="flex justify-center py-2">
              <div className="rounded-sm border border-zinc-200 bg-white p-3">
                <QRCodeSVG value={invoice.qrString} size={150} level="M" />
              </div>
            </div>
            {invoice.paymentExpiresAt && (
              <div className="bg-zinc-50 rounded-sm px-4 py-3 space-y-0.5">
                <p className="text-xs text-zinc-400">Waktu tersisa</p>
                <p className={cn("text-sm font-medium", timeLeft === "Expired" ? "text-red-600" : "text-zinc-900")}>
                  {timeLeft ?? "Loading..."}
                </p>
                <p className="text-xs text-zinc-400">
                  Bayar sebelum {formatDateTime(invoice.paymentExpiresAt)}
                </p>
              </div>
            )}
            <p className="text-xs text-zinc-500 leading-relaxed">
              Scan QR code menggunakan aplikasi e-wallet atau mobile banking untuk menyelesaikan pembayaran.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.back()} className="text-xs">
          Kembali
        </Button>
        {invoice.status === "PENDING" && (
          <Button
            onClick={handleCheckPayment}
            disabled={isCheckingPayment}
            className="bg-zinc-950 text-white hover:bg-zinc-800 text-xs"
          >
            {isCheckingPayment ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Mengecek...
              </>
            ) : (
              <>
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Cek Pembayaran
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
