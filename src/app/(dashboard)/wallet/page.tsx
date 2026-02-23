import {
  dummyOwner,
  dummyWalletMutations,
  dummyWithdrawals,
} from "@/lib/dummy-data";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { WITHDRAWAL_STATUS_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft, ArrowUpRight, Download } from "lucide-react";

export default function WalletPage() {
  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="space-y-1 pb-5 border-b border-zinc-100">
        <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
          Wallet &amp; Keuangan
        </h1>
        <p className="text-sm text-zinc-500">
          Pantau saldo dan histori mutasi keuangan kamu.
        </p>
      </div>

      {/* Balance card */}
      <div className="border border-zinc-200 rounded-xl px-6 py-5 bg-white space-y-3">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Saldo Tersedia
        </p>
        <p className="text-3xl font-semibold text-zinc-950 tracking-tight">
          {formatRupiah(dummyOwner.wallet_balance)}
        </p>
        <Button size="sm" className="bg-zinc-950 text-white hover:bg-zinc-800">
          <Download className="h-3.5 w-3.5 mr-1" />
          Request Withdrawal
        </Button>
      </div>

      {/* Mutations */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">
          Histori Mutasi
        </h2>
        <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white divide-y divide-zinc-100">
          {dummyWalletMutations.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition"
            >
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${m.type === "CREDIT"
                  ? "bg-zinc-100 text-zinc-700"
                  : "bg-zinc-950 text-white"
                  }`}
              >
                {m.type === "CREDIT" ? (
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm text-zinc-900 truncate">
                  {m.description}
                </p>
                <p className="text-xs text-zinc-400">
                  {formatDateTime(m.created_at)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p
                  className={`text-sm font-medium ${m.type === "CREDIT" ? "text-zinc-900" : "text-zinc-500"
                    }`}
                >
                  {m.type === "CREDIT" ? "+" : "-"}
                  {formatRupiah(m.amount)}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {formatRupiah(m.current_balance_snapshot)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Withdrawals */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">
          Riwayat Withdrawal
        </h2>
        <div className="space-y-2">
          {dummyWithdrawals.map((w) => {
            const sc = WITHDRAWAL_STATUS_CONFIG[w.status];
            return (
              <div
                key={w.id}
                className="flex items-center justify-between border border-zinc-200 rounded-lg px-5 py-3.5 bg-white gap-4"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium text-zinc-900">
                    {formatRupiah(w.amount)}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">
                    {w.bank_name} · {w.bank_account_number} · {w.bank_account_name}
                  </p>
                  {w.rejection_note && (
                    <p className="text-xs text-zinc-500 italic">
                      Catatan: {w.rejection_note}
                    </p>
                  )}
                </div>
                <Badge className={cn("text-xs shrink-0", sc.className)}>
                  {sc.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
