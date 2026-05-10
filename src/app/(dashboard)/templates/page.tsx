"use client";

import { useState, useCallback } from "react";
import {
  useTemplates,
  useTemplateElements,
  ApiError,
} from "@/hooks/use-templates";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  Pencil,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import TemplatePreview from "@/components/templates/template-preview";
import type { Template } from "@/lib/types";

// ── Template card ──────────────────────────────────────────────────────────────
interface TemplateCardProps {
  template: Template;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
}: TemplateCardProps) {
  const { elements, isLoading: elementsLoading } = useTemplateElements(
    template.id,
  );
  const slotCount = elements.filter(
    (el) => el.elementType === "PHOTO_SLOT",
  ).length;
  return (
    <article
      className={cn(
        "group flex flex-col bg-white border border-zinc-200 rounded-sm overflow-hidden",
        "hover:border-zinc-300 transition-all duration-200",
      )}
      style={{ containerType: "inline-size" }}
    >
      {/* ── Preview ── */}
      <TemplatePreview
        canvasWidth={template.width}
        canvasHeight={template.height}
        backgroundUrl={template.backgroundUrl ?? undefined}
        elements={elements}
        isLoading={elementsLoading}
        maxRatio={1.2}
      />

      {/* ── Card Info ── */}
      <div className="flex-1 px-3.5 pt-3 pb-2.5 space-y-1">
        <h3
          className="text-sm font-semibold text-zinc-900 truncate leading-snug"
          title={template.name}
        >
          {template.name}
        </h3>
        <p className="text-xs text-zinc-400">{slotCount} foto</p>
      </div>

      {/* ── Actions ── */}
      <div className="px-3 pb-3 pt-0 flex flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs"
          onClick={() => onEdit(template.id)}
        >
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Edit Template
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs text-red-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
          onClick={() => onDelete(template.id)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Hapus
        </Button>
      </div>
    </article>
  );
}

// ── Skeleton card ──────────────────────────────────────────────────────────────
function TemplateCardSkeleton() {
  return (
    <div className="flex flex-col bg-white border border-zinc-200 rounded-sm overflow-hidden">
      <Skeleton className="w-full" style={{ paddingBottom: "66%" }} />
      <div className="px-3.5 pt-3 pb-2.5 space-y-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="px-3 pb-3 pt-0 flex flex-col gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
const DEFAULT_LIMIT = 20;

export default function TemplatesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const {
    templates,
    meta,
    isLoading,
    isFetching,
    error,
    deleteTemplate,
  } = useTemplates({ page, limit: DEFAULT_LIMIT });

  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 0;
  const goToPage = useCallback((p: number) => setPage(p), []);

  const handleEdit = (id: string) => {
    router.push(`/templates/${id}/edit`);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteTemplate(deleteTarget.id);
      toast.success("Template berhasil dihapus");
      setDeleteTarget(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(
          "Template tidak bisa dihapus karena sudah digunakan dalam transaksi. Nonaktifkan saja.",
          { duration: 5000 },
        );
      } else {
        toast.error("Gagal menghapus template");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteConfirmAndReset = async () => {
    await handleDeleteConfirm();
    // If current page becomes empty after delete, go back
    if (templates.length <= 1 && page > 1) {
      setPage(page - 1);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-zinc-400">
        <AlertTriangle className="size-10 text-red-400" />
        <p className="text-sm font-medium text-zinc-500">
          Gagal memuat template
        </p>
        <p className="text-xs text-zinc-400">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-200">
        <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
          Template
        </h1>
        <Link href="/templates/create">
          <Button
            size="sm"
            className="bg-zinc-950 text-white hover:bg-zinc-800 shrink-0"
          >
            <Plus className="size-3.5" />
            Buat Template
          </Button>
        </Link>
      </div>

      {/* ── Card grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <TemplateCardSkeleton key={i} />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-300">
          <Layers className="size-10" />
          <p className="text-sm font-medium text-zinc-400">
            Belum ada template
          </p>
          <p className="text-xs text-zinc-400">
            Klik &ldquo;Buat Template&rdquo; untuk memulai.
          </p>
          <Link href="/templates/create">
            <Button size="sm" variant="outline" className="mt-2 gap-1.5">
              <Plus className="size-3.5" />
              Buat Template Pertama
            </Button>
          </Link>
        </div>
      ) : (
        <div
          className={cn(
            "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity duration-200",
            isFetching && "opacity-50 pointer-events-none",
          )}
        >
          {templates.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              onEdit={handleEdit}
              onDelete={(id) =>
                setDeleteTarget(templates.find((t) => t.id === id) ?? null)
              }
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {meta && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-400">
            Hal. {page} dari {totalPages}
            <span className="hidden sm:inline"> · {meta.total} template</span>
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            {(() => {
              const pages: number[] = [];
              let start = Math.max(1, page - 2);
              const end = Math.min(totalPages, start + 4);
              start = Math.max(1, end - 4);
              for (let i = start; i <= end; i++) pages.push(i);
              return pages.map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(p)}
                  className={cn(
                    "h-7 w-7 p-0 text-xs",
                    p === page && "bg-zinc-950 text-white hover:bg-zinc-800",
                  )}
                >
                  {p}
                </Button>
              ));
            })()}
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Template</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus{" "}
              <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>? Tindakan ini
              tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-sm bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700">
            Jika template sudah digunakan dalam transaksi, template tidak bisa
            dihapus. Gunakan fitur nonaktifkan sebagai alternatif.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirmAndReset}
              disabled={isDeleting}
              className="gap-1.5"
            >
              {isDeleting && <Loader2 className="size-3 animate-spin" />}
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
