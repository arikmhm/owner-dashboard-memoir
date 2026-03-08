"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Wallet & Finance Page
// EPIC-OD-06: Wallet balance, mutation history, withdrawal management
// FEAT-04.1: Wallet Balance & Mutation History
// FEAT-04.2: Withdrawal Request
// Best practices: client-swr-dedup, rerender-functional-setstate, async-parallel
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Wallet,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatRupiah, formatDateTime, formatDate } from "@/lib/format";
import { WITHDRAWAL_STATUS_CONFIG } from "@/lib/constants";
import { useWallet, useWithdrawals } from "@/hooks/use-wallet";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";

// ── Constants ────────────────────────────────────────────────────────────────

const MUTATION_LIMIT = 15;
const WITHDRAWAL_LIMIT = 10;

const MUTATION_CATEGORY_LABEL: Record<string, string> = {
  TRANSACTION_INCOME: "Transaksi Masuk",
  WITHDRAWAL: "Pencairan Dana",
  ADJUSTMENT: "Penyesuaian",
};

const WITHDRAWAL_ERROR_MESSAGES: Record<string, string> = {
  BELOW_MINIMUM: "Jumlah withdrawal di bawah minimum yang ditetapkan.",
  INSUFFICIENT_BALANCE: "Saldo tidak mencukupi untuk jumlah ini.",
  PENDING_WITHDRAWAL_EXISTS:
    "Kamu masih memiliki request withdrawal yang sedang diproses.",
};

// ── Page Component ───────────────────────────────────────────────────────────

