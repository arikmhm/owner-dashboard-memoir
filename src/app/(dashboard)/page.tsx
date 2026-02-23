import { dummyDashboardStats, dummyOwner } from "@/lib/dummy-data";
import { formatRupiah } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Wallet,
  TrendingUp,
  MonitorSmartphone,
  ReceiptText,
} from "lucide-react";

export default function DashboardPage() {
  const stats = [
    {
      label: "Saldo Wallet",
      value: formatRupiah(dummyDashboardStats.walletBalance),
      icon: Wallet,
      sub: "Tersedia untuk ditarik",
    },
    {
      label: "Pendapatan Bulan Ini",
      value: formatRupiah(dummyDashboardStats.totalRevenueThisMonth),
      icon: TrendingUp,
      sub: "Februari 2026",
    },
    {
      label: "Transaksi Hari Ini",
      value: String(dummyDashboardStats.totalTransactionsToday),
      icon: ReceiptText,
      sub: "23 Februari 2026",
    },
    {
      label: "Kiosk Aktif",
      value: `${dummyDashboardStats.activeKiosks} / ${dummyDashboardStats.maxKiosks}`,
      icon: MonitorSmartphone,
      sub: `Maks. ${dummyDashboardStats.maxKiosks} dari plan ${dummyDashboardStats.subscriptionPlanName}`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="space-y-1 pb-5 border-b border-zinc-100">
        <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
          Halo, {dummyOwner._display_name.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-zinc-500">
          Berikut ringkasan aktivitas studio kamu hari ini.
        </p>
      </div>

      {/* Subscription status banner */}
      <div className="flex items-center gap-3 border border-zinc-200 rounded-lg px-4 py-3 bg-white">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900">
            Plan{" "}
            <span className="font-semibold">
              {dummyDashboardStats.subscriptionPlanName}
            </span>{" "}
            aktif
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Berakhir pada {dummyDashboardStats.subscriptionPeriodEnd} ·{" "}
            {dummyDashboardStats.subscriptionDaysLeft} hari lagi
          </p>
        </div>
        <Badge
          variant="secondary"
          className="bg-zinc-100 text-zinc-700 text-xs shrink-0"
        >
          {dummyDashboardStats.subscriptionStatus}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-zinc-200 shadow-none">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                  {stat.label}
                </p>
                <stat.icon className="h-4 w-4 text-zinc-300" />
              </div>
              <p className="text-2xl font-semibold text-zinc-950 tracking-tight">
                {stat.value}
              </p>
              <p className="text-xs text-zinc-400">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
