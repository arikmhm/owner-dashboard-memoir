"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Kiosk Skeleton Cards
// Loading placeholder while kiosk data is being fetched
// ─────────────────────────────────────────────────────────────────────────────

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";

export function KioskCardSkeleton() {
  return (
    <Card className="py-0 gap-0">
      <CardHeader className="py-4 pb-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export function KioskListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {Array.from({ length: count }, (_, i) => (
        <KioskCardSkeleton key={i} />
      ))}
    </div>
  );
}
