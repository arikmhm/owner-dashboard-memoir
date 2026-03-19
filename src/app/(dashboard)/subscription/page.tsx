"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Subscription Management Page
// EPIC-OD-07: Plan view, upgrade, invoice history, payment check
// FEAT-05.1: Select / Upgrade Subscription Plan
// FEAT-05.2: Subscription Invoice & Payment Check
// Best practices: client-swr-dedup, rerender-functional-setstate
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from "react";
import {
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  CreditCard,
  AlertCircle,
  Clock,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatRupiah, formatDate, formatDateTime } from "@/lib/format";
import { QRCodeSVG } from "qrcode.react";
import {
  SUBSCRIPTION_STATUS_CONFIG,
  INVOICE_STATUS_CONFIG,
  BILLING_PERIOD_LABEL,
} from "@/lib/constants";
import { useAuth } from "@/components/auth-provider";
import {
  usePlans,
  useInvoices,
  submitSubscription,
  checkPaymentStatus,
} from "@/hooks/use-subscription";
import { ApiError } from "@/lib/api";
import { useCountdown } from "@/hooks/use-countdown";
import { toast } from "sonner";
import type {
  BillingPeriod,
  Subscription,
  SubscriptionInvoice,
  SubscriptionPlan,
} from "@/lib/types";

// ── Constants ────────────────────────────────────────────────────────────────

const INVOICE_LIMIT = 10;

