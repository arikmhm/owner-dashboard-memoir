import { dummyTransactions } from "@/lib/dummy-data";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { TX_STATUS_CONFIG, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function TransactionsPage() {
  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="space-y-1 pb-5 border-b border-zinc-100">
        <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
          Transaksi &amp; Laporan
        </h1>
        <p className="text-sm text-zinc-500">
          Pantau semua transaksi dari seluruh kiosk kamu.
        </p>
      </div>

      {/* Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
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
                Template
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
            {dummyTransactions.map((tx) => {
              const sc = TX_STATUS_CONFIG[tx.status];
              return (
                <tr key={tx.id} className="hover:bg-zinc-50 transition">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-zinc-500">
                      {tx.order_id}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {formatDateTime(tx.created_at)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-700">
                    {tx._kiosk_name}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 hidden md:table-cell">
                    {tx._template_name}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 hidden lg:table-cell">
                    {PAYMENT_METHOD_LABEL[tx.payment_method]}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-zinc-900">
                    {formatRupiah(tx.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge className={cn("text-xs", sc.className)}>
                      {sc.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
