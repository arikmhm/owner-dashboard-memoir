"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { formatRupiah } from "@/lib/format";
import { QRCodeSVG } from "qrcode.react";
import { createSubscription, getPlans } from "@/lib/auth-api";
import { checkPaymentStatus } from "@/hooks/use-subscription";
import { ApiError } from "@/lib/api";
import { useCountdown } from "@/hooks/use-countdown";
import type { SubscriptionPlan, BillingPeriod } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  Timer,
} from "lucide-react";

type OnboardingStep = "select-plan" | "checking-payment";

export default function OnboardingPage() {
  return <OnboardingContent />;
}

function OnboardingContent() {
  const router = useRouter();
  const {
    user,
    isLoading: authLoading,
    subscriptionStatus,
    refreshSubscription,
  } = useAuth();

  const hasActiveSub =
    subscriptionStatus === "ACTIVE" || subscriptionStatus === "GRACE_PERIOD";

  const [step, setStep] = useState<OnboardingStep>("select-plan");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTHLY");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const [pendingQrString, setPendingQrString] = useState<string | null>(null);
  const [pendingExpiresAt, setPendingExpiresAt] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "checking" | "paid" | "not-paid" | "failed"
  >("idle");

  const { display: countdown, isExpired } = useCountdown(pendingExpiresAt);

  // ── Fetch plans via TanStack Query ───────────────────────────────────────

  const {
    data: plans = [],
    isLoading: plansLoading,
    error: plansError,
  } = useQuery<SubscriptionPlan[]>({
    queryKey: ["subscription-plans"],
    queryFn: getPlans,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // ── Create subscription mutation ─────────────────────────────────────────

  const subscriptionMutation = useMutation({
    mutationFn: createSubscription,
    onSuccess: (result) => {
      const { invoice } = result;

      if (invoice.qrString) {
        setPendingInvoiceId(invoice.id);
        setPendingQrString(invoice.qrString);
        setPendingExpiresAt(invoice.paymentExpiresAt ?? null);
        setStep("checking-payment");
      } else {
        // QR generation failed on backend — show fallback
        setPendingInvoiceId(invoice.id);
        setStep("checking-payment");
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError(
            "Anda sudah berlangganan plan ini. Pilih plan atau periode lain.",
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Terjadi kesalahan, coba lagi nanti");
      }
    },
    onSettled: () => {
      setSelectedPlanId(null);
    },
  });

  // Redirect if already has active subscription
  useEffect(() => {
    if (!authLoading && hasActiveSub) {
      router.replace("/");
    }
  }, [authLoading, hasActiveSub, router]);

  const handleSelectPlan = useCallback(
    (planId: string) => {
      setError(null);
      setSelectedPlanId(planId);
      subscriptionMutation.mutate({
        planId,
        billingPeriod,
      });
    },
    [billingPeriod, subscriptionMutation],
  );

  const handleCheckPayment = useCallback(async () => {
    if (!pendingInvoiceId) return;

    setPaymentStatus("checking");
    setError(null);

    try {
      const result = await checkPaymentStatus(pendingInvoiceId);

      if (result.status === "PAID") {
        setPaymentStatus("paid");
        await refreshSubscription();
        // Hard reload to force AuthProvider re-init with fresh subscription
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } else if (result.status === "FAILED") {
        setPaymentStatus("failed");
      } else {
        setPaymentStatus("not-paid");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Gagal mengecek status pembayaran");
      }
      setPaymentStatus("idle");
    }
  }, [pendingInvoiceId, refreshSubscription]);

  const handleBackToPlans = useCallback(() => {
    setStep("select-plan");
    setPendingInvoiceId(null);
    setPendingQrString(null);
    setPendingExpiresAt(null);
    setPaymentStatus("idle");
    setError(null);
  }, []);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Not authenticated → AuthProvider will redirect
  if (!user) return null;

  // ── Step 2: Payment Check ──────────────────────────────────────────────
  if (step === "checking-payment") {
    const showQr =
      pendingQrString &&
      !isExpired &&
      paymentStatus !== "paid" &&
      paymentStatus !== "failed";

    const showExpired =
      isExpired && paymentStatus !== "paid" && paymentStatus !== "failed";

    const showQrFallback =
      !pendingQrString &&
      !isExpired &&
      paymentStatus !== "paid" &&
      paymentStatus !== "failed";

    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest">
              memoir.
            </p>
            <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
              {paymentStatus === "paid"
                ? "Pembayaran Berhasil"
                : "Selesaikan Pembayaran"}
            </h1>
            {paymentStatus !== "paid" && paymentStatus !== "failed" && (
              <p className="text-sm text-zinc-500">
                Scan QR code menggunakan e-wallet atau mobile banking, lalu cek
                status pembayaran.
              </p>
            )}
          </div>

          {/* QRIS QR Code + countdown */}
          {showQr && (
            <div className="space-y-3">
              <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-4">
                <QRCodeSVG value={pendingQrString} size={200} level="M" />
              </div>
              {pendingExpiresAt && (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Timer className="size-4 text-zinc-400" />
                  <span className="font-mono font-medium tabular-nums text-zinc-700">
                    {countdown}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* QR expired */}
          {showExpired && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6">
              <XCircle className="h-10 w-10 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  QR code sudah kadaluarsa
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Silakan pilih plan kembali untuk membuat QR baru.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToPlans}
              >
                Kembali ke Pilihan Plan
              </Button>
            </div>
          )}

          {/* Fallback: QR generation failed */}
          {showQrFallback && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
              <div className="space-y-1 text-center">
                <p className="text-sm font-medium text-yellow-800">
                  QR code pembayaran tidak tersedia
                </p>
                <p className="text-xs text-yellow-600">
                  Terjadi kendala saat membuat QR code. Silakan coba lagi.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToPlans}
              >
                Kembali ke Pilihan Plan
              </Button>
            </div>
          )}

          {/* Status display */}
          <div className="space-y-4">
            {paymentStatus === "paid" && (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Pembayaran berhasil!
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Mengalihkan ke dashboard...
                  </p>
                </div>
              </div>
            )}

            {paymentStatus === "not-paid" && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm text-yellow-800">
                  Pembayaran belum terdeteksi. Silakan selesaikan pembayaran
                  terlebih dahulu, lalu coba lagi.
                </p>
              </div>
            )}

            {paymentStatus === "failed" && (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6">
                <XCircle className="h-10 w-10 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Pembayaran gagal atau kadaluarsa
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Silakan pilih plan dan buat pembayaran baru.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {paymentStatus !== "paid" &&
              paymentStatus !== "failed" &&
              !isExpired && (
                <Button
                  onClick={handleCheckPayment}
                  disabled={paymentStatus === "checking"}
                  className="w-full bg-zinc-950 text-white hover:bg-zinc-800"
                >
                  {paymentStatus === "checking" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mengecek...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Cek Status Pembayaran
                    </>
                  )}
                </Button>
              )}

            {(paymentStatus === "failed" || paymentStatus === "not-paid") &&
              !isExpired && (
                <Button
                  variant="outline"
                  onClick={handleBackToPlans}
                  className="w-full"
                >
                  Kembali ke Pilihan Plan
                </Button>
              )}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: Plan Selection ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl space-y-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest">
            memoir.
          </p>
          <h1 className="text-3xl font-semibold text-zinc-950 tracking-tight">
            Pilih Plan Subscription
          </h1>
          <p className="text-sm text-zinc-500">
            Pilih plan yang sesuai dengan kebutuhan studio kamu. Bisa upgrade
            kapan saja.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3">
          <span
            className={`text-sm font-medium cursor-pointer transition ${
              billingPeriod === "MONTHLY" ? "text-zinc-950" : "text-zinc-400"
            }`}
            onClick={() => setBillingPeriod("MONTHLY")}
          >
            Bulanan
          </span>
          <button
            type="button"
            onClick={() =>
              setBillingPeriod((prev: BillingPeriod) =>
                prev === "MONTHLY" ? "YEARLY" : "MONTHLY",
              )
            }
            className="relative w-10 h-5 rounded-full bg-zinc-200 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
            role="switch"
            aria-checked={billingPeriod === "YEARLY"}
            aria-label="Toggle billing period"
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-all ${
                billingPeriod === "YEARLY" ? "left-5.5" : "left-0.5"
              }`}
            />
          </button>
          <span
            className={`text-sm cursor-pointer transition ${
              billingPeriod === "YEARLY"
                ? "text-zinc-950 font-medium"
                : "text-zinc-400"
            }`}
            onClick={() => setBillingPeriod("YEARLY")}
          >
            Tahunan
          </span>
          <Badge variant="secondary" className="text-xs">
            Hemat 2 bulan
          </Badge>
        </div>

        {/* Error */}
        {(error || plansError) && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 max-w-md mx-auto">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 text-center">
              {error || "Gagal memuat daftar plan. Coba refresh halaman."}
            </p>
          </div>
        )}

        {/* Plans Loading */}
        {plansLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="border border-zinc-200 rounded-xl p-6 space-y-5 animate-pulse"
              >
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-zinc-200 rounded" />
                  <div className="h-7 w-32 bg-zinc-200 rounded" />
                  <div className="h-3 w-40 bg-zinc-100 rounded" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-36 bg-zinc-100 rounded" />
                  <div className="h-3 w-32 bg-zinc-100 rounded" />
                  <div className="h-3 w-36 bg-zinc-100 rounded" />
                </div>
                <div className="h-9 w-full bg-zinc-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Plans Grid */}
        {!plansLoading && plans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan, i) => {
              const price =
                billingPeriod === "MONTHLY"
                  ? plan.priceMonthly
                  : plan.priceYearly;
              const priceLabel = billingPeriod === "MONTHLY" ? "/bln" : "/thn";
              const isHighlighted = i === 1;
              const isCurrentlySubmitting =
                subscriptionMutation.isPending && selectedPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`border rounded-xl p-6 space-y-5 transition ${
                    isHighlighted
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                        {plan.name}
                      </p>
                      {isHighlighted && (
                        <Badge className="text-[10px] bg-white text-zinc-950 hover:bg-white">
                          Populer
                        </Badge>
                      )}
                    </div>
                    <p
                      className={`text-2xl font-semibold ${
                        isHighlighted ? "text-white" : "text-zinc-950"
                      }`}
                    >
                      {formatRupiah(price)}
                      <span className="text-sm font-normal text-zinc-400">
                        {priceLabel}
                      </span>
                    </p>
                    <p
                      className={`text-xs ${
                        isHighlighted ? "text-zinc-400" : "text-zinc-500"
                      }`}
                    >
                      {plan.description}
                    </p>
                  </div>
                  <div
                    className={`text-xs space-y-1 ${
                      isHighlighted ? "text-zinc-300" : "text-zinc-500"
                    }`}
                  >
                    <p>✓ Maksimal {plan.maxKiosks} kiosk aktif</p>
                    <p>✓ Template tidak terbatas</p>
                    <p>✓ Semua metode pembayaran</p>
                  </div>
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={subscriptionMutation.isPending}
                    className={`w-full text-sm ${
                      isHighlighted
                        ? "bg-white text-zinc-950 hover:bg-zinc-100"
                        : "bg-zinc-950 text-white hover:bg-zinc-800"
                    }`}
                  >
                    {isCurrentlySubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      `Pilih ${plan.name}`
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state — plans loaded but none active */}
        {!plansLoading && plans.length === 0 && !plansError && (
          <div className="text-center py-8">
            <p className="text-sm text-zinc-500">
              Belum ada plan yang tersedia. Hubungi tim memoir.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
