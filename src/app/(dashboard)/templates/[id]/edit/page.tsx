"use client";

import { use } from "react";
import { useTemplateDetail, useTemplateElements } from "@/hooks/use-templates";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { StepEditor } from "@/components/templates/steps/step-editor";

// ── Page ───────────────────────────────────────────────────────────────────────
export default function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    template,
    elements: detailElements,
    isLoading: templateLoading,
    error: templateError,
  } = useTemplateDetail(id);
  // Also fetch elements from the dedicated /elements endpoint (proven reliable)
  const { elements: separateElements, isLoading: elementsLoading } =
    useTemplateElements(id);

  const isLoading = templateLoading || elementsLoading;
  const error = templateError;
  // Prefer separately-fetched elements when available, fall back to detail elements
  const elements =
    separateElements.length > 0 ? separateElements : detailElements;

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-zinc-100">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-zinc-300" />
        </div>
      </div>
    );
  }

  // ── Error state (including missing background) ──
  if (error || !template || !template.backgroundUrl) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-zinc-100">
          <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
            Edit Template
          </h1>
          <Link href="/templates">
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-zinc-400 hover:text-zinc-700"
            >
              <X className="size-4" /> Kembali
            </Button>
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-zinc-400">
          <AlertTriangle className="size-10 text-red-400" />
          <p className="text-sm font-medium text-zinc-500">
            Gagal memuat template
          </p>
          <p className="text-xs text-zinc-400">
            {error?.message ??
              (!template
                ? "Template tidak ditemukan"
                : "Background template tidak tersedia")}
          </p>
          <Link href="/templates">
            <Button size="sm" variant="outline" className="mt-2">
              Kembali ke Daftar Template
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Use existing background directly as CroppedImageData
  // Defensive defaults to prevent NaN canvas dimensions
  const croppedImage = {
    dataUrl: template.backgroundUrl || "",
    width: template.width || 576,
    height: template.height || 864,
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-zinc-100 shrink-0">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
            Edit Template
          </h1>
          <p className="text-sm text-zinc-400">{template.name}</p>
        </div>
        <Link href="/templates">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-zinc-400 hover:text-zinc-700"
          >
            <X className="size-4" />
            Cancel
          </Button>
        </Link>
      </div>

      {/* ── Editor ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <StepEditor
          croppedImage={croppedImage}
          editTemplate={template}
          editElements={elements}
        />
      </div>
    </div>
  );
}
