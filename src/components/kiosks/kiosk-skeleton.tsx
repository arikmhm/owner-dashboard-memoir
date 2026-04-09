"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Kiosk Skeleton Cards
// Loading placeholder while kiosk data is being fetched
// ─────────────────────────────────────────────────────────────────────────────

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function KioskCardSkeleton() {
  return (
    <Card className="py-0 gap-0 rounded-sm shadow-none border-zinc-200">
      <CardHeader className="py-4 pb-0">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 rounded-sm shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="pt-3 pb-4 space-y-4 border-t border-zinc-100 mt-3">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-8 w-24 rounded-sm" />
          <Skeleton className="h-8 w-40 rounded-sm" />
        </div>
      </CardContent>
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
