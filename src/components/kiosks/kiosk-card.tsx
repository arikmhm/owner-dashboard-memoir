"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Kiosk Card Component
// Displays a single kiosk with status, pairing info, pricing, and actions.
// Part of FEAT-OD-03.1 — Kiosk List & Cards
// ─────────────────────────────────────────────────────────────────────────────

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, KeyRound } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { Kiosk } from "@/lib/types";

interface KioskCardProps {
  kiosk: Kiosk;
  onEdit: (kiosk: Kiosk) => void;
  onGeneratePairing: (kiosk: Kiosk) => void;
}

export function KioskCard({
  kiosk,
  onEdit,
  onGeneratePairing,
}: KioskCardProps) {
  const isPaired = !!kiosk.pairedAt;

  return (
    <Card className="py-0 gap-0 rounded-sm shadow-none">
      {/* Header — name, pairing status */}
      <CardHeader className="py-4 pb-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-medium text-zinc-900 truncate">
              {kiosk.name}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      {/* Pricing + Actions */}
      <CardContent className="pt-3 pb-4 space-y-4 border-t border-zinc-100 mt-3">
        <div className="grid grid-cols-3 gap-3">
          <PriceItem label="Sesi Dasar" value={kiosk.priceBaseSession} />
          <PriceItem label="Extra Print" value={kiosk.pricePerExtraPrint} />
          <PriceItem label="Digital Copy" value={kiosk.priceDigitalCopy} />
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => onEdit(kiosk)}
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Edit Kiosk
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => onGeneratePairing(kiosk)}
          >
            <KeyRound className="h-3.5 w-3.5 mr-1.5" />
            {isPaired ? "Reset Pairing" : "Generate Pairing Code"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Price display helper ─────────────────────────────────────────────────────

function PriceItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-sm font-medium text-zinc-900 tabular-nums">
        {formatNumber(value)}
      </p>
    </div>
  );
}
