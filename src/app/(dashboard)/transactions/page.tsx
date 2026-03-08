"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Transaction History Page
// EPIC-OD-05: Paginated, filterable transaction list
// FEAT-04.3: Owner Transaction History with Filtering
// Best practices: client-swr-dedup, rerender-functional-setstate
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from "react";
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
import { formatRupiah, formatDateTime } from "@/lib/format";
import { TX_STATUS_CONFIG, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import {
  useTransactions,
  type TransactionFilters,
} from "@/hooks/use-transactions";
import { useKiosks } from "@/hooks/use-kiosks";
import type { TxStatus, PaymentMethod } from "@/lib/types";

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 20;

const STATUS_OPTIONS: { value: TxStatus; label: string }[] = [
  { value: "PAID", label: "Lunas" },
  { value: "PENDING", label: "Menunggu" },
  { value: "FAILED", label: "Gagal" },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Tunai" },
  { value: "STATIC_QRIS", label: "QRIS" },
  { value: "PG", label: "Payment Gateway" },
];

// ── Page Component ───────────────────────────────────────────────────────────

export default function TransactionsPage() {
  // ── Filter state ─────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    limit: PAGE_LIMIT,
  });
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────
  const { transactions, meta, isLoading, error, refresh } =
    useTransactions(filters);
  const { kiosks } = useKiosks();

  // ── Derived state ────────────────────────────────────────────────────────
  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 0;
  const currentPage = meta?.page ?? 1;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.kioskId) count++;
    if (filters.status) count++;
    if (filters.paymentMethod) count++;
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

  const handleSearch = useCallback(() => {
    const trimmed = searchInput.trim();
    updateFilter("search", trimmed || undefined);
  }, [searchInput, updateFilter]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch],
  );

  const clearSearch = useCallback(() => {
    setSearchInput("");
    updateFilter("search", undefined);
  }, [updateFilter]);

  const clearAllFilters = useCallback(() => {
    setSearchInput("");
    setFilters({ page: 1, limit: PAGE_LIMIT });
  }, []);

  const goToPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  // ── Kiosk name lookup ──────────────────────────────────────────────────
  const kioskNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const k of kiosks) {
      map.set(k.id, k.name);
    }
    return map;
  }, [kiosks]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-1 pb-5 border-b border-zinc-100">
        <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
          Transaksi &amp; Laporan
        </h1>
        <p className="text-sm text-zinc-500">
          Pantau semua transaksi dari seluruh kiosk kamu.
          {meta && !isLoading && (
            <span className="text-zinc-400 ml-1">
              {meta.total} transaksi ditemukan
            </span>
          )}
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
            <Input
              placeholder="Cari order ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
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

          {/* Filter toggle */}
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

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={cn("size-3", isLoading && "animate-spin")} />
          </Button>

          {/* Clear all */}
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
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-zinc-200 bg-zinc-50/50">
            {/* Kiosk filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                Kiosk
              </label>
              <select
                value={filters.kioskId ?? ""}
                onChange={(e) =>
                  updateFilter("kioskId", e.target.value || undefined)
                }
                className="h-7 text-xs rounded-md border border-zinc-200 bg-white px-2 pr-6 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              >
                <option value="">Semua Kiosk</option>
                {kiosks.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
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
                className="h-7 text-xs rounded-md border border-zinc-200 bg-white px-2 pr-6 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              >
                <option value="">Semua Status</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment method filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
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
                className="h-7 text-xs rounded-md border border-zinc-200 bg-white px-2 pr-6 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              >
                <option value="">Semua Metode</option>
                {PAYMENT_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                Dari
              </label>
              <input
                type="date"
                value={filters.startDate ?? ""}
                onChange={(e) =>
                  updateFilter("startDate", e.target.value || undefined)
                }
                className="h-7 text-xs rounded-md border border-zinc-200 bg-white px-2 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                Sampai
              </label>
              <input
                type="date"
                value={filters.endDate ?? ""}
                onChange={(e) =>
                  updateFilter("endDate", e.target.value || undefined)
                }
                className="h-7 text-xs rounded-md border border-zinc-200 bg-white px-2 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <span className="font-medium">Gagal memuat transaksi.</span>
          <button onClick={refresh} className="underline hover:text-red-900">
            Coba lagi
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Order
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Kiosk
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                  Detail
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
                      <td className="px-4 py-3">
                        <Skeleton className="h-3 w-24 mb-1.5" />
                        <Skeleton className="h-3 w-16" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-3 w-20" />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Skeleton className="h-3 w-28" />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <Skeleton className="h-3 w-16" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Skeleton className="h-3 w-16 ml-auto" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Skeleton className="h-5 w-16 rounded-full ml-auto" />
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {/* Empty state */}
              {!isLoading && transactions.length === 0 && !error && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
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
                const kioskName = kioskNameMap.get(tx.kioskId) ?? "—";
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-zinc-600">
                        {tx.orderId}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {formatDateTime(tx.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-700">
                      {kioskName}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-xs text-zinc-500 space-y-0.5">
                        <p>
                          {tx.printQty} cetak
                          {tx.hasDigitalCopy && " + digital"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 hidden lg:table-cell">
                      {PAYMENT_METHOD_LABEL[tx.paymentMethod] ??
                        tx.paymentMethod}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-zinc-900 tabular-nums">
                      {formatRupiah(tx.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge className={cn("text-[10px]", sc.className)}>
                        {sc.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {meta && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50/50">
            <p className="text-xs text-zinc-400">
              Hal. {currentPage} dari {totalPages}
              <span className="hidden sm:inline">
                {" "}
                · {meta.total} transaksi
              </span>
            </p>
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

              {/* Page numbers — show max 5 around current */}
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
          </div>
        )}
      </div>
    </div>
  );
}