export default function WalletPage() {
  // ── Pagination state ───────────────────────────────────────────────────
  const [mutationPage, setMutationPage] = useState(1);
  const [withdrawalPage, setWithdrawalPage] = useState(1);

  // ── Withdrawal dialog state ────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
  });

  // ── Data fetching (parallel via SWR dedup) ─────────────────────────────
  const {
    balance,
    mutations,
    meta: mutationMeta,
    isLoading: walletLoading,
    error: walletError,
    refresh: refreshWallet,
  } = useWallet(mutationPage, MUTATION_LIMIT);

  const {
    withdrawals,
    meta: withdrawalMeta,
    isLoading: withdrawalLoading,
    error: withdrawalError,
    hasPending,
    refresh: refreshWithdrawals,
    createWithdrawal,
    isCreating,
  } = useWithdrawals(withdrawalPage, WITHDRAWAL_LIMIT);

  // ── Derived ────────────────────────────────────────────────────────────
  const mutationTotalPages = mutationMeta
    ? Math.ceil(mutationMeta.total / mutationMeta.limit)
    : 0;
  const withdrawalTotalPages = withdrawalMeta
    ? Math.ceil(withdrawalMeta.total / withdrawalMeta.limit)
    : 0;

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleRefreshAll = useCallback(() => {
    refreshWallet();
    refreshWithdrawals();
  }, [refreshWallet, refreshWithdrawals]);

  const handleOpenWithdrawal = useCallback(() => {
    setWithdrawalForm({
      amount: "",
      bankName: "",
      bankAccountNumber: "",
      bankAccountName: "",
    });
    setDialogOpen(true);
  }, []);

  const handleFormChange = useCallback(
    (field: keyof typeof withdrawalForm, value: string) => {
      setWithdrawalForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSubmitWithdrawal = useCallback(async () => {
    const amount = Number(withdrawalForm.amount);
    if (
      !amount ||
      !withdrawalForm.bankName.trim() ||
      !withdrawalForm.bankAccountNumber.trim() ||
      !withdrawalForm.bankAccountName.trim()
    ) {
      toast.error("Lengkapi semua field sebelum mengirim.");
      return;
    }

    try {
      await createWithdrawal({
        amount,
        bankName: withdrawalForm.bankName.trim(),
        bankAccountNumber: withdrawalForm.bankAccountNumber.trim(),
        bankAccountName: withdrawalForm.bankAccountName.trim(),
      });

      toast.success("Request withdrawal berhasil dikirim!");
      setDialogOpen(false);
      refreshWallet();
    } catch (err) {
      if (err instanceof ApiError) {
        const msg =
          WITHDRAWAL_ERROR_MESSAGES[err.code] ??
          err.message ??
          "Gagal membuat withdrawal.";
        toast.error(msg);
      } else {
        toast.error("Terjadi kesalahan. Silakan coba lagi.");
      }
    }
  }, [withdrawalForm, createWithdrawal, refreshWallet]);

  const isFormValid = useMemo(() => {
    const amount = Number(withdrawalForm.amount);
    return (
      amount > 0 &&
      withdrawalForm.bankName.trim().length > 0 &&
      withdrawalForm.bankAccountNumber.trim().length > 0 &&
      withdrawalForm.bankAccountName.trim().length > 0
    );
  }, [withdrawalForm]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
            Wallet &amp; Keuangan
          </h1>
          <p className="text-sm text-zinc-500">
            Pantau saldo dan histori mutasi keuangan kamu.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          className="h-8 text-xs gap-1.5 shrink-0"
        >
          <RefreshCw
            className={cn(
              "size-3",
              (walletLoading || withdrawalLoading) && "animate-spin",
            )}
          />
          Refresh
        </Button>
      </div>

      {/* Balance Card */}
      <div className="border border-zinc-200 rounded-xl px-6 py-5 bg-white space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Saldo Tersedia
          </p>
          {walletLoading && mutations.length === 0 ? (
            <Skeleton className="h-9 w-44" />
          ) : (
            <p className="text-3xl font-semibold text-zinc-950 tracking-tight tabular-nums">
              {formatRupiah(balance)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-zinc-950 text-white hover:bg-zinc-800"
            onClick={handleOpenWithdrawal}
            disabled={hasPending}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Request Withdrawal
          </Button>
          {hasPending && (
            <p className="text-xs text-zinc-400 flex items-center gap-1">
              <Clock className="size-3" />
              Ada withdrawal yang sedang diproses
            </p>
          )}
        </div>
      </div>

      {/* Wallet Error */}
      {walletError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>Gagal memuat data wallet.</span>
          <button
            onClick={refreshWallet}
            className="underline hover:text-red-900"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Mutation History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">
            Histori Mutasi
          </h2>
          {mutationMeta && !walletLoading && (
            <p className="text-xs text-zinc-400">{mutationMeta.total} mutasi</p>
          )}
        </div>

        <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
          {/* Loading */}
          {walletLoading && mutations.length === 0 && (
            <div className="divide-y divide-zinc-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="text-right space-y-1.5">
                    <Skeleton className="h-3 w-20 ml-auto" />
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!walletLoading && mutations.length === 0 && !walletError && (
            <div className="py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-2">
                <Wallet className="size-4 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-500">
                Belum ada mutasi
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Mutasi pendapatan akan muncul saat kiosk menerima pembayaran.
              </p>
            </div>
          )}

          {/* Mutation rows */}
          {mutations.length > 0 && (
            <div className="divide-y divide-zinc-100">
              {mutations.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50/50 transition-colors"
                >
                  <div
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                      m.type === "CREDIT"
                        ? "bg-zinc-100 text-zinc-700"
                        : "bg-zinc-950 text-white",
                    )}
                  >
                    {m.type === "CREDIT" ? (
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm text-zinc-900 truncate">
                      {m.description ??
                        MUTATION_CATEGORY_LABEL[m.category] ??
                        m.category}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {formatDateTime(m.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={cn(
                        "text-sm font-medium tabular-nums",
                        m.type === "CREDIT" ? "text-zinc-900" : "text-zinc-500",
                      )}
                    >
                      {m.type === "CREDIT" ? "+" : "−"}
                      {formatRupiah(m.amount)}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5 tabular-nums">
                      {formatRupiah(m.currentBalanceSnapshot)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mutation pagination */}
          {mutationTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50/50">
              <p className="text-xs text-zinc-400">
                Hal. {mutationPage} dari {mutationTotalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMutationPage((p) => Math.max(1, p - 1))}
                  disabled={mutationPage <= 1}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setMutationPage((p) => Math.min(mutationTotalPages, p + 1))
                  }
                  disabled={mutationPage >= mutationTotalPages}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">
            Riwayat Withdrawal
          </h2>
          {withdrawalMeta && !withdrawalLoading && (
            <p className="text-xs text-zinc-400">
              {withdrawalMeta.total} request
            </p>
          )}
        </div>

        {/* Withdrawal Error */}
        {withdrawalError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>Gagal memuat riwayat withdrawal.</span>
            <button
              onClick={refreshWithdrawals}
              className="underline hover:text-red-900"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Loading */}
        {withdrawalLoading && withdrawals.length === 0 && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="border border-zinc-200 rounded-lg px-5 py-3.5 bg-white"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!withdrawalLoading && withdrawals.length === 0 && !withdrawalError && (
          <div className="border border-zinc-200 rounded-lg py-10 text-center bg-white">
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-2">
              <Banknote className="size-4 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-500">
              Belum ada withdrawal
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Request pencairan dana akan muncul di sini.
            </p>
          </div>
        )}

        {/* Withdrawal rows */}
        {withdrawals.length > 0 && (
          <div className="space-y-2">
            {withdrawals.map((w) => {
              const sc = WITHDRAWAL_STATUS_CONFIG[w.status];
              return (
                <div
                  key={w.id}
                  className="border border-zinc-200 rounded-lg px-5 py-3.5 bg-white hover:bg-zinc-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-900 tabular-nums">
                          {formatRupiah(w.amount)}
                        </p>
                        <StatusIcon status={w.status} />
                      </div>
                      <p className="text-xs text-zinc-400 truncate">
                        {w.bankName} · {w.bankAccountNumber} ·{" "}
                        {w.bankAccountName}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {formatDate(w.createdAt)}
                        {w.processedAt &&
                          ` · Diproses ${formatDate(w.processedAt)}`}
                      </p>
                      {w.rejectionNote && (
                        <p className="text-xs text-red-500 italic mt-1">
                          Catatan: {w.rejectionNote}
                        </p>
                      )}
                    </div>
                    <Badge className={cn("text-[10px] shrink-0", sc.className)}>
                      {sc.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Withdrawal pagination */}
        {withdrawalTotalPages > 1 && (
          <div className="flex items-center justify-between px-1 py-2">
            <p className="text-xs text-zinc-400">
              Hal. {withdrawalPage} dari {withdrawalTotalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWithdrawalPage((p) => Math.max(1, p - 1))}
                disabled={withdrawalPage <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setWithdrawalPage((p) =>
                    Math.min(withdrawalTotalPages, p + 1),
                  )
                }
                disabled={withdrawalPage >= withdrawalTotalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Withdrawal Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>
              Ajukan pencairan dana ke rekening bank kamu. Saldo tersedia:{" "}
              <span className="font-medium text-zinc-700">
                {formatRupiah(balance)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="wd-amount" className="text-xs">
                Jumlah (Rp)
              </Label>
              <Input
                id="wd-amount"
                type="number"
                min={0}
                max={balance}
                placeholder="Masukkan jumlah"
                value={withdrawalForm.amount}
                onChange={(e) => handleFormChange("amount", e.target.value)}
                className="h-9 text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wd-bank" className="text-xs">
                Nama Bank
              </Label>
              <Input
                id="wd-bank"
                placeholder="contoh: BCA, Mandiri, BNI"
                value={withdrawalForm.bankName}
                onChange={(e) => handleFormChange("bankName", e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wd-accno" className="text-xs">
                Nomor Rekening
              </Label>
              <Input
                id="wd-accno"
                placeholder="Nomor rekening tujuan"
                value={withdrawalForm.bankAccountNumber}
                onChange={(e) =>
                  handleFormChange("bankAccountNumber", e.target.value)
                }
                className="h-9 text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wd-accname" className="text-xs">
                Nama Pemilik Rekening
              </Label>
              <Input
                id="wd-accname"
                placeholder="Sesuai buku tabungan"
                value={withdrawalForm.bankAccountName}
                onChange={(e) =>
                  handleFormChange("bankAccountName", e.target.value)
                }
                className="h-9 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isCreating}
            >
              Batal
            </Button>
            <Button
              className="bg-zinc-950 text-white hover:bg-zinc-800"
              onClick={handleSubmitWithdrawal}
              disabled={!isFormValid || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Mengirim...
                </>
              ) : (
                "Kirim Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helper Components ────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "PROCESSED":
      return <CheckCircle2 className="size-3.5 text-emerald-500" />;
    case "REJECTED":
      return <XCircle className="size-3.5 text-red-400" />;
    case "PENDING":
      return <Clock className="size-3.5 text-zinc-400" />;
    default:
      return null;
  }
}
