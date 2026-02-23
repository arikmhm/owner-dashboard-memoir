import { dummySubscription, dummyInvoices, dummyPlans } from "@/lib/dummy-data";
import { formatRupiah, formatDate } from "@/lib/format";
import { INVOICE_STATUS_CONFIG, BILLING_PERIOD_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, ArrowUpCircle } from "lucide-react";

export default function SubscriptionPage() {
  const activePlan = dummyPlans.find(
    (p) => p.id === dummySubscription.plan_id,
  );

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="space-y-1 pb-5 border-b border-zinc-100">
        <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
          Manajemen Subscription
        </h1>
        <p className="text-sm text-zinc-500">
          Kelola plan, perpanjang, dan cek histori invoice.
        </p>
      </div>

      {/* Active plan card */}
      <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden">
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Plan Aktif
              </p>
              <p className="text-xl font-semibold text-zinc-950">
                {activePlan?.name}
              </p>
              <p className="text-xs text-zinc-400">
                Billing {BILLING_PERIOD_LABEL[dummySubscription.billing_period]}{" "}
                · {formatRupiah(dummySubscription.price_paid)}/periode
              </p>
            </div>
            <Badge className="bg-zinc-950 text-white text-xs shrink-0">
              {dummySubscription.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-zinc-50 rounded-lg px-4 py-3 space-y-0.5">
              <p className="text-zinc-400">Mulai</p>
              <p className="font-medium text-zinc-900">
                {formatDate(dummySubscription.current_period_start)}
              </p>
            </div>
            <div className="bg-zinc-50 rounded-lg px-4 py-3 space-y-0.5">
              <p className="text-zinc-400">Berakhir</p>
              <p className="font-medium text-zinc-900">
                {formatDate(dummySubscription.current_period_end)}
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Perpanjang
            </Button>
            <Button
              size="sm"
              className="bg-zinc-950 text-white hover:bg-zinc-800 text-xs"
            >
              <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
              Upgrade Plan
            </Button>
          </div>
        </div>
      </div>

      {/* Plan features summary */}
      {activePlan && (
        <div className="text-xs text-zinc-500 space-y-1 px-1">
          <p className="text-zinc-400 font-medium uppercase tracking-wider">
            Fitur Plan {activePlan.name}
          </p>
          <p>✓ Maksimal {activePlan.max_kiosks} kiosk aktif</p>
          <p>✓ Template tidak terbatas</p>
          <p>✓ Semua metode pembayaran (CASH, QRIS, PG)</p>
        </div>
      )}

      {/* Invoices */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">
          Histori Invoice
        </h2>
        <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white divide-y divide-zinc-100">
          {dummyInvoices.map((inv) => {
            const sc = INVOICE_STATUS_CONFIG[inv.status];
            return (
              <div
                key={inv.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition gap-4"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-zinc-900">
                    {formatRupiah(inv.amount)}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">
                    {inv.period_start} — {inv.period_end} ·{" "}
                    {
                      BILLING_PERIOD_LABEL[
                      inv.billing_period as keyof typeof BILLING_PERIOD_LABEL
                      ]
                    }
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {inv.paid_at && (
                    <span className="text-xs text-zinc-400 hidden sm:block">
                      {formatDate(inv.paid_at)}
                    </span>
                  )}
                  <Badge className={cn("text-xs", sc.className)}>
                    {sc.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
