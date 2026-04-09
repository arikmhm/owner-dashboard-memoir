"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Kiosk Empty State
// Shown when the owner has no kiosks yet
// ─────────────────────────────────────────────────────────────────────────────

import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KioskEmptyStateProps {
  onAdd: () => void;
}

export function KioskEmptyState({ onAdd }: KioskEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-zinc-100 mb-4">
        <Monitor className="h-7 w-7 text-zinc-400" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-800 mb-1">
        Belum ada kiosk
      </h3>
      <p className="text-sm text-zinc-500 mb-6 max-w-sm">
        Tambahkan kiosk pertama Anda untuk mulai mengoperasikan booth fisik
        melalui memoir.
      </p>
      <Button
        onClick={onAdd}
        className="bg-zinc-950 text-white hover:bg-zinc-800"
      >
        Tambah Kiosk Pertama
      </Button>
    </div>
  );
}
