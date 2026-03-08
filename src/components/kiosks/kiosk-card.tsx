"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Kiosk Card Component
// Displays a single kiosk with status, pairing info, pricing, and actions.
// Part of FEAT-OD-03.1 — Kiosk List & Cards
// ─────────────────────────────────────────────────────────────────────────────

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  Wifi,
  WifiOff,
  Settings,
  KeyRound,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/format";
import type { Kiosk } from "@/lib/types";

interface KioskCardProps {
  kiosk: Kiosk;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: (kiosk: Kiosk) => void;
  onGeneratePairing: (kiosk: Kiosk) => void;
}

export function KioskCard({
  kiosk,
  expanded,
  onToggleExpand,
  onEdit,
  onGeneratePairing,
}: KioskCardProps) {
  const isPaired = !!kiosk.pairedAt;

  return (
    <Card className="group transition-shadow hover:shadow-md py-0 gap-0">
      {/* Main Row */}
      <CardHeader className="py-4 pb-0">
        <div className="flex items-start gap-3 min-w-0">
          {/* Status icon */}
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              kiosk.isActive
                ? "bg-emerald-50 text-emerald-600"
                : "bg-zinc-100 text-zinc-400"
            }`}
          >
            {kiosk.isActive ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="text-sm font-medium text-zinc-900 truncate">
              {kiosk.name}
            </CardTitle>
            <p className="text-xs text-zinc-500">
              {isPaired ? (
                <>
                  <span className="text-emerald-600 font-medium">Terpair</span>
                  {" — "}
                  {formatDate(kiosk.pairedAt!)}
                </>
              ) : (
                <span className="text-zinc-400">Belum dipair</span>
              )}
            </p>
          </div>
        </div>

        <CardAction className="flex items-center gap-2">
          <Badge
            variant={kiosk.isActive ? "default" : "secondary"}
            className={
              kiosk.isActive
                ? "bg-emerald-100 text-emerald-700 text-xs font-medium border-0"
                : "bg-zinc-100 text-zinc-400 text-xs font-medium border-0"
            }
          >
            {kiosk.isActive ? "Aktif" : "Nonaktif"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-600"
            onClick={onToggleExpand}
            aria-label={expanded ? "Tutup detail" : "Buka detail"}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CardAction>
      </CardHeader>

      {/* Expanded Detail */}
      {expanded && (
        <CardContent className="pt-3 pb-4 space-y-4 border-t border-zinc-100 mt-3">
          {/* Pricing grid */}
          <div className="grid grid-cols-3 gap-3">
            <PriceItem label="Sesi Dasar" value={kiosk.priceBaseSession} />
            <PriceItem label="Extra Print" value={kiosk.pricePerExtraPrint} />
            <PriceItem label="Digital Copy" value={kiosk.priceDigitalCopy} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onEdit(kiosk)}
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Edit Kiosk
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onGeneratePairing(kiosk)}
            >
              <KeyRound className="h-3.5 w-3.5 mr-1.5" />
              {isPaired ? "Reset Pairing" : "Generate Pairing Code"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Price display helper ─────────────────────────────────────────────────────

function PriceItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-sm font-medium text-zinc-900 tabular-nums">
        {formatRupiah(value)}
      </p>
    </div>
  );
}
