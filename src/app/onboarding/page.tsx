import { dummyPlans } from "@/lib/dummy-data";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function OnboardingPage() {
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

        {/* Billing toggle placeholder */}
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm font-medium text-zinc-950">Bulanan</span>
          <div className="w-10 h-5 rounded-full bg-zinc-200 relative cursor-pointer">
            <div className="w-4 h-4 rounded-full bg-white shadow absolute top-0.5 left-0.5 transition-all" />
          </div>
          <span className="text-sm text-zinc-400">Tahunan</span>
          <Badge variant="secondary" className="text-xs">
            Hemat 2 bulan
          </Badge>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dummyPlans.map((plan, i) => (
            <div
              key={plan.id}
              className={`border rounded-xl p-6 space-y-5 cursor-pointer transition ${i === 1
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400"
                }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p
                    className={`text-xs font-semibold uppercase tracking-widest ${i === 1 ? "text-zinc-400" : "text-zinc-400"}`}
                  >
                    {plan.name}
                  </p>
                  {i === 1 && (
                    <Badge className="text-[10px] bg-white text-zinc-950 hover:bg-white">
                      Populer
                    </Badge>
                  )}
                </div>
                <p
                  className={`text-2xl font-semibold ${i === 1 ? "text-white" : "text-zinc-950"}`}
                >
                  {formatRupiah(plan.price_monthly)}
                  <span
                    className={`text-sm font-normal ${i === 1 ? "text-zinc-400" : "text-zinc-400"}`}
                  >
                    /bln
                  </span>
                </p>
                <p
                  className={`text-xs ${i === 1 ? "text-zinc-400" : "text-zinc-500"}`}
                >
                  {plan.description}
                </p>
              </div>
              <div
                className={`text-xs space-y-1 ${i === 1 ? "text-zinc-300" : "text-zinc-500"}`}
              >
                <p>✓ Maksimal {plan.max_kiosks} kiosk aktif</p>
                <p>✓ Template tidak terbatas</p>
                <p>✓ Semua metode pembayaran</p>
              </div>
              <Button
                className={`w-full text-sm ${i === 1
                    ? "bg-white text-zinc-950 hover:bg-zinc-100"
                    : "bg-zinc-950 text-white hover:bg-zinc-800"
                  }`}
                asChild
              >
                <a href="/">Pilih {plan.name}</a>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
