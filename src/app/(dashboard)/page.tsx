"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Dashboard Home (FEAT-OD-02.1)
// Owner operational summary: subscription banner + 4 stat cards
// Data: single GET /owner/dashboard — server-side aggregation
// ─────────────────────────────────────────────────────────────────────────────

import { useAuth } from "@/components/auth-provider";
import { useDashboard } from "@/hooks/use-dashboard";
import { formatRupiah } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  TrendingUp,
  MonitorSmartphone,
  ReceiptText,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Ban,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

// ── Subscription banner component ────────────────────────────────────────────

function SubscriptionBanner({
  status,
  planName,
  daysLeft,
  periodEnd,
}: {
  status: string;
  planName: string;
  daysLeft: number;
  periodEnd: string;
}) {
  const periodEndFormatted = periodEnd
    ? new Date(periodEnd).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  switch (status) {
    case "EXPIRED":
      return (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
        >
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-red-800">
              Subscription Anda telah expired
            </p>
            <p className="mt-0.5 text-xs text-red-600">
              Booth Anda terkunci. Aktifkan kembali untuk melanjutkan operasi.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-red-300 text-red-700 hover:bg-red-100"
            asChild
          >
            <Link href="/subscription">Aktifkan</Link>
          </Button>
        </div>
      );

    case "PENDING_PAYMENT":
      return (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-blue-800">
              Menunggu pembayaran subscription
            </p>
            <p className="mt-0.5 text-xs text-blue-600">
              Selesaikan pembayaran untuk mengaktifkan booth Anda.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
            asChild
          >
            <Link href="/subscription">Bayar</Link>
          </Button>
        </div>
      );

    case "CANCELLED":
      return (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3"
        >
          <Ban className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-700">
              Subscription Anda telah dibatalkan
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Pilih plan baru untuk mengaktifkan kembali booth Anda.
            </p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0" asChild>
            <Link href="/subscription">Pilih Plan</Link>
          </Button>
        </div>
      );

    case "ACTIVE":
    default:
      return (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900">
              Plan <span className="font-semibold">{planName}</span> aktif
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              Berakhir pada {periodEndFormatted} · {daysLeft} hari lagi
            </p>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 bg-emerald-50 text-xs text-emerald-700"
          >
            Aktif
          </Badge>
        </div>
      );
  }
}

// ── Subscription banner skeleton ─────────────────────────────────────────────

function SubscriptionBannerSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
      <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-6 w-14 rounded-full" />
    </div>
  );
}

// ── Stat card component ──────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
}

function StatCard({ label, value, sub, icon: Icon }: StatCardProps) {
  return (
    <Card className="border-zinc-200 shadow-none transition-colors hover:border-zinc-300">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            {label}
          </p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50">
            <Icon className="h-4 w-4 text-zinc-400" />
          </div>
        </div>
        <p className="text-2xl font-semibold tracking-tight text-zinc-950">
          {value}
        </p>
        <p className="text-xs text-zinc-400">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ── Stat card skeleton ───────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card className="border-zinc-200 shadow-none">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-40" />
      </CardContent>
    </Card>
  );
}

// ── Main dashboard page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const { summary, isLoading, error, refresh } = useDashboard();

  // Display name: derive from user email or fallback
  const displayName = user?.email?.split("@")[0] || "Owner";

  // Subscription derived values — all from server-aggregated summary
  const subStatus = summary?.subscriptionStatus ?? "EXPIRED";
  const planName = summary?.planName ?? "—";
  const periodEnd = summary?.currentPeriodEnd ?? "";
  const daysLeft = periodEnd
    ? Math.max(
        0,
        Math.ceil(
          (new Date(periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  // Current month/day labels for stat cards
  const currentMonth = new Date().toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  const currentDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Stat card definitions (only rendered when data ready)
  const statCards: StatCardProps[] = summary
    ? [
        {
          label: "Saldo Wallet",
          value: formatRupiah(summary.walletBalance),
          icon: Wallet,
          sub: "Tersedia untuk ditarik",
        },
        {
          label: "Pendapatan Bulan Ini",
          value: formatRupiah(summary.revenueThisMonth),
          icon: TrendingUp,
          sub: currentMonth,
        },
        {
          label: "Transaksi Hari Ini",
          value: String(summary.paidTransactionsToday),
          icon: ReceiptText,
          sub: currentDate,
        },
        {
          label: "Kiosk Aktif",
          value: `${summary.activeKiosks} / ${summary.maxKiosks}`,
          icon: MonitorSmartphone,
          sub: `Maks. ${summary.maxKiosks} dari plan ${planName}`,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* ── Heading ─────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Selamat datang, {displayName}
          </h1>
          <p className="text-sm text-zinc-500">
            Berikut ringkasan aktivitas studio kamu hari ini.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          className="gap-1.5 text-zinc-400 hover:text-zinc-700"
          aria-label="Refresh data dashboard"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden text-xs sm:inline">Refresh</span>
        </Button>
      </div>

      {/* ── Error state ─────────────────────────────────────────────────── */}
      {error && !isLoading && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
        >
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-red-800">
              Gagal memuat data dashboard
            </p>
            <p className="mt-0.5 text-xs text-red-600">
              {error.message || "Terjadi kesalahan, coba lagi nanti."}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-red-300 text-red-700 hover:bg-red-100"
            onClick={refresh}
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* ── Subscription banner ─────────────────────────────────────────── */}
      {isLoading ? (
        <SubscriptionBannerSkeleton />
      ) : (
        <SubscriptionBanner
          status={subStatus}
          planName={planName}
          daysLeft={daysLeft}
          periodEnd={periodEnd}
        />
      )}

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))
          : statCards.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>
    </div>
  );
}