// ── Page Component ───────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  // ── Auth context ─────────────────────────────────────────────────────────
  const {
    subscription,
    subscriptionStatus,
    gracePeriodDaysRemaining,
    pendingUpgrade,
    refreshSubscription,
  } = useAuth();

  // ── Data fetching ────────────────────────────────────────────────────────
  const { plans, isLoading: plansLoading } = usePlans();
  const [invoicePage, setInvoicePage] = useState(1);
  const {
    invoices,
    meta: invoiceMeta,
    isLoading: invoicesLoading,
    error: invoicesError,
    refresh: refreshInvoices,
  } = useInvoices(invoicePage, INVOICE_LIMIT);

  // ── Upgrade dialog state ───────────────────────────────────────────────
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTHLY");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Payment check state ────────────────────────────────────────────────
  const [checkingInvoiceId, setCheckingInvoiceId] = useState<string | null>(
    null,
  );
  // ── QR code display state ─────────────────────────────────────────────
  const [showQrInvoiceId, setShowQrInvoiceId] = useState<string | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────
  const invoiceTotalPages = invoiceMeta
    ? Math.ceil(invoiceMeta.total / invoiceMeta.limit)
    : 0;

  const activePlan = useMemo(() => {
    if (!subscription || !plans.length) return null;
    return plans.find((p) => p.id === subscription.planId) ?? null;
  }, [subscription, plans]);

  const pendingUpgradePlan = useMemo(() => {
    if (!pendingUpgrade || !plans.length) return null;
    return plans.find((p) => p.id === pendingUpgrade.planId) ?? null;
  }, [pendingUpgrade, plans]);

  // Find latest PENDING invoice for the pending upgrade subscription
  const pendingUpgradeInvoice = useMemo(() => {
    if (!pendingUpgrade || !invoices.length) return null;
    return (
      invoices.find(
        (inv) =>
          inv.subscriptionId === pendingUpgrade.id && inv.status === "PENDING",
      ) ?? null
    );
  }, [pendingUpgrade, invoices]);

  const statusConfig = subscriptionStatus
    ? SUBSCRIPTION_STATUS_CONFIG[subscriptionStatus]
    : null;

  const daysLeft = useMemo(() => {
    if (!subscription?.currentPeriodEnd) return null;
    const end = new Date(subscription.currentPeriodEnd);
    const now = new Date();
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
  }, [subscription]);

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

  const handleCheckPayment = useCallback(
    async (invoiceId: string) => {
      setCheckingInvoiceId(invoiceId);

      try {
        const result = await checkPaymentStatus(invoiceId);

        if (result.status === "PAID") {
          toast.success("Pembayaran berhasil! Subscription aktif.");
          await refreshSubscription();
          refreshInvoices();
        } else if (result.status === "FAILED") {
          toast.error("Pembayaran gagal atau kadaluarsa.");
          refreshInvoices();
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
        setCheckingInvoiceId(null);
      }
    },
    [refreshSubscription, refreshInvoices],
  );

  const handleRefreshAll = useCallback(() => {
    refreshSubscription();
    refreshInvoices();
  }, [refreshSubscription, refreshInvoices]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
            Manajemen Subscription
          </h1>
          <p className="text-sm text-zinc-500">
            Kelola plan, perpanjang, dan cek histori invoice.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          className="h-8 text-xs gap-1.5 shrink-0"
        >
          <RefreshCw
            className={cn("size-3", invoicesLoading && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* Active Subscription Card */}
      <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden">
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
                  {subscription && (
                    <p className="text-xs text-zinc-400">
                      Billing {BILLING_PERIOD_LABEL[subscription.billingPeriod]}{" "}
                      · {formatRupiah(subscription.pricePaid)}/periode
                    </p>
                  )}
                </div>
                {statusConfig && (
                  <Badge
                    className={cn("text-xs shrink-0", statusConfig.className)}
                  >
                    {statusConfig.label}
                  </Badge>
                )}
              </div>

              {subscription?.currentPeriodStart &&
                subscription?.currentPeriodEnd && (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-zinc-50 rounded-lg px-4 py-3 space-y-0.5">
                      <p className="text-zinc-400">Mulai</p>
                      <p className="font-medium text-zinc-900">
                        {formatDate(subscription.currentPeriodStart)}
                      </p>
                    </div>
                    <div className="bg-zinc-50 rounded-lg px-4 py-3 space-y-0.5">
                      <p className="text-zinc-400">Berakhir</p>
                      <p className="font-medium text-zinc-900">
                        {formatDate(subscription.currentPeriodEnd)}
                        {daysLeft !== null && (
                          <span
                            className={cn(
                              "ml-1",
                              daysLeft < 3
                                ? "text-red-600 font-medium"
                                : daysLeft < 7
                                  ? "text-yellow-600 font-medium"
                                  : "text-zinc-400",
                            )}
                          >
                            ({daysLeft} hari lagi)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

              {subscriptionStatus === "GRACE_PERIOD" && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800 flex items-center gap-2">
                  <AlertCircle className="size-3.5 shrink-0" />
                  Masa tenggang tersisa {gracePeriodDaysRemaining} hari.
                  Perpanjang segera agar kiosk tetap aktif.
                </div>
              )}

              {subscriptionStatus === "EXPIRED" && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
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
                  {subscriptionStatus === "EXPIRED" ||
                  subscriptionStatus === "GRACE_PERIOD"
                    ? "Perpanjang"
                    : "Upgrade Plan"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pending Upgrade Banner */}
      {pendingUpgrade && (
        <PendingUpgradeBanner
          pendingUpgrade={pendingUpgrade}
          pendingUpgradePlan={pendingUpgradePlan}
          pendingUpgradeInvoice={pendingUpgradeInvoice}
          checkingInvoiceId={checkingInvoiceId}
          onCheckPayment={handleCheckPayment}
        />
      )}

      {/* Plan Features Summary */}
      {activePlan && (
        <div className="text-xs text-zinc-500 space-y-1 px-1">
          <p className="text-zinc-400 font-medium uppercase tracking-wider">
            Fitur Plan {activePlan.name}
          </p>
          <p>✓ Maksimal {activePlan.maxKiosks} kiosk aktif</p>
          <p>✓ Template tidak terbatas</p>
          <p>✓ Semua metode pembayaran (CASH, QRIS, PG)</p>
        </div>
      )}

      {/* Invoice History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">
            Histori Invoice
          </h2>
          {invoiceMeta && !invoicesLoading && (
            <p className="text-xs text-zinc-400">{invoiceMeta.total} invoice</p>
          )}
        </div>

        {/* Invoice Error */}
        {invoicesError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>Gagal memuat histori invoice.</span>
            <button
              onClick={refreshInvoices}
              className="underline hover:text-red-900"
            >
              Coba lagi
            </button>
          </div>
        )}

        <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
          {/* Loading */}
          {invoicesLoading && invoices.length === 0 && (
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
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!invoicesLoading && invoices.length === 0 && !invoicesError && (
            <div className="py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-2">
                <CreditCard className="size-4 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-500">
                Belum ada invoice
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Invoice subscription akan muncul di sini.
              </p>
            </div>
          )}

          {/* Invoice rows */}
          {invoices.length > 0 && (
            <div className="divide-y divide-zinc-100">
              {invoices.map((inv) => {
                const sc =
                  INVOICE_STATUS_CONFIG[
                    inv.status as keyof typeof INVOICE_STATUS_CONFIG
                  ];
                const isChecking = checkingInvoiceId === inv.id;

                const isQrVisible = showQrInvoiceId === inv.id;

                return (
                  <div key={inv.id}>
                    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50/50 transition-colors gap-4">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-medium text-zinc-900 tabular-nums">
                          {formatRupiah(inv.amount)}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">
                          {formatDate(inv.periodStart)} —{" "}
                          {formatDate(inv.periodEnd)} ·{" "}
                          {BILLING_PERIOD_LABEL[inv.billingPeriod]}
                        </p>
                        {inv.orderId && (
                          <p className="text-[10px] font-mono text-zinc-400">
                            {inv.orderId}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {inv.paidAt && (
                          <span className="text-xs text-zinc-400 hidden sm:block">
                            {formatDate(inv.paidAt)}
                          </span>
                        )}

                        {/* Actions for PENDING invoices */}
                        {inv.status === "PENDING" && (
                          <div className="flex items-center gap-1.5">
                            {inv.qrString && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] gap-1 px-2"
                                onClick={() =>
                                  setShowQrInvoiceId(
                                    isQrVisible ? null : inv.id,
                                  )
                                }
                              >
                                {isQrVisible ? "Tutup QR" : "Lihat QR"}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] gap-1 px-2"
                              onClick={() => handleCheckPayment(inv.id)}
                              disabled={isChecking}
                            >
                              {isChecking ? (
                                <Loader2 className="size-2.5 animate-spin" />
                              ) : (
                                <RefreshCw className="size-2.5" />
                              )}
                              Cek
                            </Button>
                          </div>
                        )}

                        <Badge className={cn("text-[10px]", sc?.className)}>
                          {sc?.label ?? inv.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Inline QR code display */}
                    {isQrVisible && inv.qrString && (
                      <div className="px-5 pb-4 flex items-start gap-4 bg-zinc-50/50">
                        <div className="rounded-lg border border-zinc-200 bg-white p-2">
                          <QRCodeSVG
                            value={inv.qrString}
                            size={100}
                            level="M"
                          />
                        </div>
                        <div className="text-xs text-zinc-500 space-y-1 pt-1">
                          <p>
                            Scan QR code untuk membayar via e-wallet atau mobile
                            banking.
                          </p>
                          {inv.paymentExpiresAt && (
                            <p className="text-zinc-400">
                              Bayar sebelum{" "}
                              <span className="font-medium text-zinc-600">
                                {formatDateTime(inv.paymentExpiresAt)}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Invoice pagination */}
          {invoiceTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50/50">
              <p className="text-xs text-zinc-400">
                Hal. {invoicePage} dari {invoiceTotalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                  disabled={invoicePage <= 1}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setInvoicePage((p) => Math.min(invoiceTotalPages, p + 1))
                  }
                  disabled={invoicePage >= invoiceTotalPages}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
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
            <Badge variant="secondary" className="text-[10px]">
              Hemat 2 bulan
            </Badge>
          </div>

          {/* Plans grid */}
          {plansLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-xl p-5 space-y-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-3 w-24" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-2">
              {plans.map((plan, i) => {
                const price =
                  billingPeriod === "MONTHLY"
                    ? plan.priceMonthly
                    : plan.priceYearly;
                const priceLabel =
                  billingPeriod === "MONTHLY" ? "/bln" : "/thn";
                const isHighlighted = i === 1;
                const isCurrentPlan = subscription?.planId === plan.id;
                const isCurrentlySubmitting =
                  isSubmitting && selectedPlanId === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "border rounded-xl p-5 space-y-4 transition relative",
                      isHighlighted
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400",
                    )}
                  >
                    {isCurrentPlan && (
                      <div className="absolute -top-2.5 left-4">
                        <Badge className="text-[9px] bg-emerald-500 text-white hover:bg-emerald-500">
                          Plan Aktif
                        </Badge>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                          {plan.name}
                        </p>
                        {isHighlighted && (
                          <Badge className="text-[9px] bg-white text-zinc-950 hover:bg-white">
                            Populer
                          </Badge>
                        )}
                      </div>
                      <p
                        className={cn(
                          "text-xl font-semibold",
                          isHighlighted ? "text-white" : "text-zinc-950",
                        )}
                      >
                        {formatRupiah(price)}
                        <span className="text-xs font-normal text-zinc-400">
                          {priceLabel}
                        </span>
                      </p>
                      <p
                        className={cn(
                          "text-[11px]",
                          isHighlighted ? "text-zinc-400" : "text-zinc-500",
                        )}
                      >
                        {plan.description}
                      </p>
                    </div>

                    <div
                      className={cn(
                        "text-[11px] space-y-0.5",
                        isHighlighted ? "text-zinc-300" : "text-zinc-500",
                      )}
                    >
                      <p>✓ Maks. {plan.maxKiosks} kiosk aktif</p>
                      <p>✓ Template tidak terbatas</p>
                      <p>✓ Semua metode pembayaran</p>
                    </div>

                    <Button
                      onClick={() => handleUpgrade(plan)}
                      disabled={isSubmitting || isCurrentPlan}
                      className={cn(
                        "w-full text-xs",
                        isHighlighted
                          ? "bg-white text-zinc-950 hover:bg-zinc-100"
                          : "bg-zinc-950 text-white hover:bg-zinc-800",
                      )}
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

// ── Pending Upgrade Banner (extracted for useCountdown) ───────────────────

function PendingUpgradeBanner({
  pendingUpgrade,
  pendingUpgradePlan,
  pendingUpgradeInvoice,
  checkingInvoiceId,
  onCheckPayment,
}: {
  pendingUpgrade: Subscription;
  pendingUpgradePlan: SubscriptionPlan | null;
  pendingUpgradeInvoice: SubscriptionInvoice | null;
  checkingInvoiceId: string | null;
  onCheckPayment: (invoiceId: string) => void;
}) {
  const { display: countdown, isExpired } = useCountdown(
    pendingUpgradeInvoice?.paymentExpiresAt ?? null,
  );

  return (
    <div className="border border-yellow-200 rounded-xl bg-yellow-50 overflow-hidden">
      <div className="px-6 py-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-yellow-600 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-yellow-800">
                Upgrade ke{" "}
                {pendingUpgradePlan?.name ?? pendingUpgrade.planId} menunggu
                pembayaran
              </p>
              <p className="text-xs text-yellow-600">
                {BILLING_PERIOD_LABEL[pendingUpgrade.billingPeriod]} ·{" "}
                {formatRupiah(pendingUpgrade.pricePaid)}/periode — Plan aktif
                saat ini tetap berjalan.
              </p>
            </div>
          </div>
          <Badge className="text-[10px] shrink-0 bg-yellow-100 text-yellow-700">
            Menunggu Pembayaran
          </Badge>
        </div>

        {/* QRIS QR Code for pending upgrade */}
        {pendingUpgradeInvoice?.qrString && !isExpired && (
          <div className="flex items-start gap-4 pt-1">
            <div className="rounded-lg border border-yellow-300 bg-white p-2">
              <QRCodeSVG
                value={pendingUpgradeInvoice.qrString}
                size={120}
                level="M"
              />
            </div>
            <div className="text-xs text-yellow-700 space-y-1">
              <p>
                Scan QR code untuk membayar via e-wallet atau mobile banking.
              </p>
              {pendingUpgradeInvoice.paymentExpiresAt && (
                <div className="flex items-center gap-1.5 text-yellow-600">
                  <Timer className="size-3" />
                  <span className="font-mono font-medium tabular-nums">
                    {countdown}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* QR expired */}
        {isExpired && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="size-3.5 shrink-0" />
            QR code sudah kadaluarsa. Refresh halaman atau buat subscription
            baru.
          </div>
        )}

        {pendingUpgradeInvoice && !isExpired && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
              onClick={() => onCheckPayment(pendingUpgradeInvoice.id)}
              disabled={checkingInvoiceId === pendingUpgradeInvoice.id}
            >
              {checkingInvoiceId === pendingUpgradeInvoice.id ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              Cek Status
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
