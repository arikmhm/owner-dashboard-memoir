"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Subscription Management Page
// EPIC-OD-07: Plan view, upgrade, invoice history, payment check
// FEAT-05.1: Select / Upgrade Subscription Plan
// FEAT-05.2: Subscription Invoice & Payment Check
// Best practices: client-swr-dedup, rerender-functional-setstate
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpCircle,
  RefreshCw,
  Loader2,
  CreditCard,
  AlertCircle,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatRupiah, formatDate } from "@/lib/format";
import {
  SUBSCRIPTION_STATUS_CONFIG,
} from "@/lib/constants";
import { useAuth } from "@/components/auth-provider";
import {
  usePlans,
  useInvoices,
  submitSubscription,
} from "@/hooks/use-subscription";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";
import type { BillingPeriod, SubscriptionPlan } from "@/lib/types";

// ── Constants ────────────────────────────────────────────────────────────────

const INVOICE_LIMIT = 10;

// ── Page Component ───────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  // ── Router ───────────────────────────────────────────────────────────────
  const router = useRouter();

  // ── Auth context ─────────────────────────────────────────────────────────
  const {
    subscription,
    subscriptionStatus,
    pendingUpgrade,
    refreshSubscription,
  } = useAuth();

  // ── Data fetching ────────────────────────────────────────────────────────
  const { plans, isLoading: plansLoading } = usePlans();
  const {
    invoices,
    isLoading: invoicesLoading,
    isRefetching: invoicesRefetching,
    error: invoicesError,
    refresh: refreshInvoices,
  } = useInvoices(1, INVOICE_LIMIT);

  // ── Upgrade dialog state ───────────────────────────────────────────────
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTHLY");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Payment check state ────────────────────────────────────────────────
  // (Moved to invoice detail page)

  // ── Derived ────────────────────────────────────────────────────────────
  // Filter invoices to show only PAID
  const paidInvoices = useMemo(
    () => invoices.filter((inv) => inv.status === "PAID"),
    [invoices],
  );

  const activePlan = useMemo(() => {
    if (!subscription || !plans.length) return null;
    return plans.find((p) => p.id === subscription.planId) ?? null;
  }, [subscription, plans]);

  const statusConfig = subscriptionStatus
    ? SUBSCRIPTION_STATUS_CONFIG[subscriptionStatus]
    : null;

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleUpgrade = useCallback(
    async (plan: SubscriptionPlan) => {
      setIsSubmitting(true);
      setSelectedPlanId(plan.id);

      try {
        const result = await submitSubscription({
          planId: plan.id,
          billingPeriod,
        });

        setUpgradeOpen(false);
        if (result.invoice.qrString) {
          toast("Scan QR code di bawah untuk menyelesaikan pembayaran.", {
            icon: <CreditCard className="size-4 text-zinc-500" />,
          });
        } else {
          toast.success("Subscription berhasil dibuat!");
        }
        await refreshSubscription();
        refreshInvoices();
      } catch (err) {
        if (err instanceof ApiError) {
          toast.error(err.message || "Gagal membuat subscription.");
        } else {
          toast.error("Terjadi kesalahan. Silakan coba lagi.");
        }
      } finally {
        setIsSubmitting(false);
        setSelectedPlanId(null);
      }
    },
    [billingPeriod, refreshSubscription, refreshInvoices],
  );

  const handleRefreshAll = useCallback(() => {
    refreshSubscription();
    refreshInvoices();
  }, [refreshSubscription, refreshInvoices]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-200">
        <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
          Subscription
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          disabled={invoicesRefetching}
          className="h-8 text-xs gap-1.5 shrink-0"
        >
          <RefreshCw
            className={cn("size-3", invoicesRefetching && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* Active Subscription Card */}
      <div className="border border-zinc-200 rounded-sm bg-white overflow-hidden">
        <div className="px-6 py-5 space-y-4">
          {!subscription && !plansLoading ? (
            <div className="text-center py-4">
              <p className="text-sm text-zinc-500">
                Belum ada subscription aktif.
              </p>
              <Button
                size="sm"
                className="mt-3 bg-zinc-950 text-white hover:bg-zinc-800"
                onClick={() => setUpgradeOpen(true)}
              >
                Pilih Plan
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Plan Aktif
                  </p>
                  {plansLoading && !activePlan ? (
                    <Skeleton className="h-6 w-24" />
                  ) : (
                    <p className="text-xl font-semibold text-zinc-950">
                      {activePlan?.name ?? subscription?.planId}
                    </p>
                  )}
                  {subscription?.currentPeriodEnd && (
                    <p className="text-xs text-zinc-400">
                      Berakhir {formatDate(subscription.currentPeriodEnd)}
                    </p>
                  )}
                </div>
                {statusConfig && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn("w-1.5 h-1.5 rounded-full", statusConfig.dotClass)} />
                    <span className={cn("text-xs", statusConfig.textClass)}>{statusConfig.label}</span>
                  </div>
                )}
              </div>

              {subscriptionStatus === "EXPIRED" && (
                <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="size-3.5 shrink-0" />
                  Subscription sudah expired. Perpanjang untuk mengaktifkan
                  kembali kiosk.
                </div>
              )}

              <Separator />

              <div className="flex gap-3">
                <Button
                  size="sm"
                  className="bg-zinc-950 text-white hover:bg-zinc-800 text-xs"
                  onClick={() => setUpgradeOpen(true)}
                  disabled={!!pendingUpgrade}
                >
                  <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
                  {subscriptionStatus === "EXPIRED"
                    ? "Perpanjang"
                    : "Upgrade Plan"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Invoice History */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-500">
          Histori Pembayaran
        </h2>

        {/* Invoice Error */}
        {invoicesError && (
          <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>Gagal memuat histori pembayaran.</span>
            <button
              onClick={refreshInvoices}
              className="underline hover:text-red-900"
            >
              Coba lagi
            </button>
          </div>
        )}

        <div className="border border-zinc-200 rounded-sm overflow-hidden bg-white">
          {/* Loading */}
          {invoicesLoading && paidInvoices.length === 0 && (
            <div className="divide-y divide-zinc-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-5 py-3.5"
                >
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-4 w-4" />
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!invoicesLoading && paidInvoices.length === 0 && !invoicesError && (
            <div className="py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-2">
                <CreditCard className="size-4 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-500">
                Belum ada pembayaran
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Histori pembayaran subscription akan muncul di sini.
              </p>
            </div>
          )}

          {/* Invoice rows - Simplified */}
          {paidInvoices.length > 0 && (
            <div className="divide-y divide-zinc-100">
              {paidInvoices.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => router.push(`/subscription/invoice/${inv.id}`)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors gap-4 text-left"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-zinc-900 tabular-nums">
                      {formatRupiah(inv.amount)}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {inv.paidAt ? formatDate(inv.paidAt) : "—"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs text-zinc-500">Lunas</span>
                    </div>
                    <ChevronRightIcon className="size-4 text-zinc-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upgrade / Select Plan Dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pilih Plan Subscription</DialogTitle>
            <DialogDescription>
              Pilih plan yang sesuai dengan kebutuhan studio kamu.
            </DialogDescription>
          </DialogHeader>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 py-2">
            <span
              className={cn(
                "text-sm font-medium cursor-pointer transition",
                billingPeriod === "MONTHLY" ? "text-zinc-950" : "text-zinc-400",
              )}
              onClick={() => setBillingPeriod("MONTHLY")}
            >
              Bulanan
            </span>
            <button
              type="button"
              onClick={() =>
                setBillingPeriod((prev) =>
                  prev === "MONTHLY" ? "YEARLY" : "MONTHLY",
                )
              }
              className="relative w-10 h-5 rounded-full bg-zinc-200 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
              role="switch"
              aria-checked={billingPeriod === "YEARLY"}
              aria-label="Toggle billing period"
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-all",
                  billingPeriod === "YEARLY" ? "left-5.5" : "left-0.5",
                )}
              />
            </button>
            <span
              className={cn(
                "text-sm cursor-pointer transition",
                billingPeriod === "YEARLY"
                  ? "text-zinc-950 font-medium"
                  : "text-zinc-400",
              )}
              onClick={() => setBillingPeriod("YEARLY")}
            >
              Tahunan
            </span>
            <span className="text-[10px] text-zinc-400 border border-zinc-200 rounded-sm px-1.5 py-0.5">
              Hemat 2 bulan
            </span>
          </div>

          {/* Plans grid */}
          {plansLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-sm p-5 space-y-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-3 w-24" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-8 w-full rounded-sm" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-2">
              {plans.map((plan) => {
                const price =
                  billingPeriod === "MONTHLY"
                    ? plan.priceMonthly
                    : plan.priceYearly;
                const priceLabel =
                  billingPeriod === "MONTHLY" ? "/bln" : "/thn";
                const isCurrentPlan = subscription?.planId === plan.id;
                const isCurrentlySubmitting =
                  isSubmitting && selectedPlanId === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "border rounded-sm p-5 space-y-4 transition relative",
                      isCurrentPlan
                        ? "border-zinc-950 bg-zinc-50"
                        : "border-zinc-200 bg-white hover:border-zinc-400",
                    )}
                  >
                    {isCurrentPlan && (
                      <div className="absolute -top-2.5 left-4 flex items-center gap-1 bg-zinc-950 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-sm">
                        Plan Aktif
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                        {plan.name}
                      </p>
                      <p className="text-xl font-semibold text-zinc-950">
                        {formatRupiah(price)}
                        <span className="text-xs font-normal text-zinc-400">
                          {priceLabel}
                        </span>
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {plan.description}
                      </p>
                    </div>

                    <div className="text-[11px] space-y-0.5 text-zinc-500">
                      <p>✓ Maks. {plan.maxKiosks} kiosk aktif</p>
                      <p>✓ Template tidak terbatas</p>
                      <p>✓ Semua metode pembayaran</p>
                    </div>

                    <Button
                      onClick={() => handleUpgrade(plan)}
                      disabled={isSubmitting || isCurrentPlan}
                      className="w-full text-xs bg-zinc-950 text-white hover:bg-zinc-800"
                      size="sm"
                    >
                      {isCurrentlySubmitting ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Memproses...
                        </>
                      ) : isCurrentPlan ? (
                        "Plan Aktif"
                      ) : (
                        `Pilih ${plan.name}`
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpgradeOpen(false)}
              disabled={isSubmitting}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
