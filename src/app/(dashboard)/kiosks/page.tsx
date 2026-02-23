import { dummyKiosks, dummySubscription, dummyPlans } from "@/lib/dummy-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function KiosksPage() {
  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
            Manajemen Kiosk
          </h1>
          <p className="text-sm text-zinc-500">
            Kelola semua booth fisik dan kode pairing kamu.{" "}
            <span className="text-zinc-400">
              {dummyKiosks.filter((k) => k.is_active).length} /{" "}
              {dummyPlans.find((p) => p.id === dummySubscription.plan_id)?.max_kiosks} kiosk aktif
            </span>
          </p>
        </div>
        <Button
          size="sm"
          className="bg-zinc-950 text-white hover:bg-zinc-800 shrink-0"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Tambah Kiosk
        </Button>
      </div>

      {/* Kiosk list */}
      <div className="space-y-3">
        {dummyKiosks.map((kiosk) => (
          <div
            key={kiosk.id}
            className="flex items-center justify-between border border-zinc-200 rounded-lg px-5 py-4 bg-white gap-4"
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium text-zinc-900">{kiosk.name}</p>
              <p className="text-xs text-zinc-400">
                {kiosk.paired_at
                  ? `Paired ${new Date(kiosk.paired_at).toLocaleDateString("id-ID")}`
                  : "Belum dipasangkan"}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {kiosk.pairing_code && (
                <span className="font-mono text-xs text-zinc-500 bg-zinc-100 px-2 py-1 rounded">
                  {kiosk.pairing_code}
                </span>
              )}
              <Badge
                variant={kiosk.is_active ? "default" : "secondary"}
                className={
                  kiosk.is_active
                    ? "bg-zinc-950 text-white text-xs"
                    : "bg-zinc-100 text-zinc-400 text-xs"
                }
              >
                {kiosk.is_active ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
