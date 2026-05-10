"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  SlidersHorizontal,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatNumber, formatDateTime } from "@/lib/format";
import {
  TX_STATUS_CONFIG,
  PAYMENT_METHOD_LABEL,
  TRANSACTION_TYPE_LABEL,
} from "@/lib/constants";
import {
  useTransactions,
  type TransactionFilters,
} from "@/hooks/use-transactions";
import { useKiosks } from "@/hooks/use-kiosks";
import type { TxStatus, PaymentMethod, TransactionType } from "@/lib/types";

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;

const LIMIT_OPTIONS = [10, 25, 50];

const STATUS_OPTIONS: { value: TxStatus; label: string }[] = [
  { value: "PAID", label: "Lunas" },
  { value: "PENDING", label: "Menunggu" },
  { value: "FAILED", label: "Gagal" },
  { value: "EXPIRED", label: "Kedaluwarsa" },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Tunai" },
  { value: "STATIC_QRIS", label: "QRIS" },
  { value: "PG", label: "Payment Gateway" },
];

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "NORMAL", label: "Normal" },
  { value: "EVENT", label: "Event" },
];

// ── Page Component ───────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const router = useRouter();

  // ── Filter state ─────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    limit: DEFAULT_LIMIT,
  });
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────
  const { transactions, meta, isLoading, isRefetching, error, refresh } =
    useTransactions(filters);
  const { kiosks } = useKiosks();

  // ── Search debounce (300ms) ────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = searchInput.trim();
      setFilters((prev) => {
        if ((prev.search ?? "") === (trimmed || "")) return prev;
        return { ...prev, search: trimmed || undefined, page: 1 };
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // ── Derived state ────────────────────────────────────────────────────────
  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 0;
  const currentPage = meta?.page ?? 1;
  const colSpan = 8;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.kioskId) count++;
    if (filters.status) count++;
    if (filters.paymentMethod) count++;
    if (filters.transactionType) count++;
    if (filters.startDate || filters.endDate) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const updateFilter = useCallback(
    <K extends keyof TransactionFilters>(
      key: K,
      value: TransactionFilters[K],
    ) => {
      setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    },
    [],
  );

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setFilters((prev) => ({ ...prev, search: undefined, page: 1 }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchInput("");
    setFilters({ page: 1, limit: DEFAULT_LIMIT });
  }, []);

  const goToPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setFilters((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-5 border-b border-zinc-200">
        <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
          Transaksi
        </h1>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
            <Input
              placeholder="Cari order ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-8 pl-9 pr-8 text-xs"
            />
            {searchInput && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((prev) => !prev)}
            className={cn("h-8 text-xs gap-1.5", showFilters && "bg-zinc-100")}
          >
            <SlidersHorizontal className="size-3" />
            Filter
            {activeFilterCount > 0 && (
              <Badge className="bg-zinc-950 text-white text-[10px] px-1.5 py-0 ml-0.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isRefetching}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={cn("size-3", isRefetching && "animate-spin")} />
          </Button>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 text-xs text-zinc-500"
            >
              Reset
            </Button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="flex flex-wrap items-end gap-x-5 gap-y-4 p-4 rounded-sm border border-zinc-200 bg-zinc-50/50">
            <div className="flex flex-col gap-1.5">
              <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                Kiosk
              </label>
              <select
                value={filters.kioskId ?? ""}
                onChange={(e) =>
                  updateFilter("kioskId", e.target.value || undefined)
                }
                className="block h-8 text-xs rounded-sm border border-zinc-200 bg-white px-2.5 pr-7 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              >
                <option value="">Semua Kiosk</option>
                {kiosks.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                Status
              </label>
              <select
                value={filters.status ?? ""}
                onChange={(e) =>
                  updateFilter(
                    "status",
                    (e.target.value as TxStatus) || undefined,
                  )
                }
                className="block h-8 text-xs rounded-sm border border-zinc-200 bg-white px-2.5 pr-7 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              >
                <option value="">Semua Status</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                Metode
              </label>
              <select
                value={filters.paymentMethod ?? ""}
                onChange={(e) =>
                  updateFilter(
                    "paymentMethod",
                    (e.target.value as PaymentMethod) || undefined,
                  )
                }
                className="block h-8 text-xs rounded-sm border border-zinc-200 bg-white px-2.5 pr-7 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              >
                <option value="">Semua Metode</option>
                {PAYMENT_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                Tipe
              </label>
              <select
                value={filters.transactionType ?? ""}
                onChange={(e) =>
                  updateFilter(
                    "transactionType",
                    (e.target.value as TransactionType) || undefined,
                  )
                }
                className="block h-8 text-xs rounded-sm border border-zinc-200 bg-white px-2.5 pr-7 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              >
                <option value="">Semua Tipe</option>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                Dari
              </label>
              <input
                type="date"
                value={filters.startDate ?? ""}
                onChange={(e) =>
                  updateFilter("startDate", e.target.value || undefined)
                }
                className="block h-8 text-xs rounded-sm border border-zinc-200 bg-white px-2.5 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                Sampai
              </label>
              <input
                type="date"
                value={filters.endDate ?? ""}
                onChange={(e) =>
                  updateFilter("endDate", e.target.value || undefined)
                }
                className="block h-8 text-xs rounded-sm border border-zinc-200 bg-white px-2.5 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <span className="font-medium">Gagal memuat transaksi.</span>
          <button onClick={refresh} className="underline hover:text-red-900">
            Coba lagi
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border border-zinc-200 rounded-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                  Tanggal
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Order
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Kiosk
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                  Cetak
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                  Digital
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden lg:table-cell">
                  Metode
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {/* Loading skeleton */}
              {isLoading && transactions.length === 0 && (
                <>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Skeleton className="h-3 w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-3 w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-3 w-20" />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Skeleton className="h-3 w-8" />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Skeleton className="h-3 w-8" />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <Skeleton className="h-3 w-16" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Skeleton className="h-3 w-16 ml-auto" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Skeleton className="h-3 w-16 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {/* Empty state */}
              {!isLoading && transactions.length === 0 && !error && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                        <Receipt className="size-4 text-zinc-400" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        Belum ada transaksi
                      </p>
                      <p className="text-xs text-zinc-400 max-w-xs">
                        {activeFilterCount > 0
                          ? "Tidak ada transaksi yang sesuai dengan filter. Coba ubah filter atau reset."
                          : "Transaksi akan muncul di sini saat kiosk kamu mulai menerima pembayaran."}
                      </p>
                      {activeFilterCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="text-xs mt-1"
                        >
                          Reset Filter
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {transactions.map((tx) => {
                const sc = TX_STATUS_CONFIG[tx.status];

                return (
                  <tr
                    key={tx.id}
                    className="cursor-pointer hover:bg-zinc-50/50 transition-colors"
                    onClick={() => router.push(`/transactions/${tx.id}`)}
                  >
                    <td className="px-4 py-3 text-xs text-zinc-500 hidden md:table-cell align-top">
                      {formatDateTime(tx.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs text-zinc-600">
                          {tx.orderId}
                        </p>
                        {tx.transactionType === "EVENT" && (
                          <span className="text-[10px] font-medium text-zinc-500 border border-zinc-200 rounded-sm px-1.5 py-0.5 leading-none">
                            {TRANSACTION_TYPE_LABEL[tx.transactionType]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-700 align-top">
                      {tx.kioskName}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 hidden md:table-cell align-top">
                      {tx.printQty}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 hidden md:table-cell align-top">
                      {tx.hasDigitalCopy ? "Ya" : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 hidden lg:table-cell align-top">
                      {PAYMENT_METHOD_LABEL[tx.paymentMethod] ??
                        tx.paymentMethod}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-zinc-900 tabular-nums align-top">
                      {formatNumber(tx.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className={cn("flex items-center justify-end gap-1.5", sc.textClass)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", sc.dotClass)} />
                        <span className="text-xs">{sc.label}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {meta && (totalPages > 1 || (filters.limit ?? DEFAULT_LIMIT) !== DEFAULT_LIMIT) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50/50">
            <div className="flex items-center gap-3">
              <p className="text-xs text-zinc-400">
                Hal. {currentPage} dari {Math.max(1, totalPages)}
                <span className="hidden sm:inline">
                  {" "}
                  · {meta.total} transaksi
                </span>
              </p>

              <select
                value={filters.limit ?? DEFAULT_LIMIT}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="h-6 text-[10px] rounded border border-zinc-200 bg-white px-1.5 pr-5 text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              >
                {LIMIT_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {l} / hal
                  </option>
                ))}
              </select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>

                {(() => {
                  const pages: number[] = [];
                  let start = Math.max(1, currentPage - 2);
                  const end = Math.min(totalPages, start + 4);
                  start = Math.max(1, end - 4);
                  for (let i = start; i <= end; i++) pages.push(i);
                  return pages.map((p) => (
                    <Button
                      key={p}
                      variant={p === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(p)}
                      className={cn(
                        "h-7 w-7 p-0 text-xs",
                        p === currentPage &&
                          "bg-zinc-950 text-white hover:bg-zinc-800",
                      )}
                    >
                      {p}
                    </Button>
                  ));
                })()}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
