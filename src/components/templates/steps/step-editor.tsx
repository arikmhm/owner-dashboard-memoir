"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ChangeEvent,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Trash2,
  Save,
  Type as TypeIcon,
  ToggleLeft,
  ToggleRight,
  ImageIcon,
  Layers,
  MousePointer2,
  RotateCw,
  Eye,
  EyeOff,
  Braces,
  ZoomIn,
  ZoomOut,
  Maximize,
  Hand,
  Magnet,
  Loader2,
  ChevronRight,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TEMPLATE_VARIABLES,
  hasVariables,
  resolveVariables,
  DUMMY_RENDER_CONTEXT,
} from "@/lib/template-variables";
import {
  createTemplateWithElements,
  updateTemplateWithElements,
  uploadDataUrlAsset,
  type TemplateSaveData,
} from "@/hooks/use-templates";
import type {
  Template,
  TemplateElement as ApiTemplateElement,
} from "@/lib/types";
import type { CroppedImageData } from "./step-upload-crop";
import type { TemplateElement, ElementType } from "./editor-canvas";

// ── Dynamic import (SSR off — Konva needs browser APIs) ────────────────────────
const EditorCanvas = dynamic(() => import("./editor-canvas"), { ssr: false });

// ── Helpers ────────────────────────────────────────────────────────────────────
function createElement(
  type: ElementType,
  canvasW: number,
  canvasH: number,
  existingElements: TemplateElement[],
  counterRef: React.RefObject<number>,
): TemplateElement {
  counterRef.current += 1;
  const counter = counterRef.current;
  // Auto-assign next available sequence
  const maxSeq = existingElements.reduce(
    (max, el) => Math.max(max, el.sequence),
    0,
  );
  const base = {
    id: `el_${counter}`,
    elementType: type,
    x: 30 + (((counter - 1) * 25) % 150),
    y: 30 + (((counter - 1) * 25) % 150),
    rotation: 0,
    opacity: 100,
    sequence: maxSeq + 1,
  };

  if (type === "PHOTO_SLOT") {
    const existingSlots = existingElements.filter(
      (e) => e.elementType === "PHOTO_SLOT",
    );
    const maxCaptureOrder = existingSlots.reduce(
      (max, el) => Math.max(max, (el.properties.captureOrder as number) ?? 0),
      0,
    );
    return {
      ...base,
      width: Math.min(180, canvasW - 60),
      height: Math.min(240, canvasH - 60),
      properties: { captureOrder: maxCaptureOrder + 1 },
    };
  }

  if (type === "IMAGE") {
    return {
      ...base,
      width: Math.min(150, canvasW - 60),
      height: Math.min(150, canvasH - 60),
      properties: { url: "", borderRadius: 0 },
    };
  }


  // text
  return {
    ...base,
    width: Math.min(200, canvasW - 60),
    height: 40,
    properties: {
      content: "Teks baru",
      fontFamily: "Courier New",
      fontSize: 24,
      fontWeight: "400",
      color: "#000000",
      textAlign: "left",
    },
  };
}

// ── Number sanitiser (prevents NaN in controlled inputs) ───────────────────────
const safeNum = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// ── Zoom ───────────────────────────────────────────────────────────────────────
const ZOOM_MIN = 0.15;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;

// ── Props ──────────────────────────────────────────────────────────────────────
interface StepEditorProps {
  croppedImage: CroppedImageData;
  onBack?: () => void;
  /** Edit mode: existing template to update */
  editTemplate?: Template;
  /** Edit mode: existing elements loaded from API */
  editElements?: ApiTemplateElement[];
}

// ── Component ──────────────────────────────────────────────────────────────────
export function StepEditor({
  croppedImage,
  onBack: onBackProp,
  editTemplate,
  editElements,
}: StepEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const onBack = onBackProp ?? (() => router.push("/templates"));
  const isEditMode = !!editTemplate;

  // ── Initialize state (from edit data or defaults) ──
  const [elements, setElements] = useState<TemplateElement[]>(() => {
    if (editElements && editElements.length > 0) {
      return editElements.map((el) => ({
        id: el.id,
        elementType: el.elementType as ElementType,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        rotation: el.rotation,
        opacity: el.opacity,
        sequence: el.sequence,
        properties: el.properties,
      }));
    }
    return [];
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState(editTemplate?.name ?? "");
  const [isActive, setIsActive] = useState(editTemplate?.isActive ?? true);
  const [overridePriceBase, setOverridePriceBase] = useState(
    editTemplate?.overridePriceBase != null
      ? String(editTemplate.overridePriceBase)
      : "",
  );
  const [overridePriceExtraPrint, setOverridePriceExtraPrint] = useState(
    editTemplate?.overridePriceExtraPrint != null
      ? String(editTemplate.overridePriceExtraPrint)
      : "",
  );
  const [overridePriceDigitalCopy, setOverridePriceDigitalCopy] = useState(
    editTemplate?.overridePriceDigitalCopy != null
      ? String(editTemplate.overridePriceDigitalCopy)
      : "",
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [showVarDropdown, setShowVarDropdown] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panMode, setPanMode] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplateOptions, setShowTemplateOptions] = useState(false);
  const contentInputRef = useRef<HTMLInputElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const elementCounterRef = useRef(editElements?.length ?? 0);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const canvasW = croppedImage.width;
  const canvasH = croppedImage.height;

  // ── Fit-to-viewport on mount ──
  // Helper: compute zoom with NaN/Infinity/negative safety
  const computeFitZoom = useCallback(() => {
    if (!canvasAreaRef.current || !canvasW || !canvasH) return ZOOM_MIN;
    const rect = canvasAreaRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return ZOOM_MIN;
    const padding = 60;
    const fitX = (rect.width - padding * 2) / canvasW;
    const fitY = (rect.height - padding * 2) / canvasH;
    const z = Math.min(fitX, fitY, 1);
    return Number.isFinite(z) && z > 0 ? Math.max(z, ZOOM_MIN) : ZOOM_MIN;
  }, [canvasW, canvasH]);

  useEffect(() => {
    setZoom(computeFitZoom());
  }, [computeFitZoom]);

  const zoomIn = () => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
  const zoomOut = () => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN));
  const zoomFit = () => {
    setZoom(computeFitZoom());
    setPan({ x: 0, y: 0 });
  };

  // ── Pan & wheel zoom handlers ──
  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Middle-click always pans; left-click pans only in pan mode
      const shouldPan = e.button === 1 || (e.button === 0 && panMode);
      if (!shouldPan) return;
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pan, panMode],
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPanningRef.current) return;
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    },
    [],
  );

  const handleCanvasPointerUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setZoom((z) => Math.min(Math.max(z + delta, ZOOM_MIN), ZOOM_MAX));
  }, []);

  // ── Element CRUD ──
  const addElement = (type: ElementType) => {
    const el = createElement(
      type,
      canvasW,
      canvasH,
      elements,
      elementCounterRef,
    );
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  };

  const removeElement = (id: string) => {
    const el = elements.find((e) => e.id === id);
    if (el?.elementType === "PHOTO_SLOT") {
      const photoSlotCount = elements.filter(
        (e) => e.elementType === "PHOTO_SLOT",
      ).length;
      if (photoSlotCount <= 1) {
        toast.error("Template harus memiliki minimal 1 slot foto.");
        return;
      }
    }
    setElements((prev) => prev.filter((e) => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // ── Image element upload ──
  const handleImageElementUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateProperty(selectedId, "url", dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleElementUpdate = useCallback(
    (id: string, attrs: Partial<TemplateElement>) => {
      setElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, ...attrs } : el)),
      );
    },
    [],
  );

  const updateProperty = (id: string, key: string, value: unknown) => {
    setElements((prev) =>
      prev.map((el) =>
        el.id === id
          ? { ...el, properties: { ...el.properties, [key]: value } }
          : el,
      ),
    );
  };

  const insertVariable = (varKey: string) => {
    if (!selectedEl) return;
    const currentContent = (selectedEl.properties.content as string) || "";
    const input = contentInputRef.current;
    const cursorPos = input?.selectionStart ?? currentContent.length;
    const before = currentContent.slice(0, cursorPos);
    const after = currentContent.slice(cursorPos);
    const newContent = `${before}{{${varKey}}}${after}`;
    updateProperty(selectedEl.id, "content", newContent);
    setShowVarDropdown(false);
    setTimeout(() => {
      input?.focus();
      const newPos = cursorPos + varKey.length + 4;
      input?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // ── Save ──
  const handleSave = async () => {
    if (isSaving) return;

    // ── Validation ──
    if (!templateName.trim()) {
      toast.error("Nama template wajib diisi.");
      return;
    }

    const photoSlots = elements.filter((el) => el.elementType === "PHOTO_SLOT");
    if (photoSlots.length === 0) {
      toast.error("Template harus memiliki minimal 1 slot foto (photo_slot).");
      return;
    }

    // Validate image elements have URLs
    const imageEls = elements.filter((el) => el.elementType === "IMAGE");
    const emptyImages = imageEls.filter((el) => !el.properties.url);
    if (emptyImages.length > 0) {
      toast.error("Semua elemen gambar harus memiliki file yang diunggah.");
      return;
    }

    setIsSaving(true);

    try {
      // 1. Upload background to Supabase Storage (async-parallel: independent uploads)
      const uploadPromises: Promise<void>[] = [];
      let backgroundUrl = croppedImage.dataUrl;

      // Upload background
      const bgUploadPromise = uploadDataUrlAsset(
        croppedImage.dataUrl,
        "backgrounds",
      ).then((url) => {
        backgroundUrl = url;
      });
      uploadPromises.push(bgUploadPromise);

      // Upload image element assets (parallel)
      const imageUrls = new Map<string, string>();
      for (const el of imageEls) {
        const url = el.properties.url as string;
        if (url && url.startsWith("data:")) {
          const p = uploadDataUrlAsset(url, "elements").then((uploaded) => {
            imageUrls.set(el.id, uploaded);
          });
          uploadPromises.push(p);
        }
      }

      // Wait all uploads (async-parallel best practice)
      await Promise.all(uploadPromises);

      // 2. Re-sequence elements & auto-assign captureOrder for photo_slots
      let captureOrderCounter = 0;
      const resequencedElements = elements.map((el, idx) => ({
        ...el,
        sequence: idx + 1,
        properties: {
          ...el.properties,
          // Replace data URLs with uploaded URLs for image elements
          ...(el.elementType === "IMAGE" && imageUrls.has(el.id)
            ? { url: imageUrls.get(el.id)! }
            : {}),
          // Ensure photo_slots always have a sequential captureOrder
          ...(el.elementType === "PHOTO_SLOT"
            ? { captureOrder: ++captureOrderCounter }
            : {}),
        },
      }));

      const saveData: TemplateSaveData = {
        name: templateName.trim(),
        width: canvasW,
        height: canvasH,
        backgroundUrl,
        overridePriceBase: overridePriceBase ? Number(overridePriceBase) : null,
        overridePriceExtraPrint: overridePriceExtraPrint
          ? Number(overridePriceExtraPrint)
          : null,
        overridePriceDigitalCopy: overridePriceDigitalCopy
          ? Number(overridePriceDigitalCopy)
          : null,
        isActive,
        elements: resequencedElements.map((el) => ({
          id: isEditMode ? el.id : undefined,
          elementType: el.elementType,
          sequence: el.sequence,
          x: Math.round(el.x),
          y: Math.round(el.y),
          width: Math.round(el.width),
          height: Math.round(el.height),
          rotation: Math.round(el.rotation),
          opacity: Math.round(el.opacity),
          properties: el.properties,
        })),
      };

      console.log(
        "[handleSave] saveData:",
        JSON.stringify({
          ...saveData,
          elements: saveData.elements.length + " elements",
        }),
      );
      console.log(
        "[handleSave] elements detail:",
        JSON.stringify(saveData.elements),
      );

      if (isEditMode && editTemplate) {
        await updateTemplateWithElements(
          editTemplate.id,
          saveData,
          editElements ?? [],
        );
        toast.success("Template berhasil diperbarui");
      } else {
        await createTemplateWithElements(saveData);
        toast.success("Template berhasil dibuat");
      }

      // Invalidate all template & element caches so the list page
      // fetches fresh data including newly created/updated elements
      await queryClient.invalidateQueries({ queryKey: ["templates"] });

      router.push("/templates");
    } catch (err) {
      console.error("[Save Template Error]", err);
      toast.error(
        isEditMode
          ? "Gagal memperbarui template. Coba lagi."
          : "Gagal membuat template. Coba lagi.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectedEl = elements.find((e) => e.id === selectedId);

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-full flex overflow-hidden rounded-xl border border-zinc-200">
      {/* ═══ LEFT — Canvas Workspace ═══ */}
      <div
        ref={canvasAreaRef}
        className={cn(
          "flex-1 bg-zinc-100 relative overflow-hidden flex items-center justify-center",
          panMode ? "cursor-grab active:cursor-grabbing" : "",
        )}
        style={panMode ? { pointerEvents: "auto" } : undefined}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
          className={cn("shadow-2xl", panMode && "pointer-events-none")}
        >
          <EditorCanvas
            width={canvasW}
            height={canvasH}
            backgroundDataUrl={croppedImage.dataUrl}
            elements={elements}
            selectedId={selectedId}
            previewMode={previewMode}
            snapEnabled={snapEnabled}
            onSelect={setSelectedId}
            onElementUpdate={handleElementUpdate}
          />
        </div>

        {/* Zoom controls — bottom left */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-lg shadow-sm p-1">
          <button
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
            className="size-7 flex items-center justify-center rounded-md hover:bg-zinc-100 disabled:opacity-30 transition-colors"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <span className="text-[11px] font-mono text-zinc-600 w-10 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
            className="size-7 flex items-center justify-center rounded-md hover:bg-zinc-100 disabled:opacity-30 transition-colors"
          >
            <ZoomIn className="size-3.5" />
          </button>
          <div className="h-4 w-px bg-zinc-200 mx-0.5" />
          <button
            onClick={zoomFit}
            title="Fit to viewport"
            className="size-7 flex items-center justify-center rounded-md hover:bg-zinc-100 transition-colors"
          >
            <Maximize className="size-3.5" />
          </button>
          <div className="h-4 w-px bg-zinc-200 mx-0.5" />
          <button
            onClick={() => setPanMode(!panMode)}
            title={panMode ? "Mode geser (aktif)" : "Mode geser"}
            className={cn(
              "size-7 flex items-center justify-center rounded-md transition-colors",
              panMode
                ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                : "text-zinc-400 hover:bg-zinc-100",
            )}
          >
            <Hand className="size-3.5" />
          </button>
          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            title={snapEnabled ? "Snap aktif" : "Snap nonaktif"}
            className={cn(
              "size-7 flex items-center justify-center rounded-md transition-colors",
              snapEnabled
                ? "bg-rose-50 text-rose-500 hover:bg-rose-100"
                : "text-zinc-400 hover:bg-zinc-100",
            )}
          >
            <Magnet className="size-3.5" />
          </button>
        </div>

        {/* Preview toggle — bottom right */}
        <div className="absolute bottom-3 right-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border shadow-sm transition-colors",
              previewMode
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-white/90 backdrop-blur-sm text-zinc-500 border-zinc-200 hover:border-zinc-300",
            )}
          >
            {previewMode ? (
              <Eye className="size-3.5" />
            ) : (
              <EyeOff className="size-3.5" />
            )}
            {previewMode ? "Preview" : "Edit"}
          </button>
        </div>
      </div>

      {/* ═══ RIGHT — Tools Panel ═══ */}
      <div className="w-80 shrink-0 border-l border-zinc-200 bg-white flex flex-col">
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Template Info */}
          <div className="rounded-lg border border-zinc-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50/50">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                Template
              </p>
            </div>
            <div className="p-3 space-y-2.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">
                  Nama
                </label>
                <Input
                  placeholder="Contoh: Classic Stripe"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <button
                onClick={() => setShowTemplateOptions(!showTemplateOptions)}
                className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <ChevronRight
                  className={cn(
                    "size-3 transition-transform",
                    showTemplateOptions && "rotate-90",
                  )}
                />
                Opsi lainnya
              </button>
              {showTemplateOptions && (
                <div className="space-y-2.5 pt-1 border-t border-zinc-100">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-500">
                      Override Harga Dasar
                    </label>
                    <Input
                      type="number"
                      placeholder="Kosongkan = default"
                      value={overridePriceBase}
                      onChange={(e) => setOverridePriceBase(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-500">
                      Override Extra Print
                    </label>
                    <Input
                      type="number"
                      placeholder="Kosongkan = default"
                      value={overridePriceExtraPrint}
                      onChange={(e) => setOverridePriceExtraPrint(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-500">
                      Override Digital Copy
                    </label>
                    <Input
                      type="number"
                      placeholder="Kosongkan = default"
                      value={overridePriceDigitalCopy}
                      onChange={(e) => setOverridePriceDigitalCopy(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-500">
                      Status
                    </span>
                    <button
                      onClick={() => setIsActive(!isActive)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium transition-colors",
                        isActive ? "text-zinc-800" : "text-zinc-400",
                      )}
                    >
                      {isActive ? (
                        <>
                          <ToggleRight className="size-4" /> Aktif
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="size-4" /> Nonaktif
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Dimensi</span>
                    <span className="font-mono text-zinc-700">
                      {canvasW}×{canvasH}px
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Add Element */}
          <div className="rounded-lg border border-zinc-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50/50">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                Tambah Element
              </p>
            </div>
            <div className="p-2 grid grid-cols-2 gap-2">
              <Button
                size="xs"
                variant="outline"
                onClick={() => addElement("PHOTO_SLOT")}
                className="gap-1 h-8"
              >
                <ImageIcon className="size-3" /> Foto Slot
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => addElement("TEXT")}
                className="gap-1 h-8"
              >
                <TypeIcon className="size-3" /> Teks
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => addElement("IMAGE")}
                className="gap-1 h-8"
              >
                <Upload className="size-3" /> Gambar
              </Button>
            </div>
          </div>

          {/* Element List */}
          <div className="rounded-lg border border-zinc-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50/50">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                Elements ({elements.length})
              </p>
            </div>
            <div className="p-2">
              {elements.length === 0 ? (
                <div className="text-center py-5 text-zinc-300 space-y-1">
                  <Layers className="size-5 mx-auto" />
                  <p className="text-xs text-zinc-400">Belum ada element</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {elements.map((el, idx) => (
                    <div
                      key={el.id}
                      onClick={() => setSelectedId(el.id)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer transition-colors",
                        el.id === selectedId
                          ? "border-blue-300 bg-blue-50"
                          : "border-zinc-100 hover:border-zinc-200 bg-white",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "font-mono text-[10px] font-bold size-4.5 flex items-center justify-center rounded",
                            el.elementType === "PHOTO_SLOT"
                              ? "bg-blue-500 text-white"
                              : el.elementType === "TEXT"
                                ? "bg-amber-500 text-white"
                                : el.elementType === "IMAGE"
                                  ? "bg-violet-500 text-white"
                                  : "bg-zinc-500 text-white",
                          )}
                        >
                          {el.elementType === "PHOTO_SLOT"
                            ? "F"
                            : el.elementType === "TEXT"
                              ? "T"
                              : el.elementType === "IMAGE"
                                ? "I"
                                : "S"}
                        </span>
                        <div className="leading-none">
                          <span className="text-xs text-zinc-700 font-medium">
                            {el.elementType === "PHOTO_SLOT"
                              ? `Foto ${elements.filter((e, i) => e.elementType === "PHOTO_SLOT" && i <= idx).length}`
                              : el.elementType === "TEXT"
                                ? (
                                    (el.properties.content as string) || "Teks"
                                  ).slice(0, 15)
                                : el.elementType === "IMAGE"
                                  ? "Gambar"
                                  : "Bentuk"}
                          </span>
                          <span className="block font-mono text-[9px] text-zinc-400 mt-0.5">
                            {el.width}×{el.height} · {el.rotation}°
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeElement(el.id);
                        }}
                        className="text-zinc-300 hover:text-red-500 transition-colors p-0.5"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Element Properties */}
          {selectedEl && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/30 overflow-hidden">
              <div className="px-3 py-2 border-b border-blue-100 bg-blue-50/50 flex items-center gap-1.5">
                <MousePointer2 className="size-3 text-blue-500" />
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                  {selectedEl.elementType === "PHOTO_SLOT"
                    ? "Foto Slot"
                    : selectedEl.elementType === "TEXT"
                      ? "Teks"
                      : selectedEl.elementType === "IMAGE"
                        ? "Gambar"
                        : "Bentuk"}
                </p>
              </div>
              <div className="p-3 space-y-2.5">
                {/* Position & Size */}
                <div className="grid grid-cols-2 gap-2">
                  {(["x", "y", "width", "height"] as const).map((key) => (
                    <div key={key} className="space-y-0.5">
                      <label className="text-[10px] font-medium text-zinc-400">
                        {key === "width"
                          ? "W"
                          : key === "height"
                            ? "H"
                            : key.toUpperCase()}
                      </label>
                      <Input
                        type="number"
                        value={safeNum(selectedEl[key])}
                        onChange={(e) =>
                          handleElementUpdate(selectedEl.id, {
                            [key]: safeNum(e.target.value),
                          })
                        }
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>
                {/* Rotation & Opacity */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-medium text-zinc-400 flex items-center gap-1">
                      <RotateCw className="size-2.5" /> Rotasi
                    </label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={safeNum(selectedEl.rotation)}
                        onChange={(e) =>
                          handleElementUpdate(selectedEl.id, {
                            rotation: safeNum(e.target.value),
                          })
                        }
                        className="h-7 text-xs font-mono flex-1"
                      />
                      <span className="text-[10px] text-zinc-400">°</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-medium text-zinc-400 flex items-center gap-1">
                      <Eye className="size-2.5" /> Opacity
                    </label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={safeNum(selectedEl.opacity, 100)}
                        onChange={(e) =>
                          handleElementUpdate(selectedEl.id, {
                            opacity: Math.min(
                              100,
                              Math.max(0, safeNum(e.target.value)),
                            ),
                          })
                        }
                        className="h-7 text-xs font-mono flex-1"
                      />
                      <span className="text-[10px] text-zinc-400">%</span>
                    </div>
                  </div>
                </div>

                {/* Text properties */}
                {selectedEl.elementType === "TEXT" && (
                  <>
                    <hr className="border-blue-100" />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-medium text-zinc-500">
                          Konten
                        </label>
                        <button
                          onClick={() => setShowVarDropdown(!showVarDropdown)}
                          className={cn(
                            "flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded border transition-colors",
                            showVarDropdown
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-zinc-50 text-zinc-400 border-zinc-200 hover:text-zinc-600",
                          )}
                        >
                          <Braces className="size-2.5" /> Variabel
                        </button>
                      </div>
                      <Input
                        ref={contentInputRef}
                        value={(selectedEl.properties.content as string) || ""}
                        onChange={(e) =>
                          updateProperty(
                            selectedEl.id,
                            "content",
                            e.target.value,
                          )
                        }
                        placeholder="Ketik teks atau sisipkan {{variabel}}"
                        className="h-7 text-xs font-mono"
                      />
                      {hasVariables(
                        (selectedEl.properties.content as string) || "",
                      ) && (
                        <p className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-2 py-1 font-mono truncate">
                          →{" "}
                          {resolveVariables(
                            (selectedEl.properties.content as string) || "",
                            DUMMY_RENDER_CONTEXT,
                          )}
                        </p>
                      )}
                      {showVarDropdown && (
                        <div className="border border-zinc-200 rounded-md bg-white shadow-sm max-h-40 overflow-y-auto">
                          {[
                            ...new Set(
                              TEMPLATE_VARIABLES.map((v) => v.category),
                            ),
                          ].map((cat) => (
                            <div key={cat}>
                              <div className="px-2 py-1 bg-zinc-50 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider sticky top-0">
                                {cat}
                              </div>
                              {TEMPLATE_VARIABLES.filter(
                                (v) => v.category === cat,
                              ).map((v) => (
                                <button
                                  key={v.key}
                                  onClick={() => insertVariable(v.key)}
                                  className="w-full text-left px-2 py-1 hover:bg-blue-50 transition-colors flex items-center justify-between gap-2"
                                >
                                  <span className="text-[10px] text-zinc-700">
                                    <span className="font-mono text-blue-600">{`{{${v.key}}}`}</span>
                                    <span className="text-zinc-400 ml-1">
                                      {v.label}
                                    </span>
                                  </span>
                                  <span className="text-[9px] text-zinc-300 font-mono truncate max-w-20">
                                    {v.example}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-medium text-zinc-400">
                          Size
                        </label>
                        <Input
                          type="number"
                          value={safeNum(selectedEl.properties.fontSize, 24)}
                          onChange={(e) =>
                            updateProperty(
                              selectedEl.id,
                              "fontSize",
                              safeNum(e.target.value, 24),
                            )
                          }
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-medium text-zinc-400">
                          Weight
                        </label>
                        <select
                          value={
                            (selectedEl.properties.fontWeight as string) ||
                            "400"
                          }
                          onChange={(e) =>
                            updateProperty(
                              selectedEl.id,
                              "fontWeight",
                              e.target.value,
                            )
                          }
                          className="h-7 w-full text-xs rounded-md border border-input bg-transparent px-2"
                        >
                          <option value="400">Regular</option>
                          <option value="700">Bold</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-medium text-zinc-400">
                        Align
                      </label>
                      <div className="flex gap-1">
                        {(["left", "center", "right"] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() =>
                              updateProperty(selectedEl.id, "textAlign", align)
                            }
                            className={cn(
                              "flex-1 h-7 text-[10px] rounded-md border transition-colors",
                              (selectedEl.properties.textAlign || "left") ===
                                align
                                ? "bg-blue-500 text-white border-blue-500"
                                : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300",
                            )}
                          >
                            {align === "left"
                              ? "Kiri"
                              : align === "center"
                                ? "Tengah"
                                : "Kanan"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Image properties */}
                {selectedEl.elementType === "IMAGE" && (
                  <>
                    <hr className="border-blue-100" />
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-zinc-500">
                        Gambar
                      </label>
                      {selectedEl.properties.url ? (
                        <div className="space-y-1.5">
                          <div className="w-full aspect-video rounded border border-zinc-200 bg-zinc-50 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={selectedEl.properties.url as string}
                              alt="Element"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <button
                            onClick={() => imageUploadRef.current?.click()}
                            className="w-full h-7 text-[10px] font-medium rounded-md border border-dashed border-zinc-300 text-zinc-400 hover:text-zinc-600 hover:border-zinc-400 transition-colors flex items-center justify-center gap-1"
                          >
                            <Upload className="size-2.5" /> Ganti Gambar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => imageUploadRef.current?.click()}
                          className="w-full h-16 text-xs rounded-md border-2 border-dashed border-zinc-300 text-zinc-400 hover:text-zinc-600 hover:border-zinc-400 transition-colors flex flex-col items-center justify-center gap-1"
                        >
                          <Upload className="size-4" />
                          <span>Upload Gambar</span>
                        </button>
                      )}
                      <input
                        ref={imageUploadRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={handleImageElementUpload}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-medium text-zinc-400">
                        Border Radius
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={safeNum(selectedEl.properties.borderRadius)}
                        onChange={(e) =>
                          updateProperty(
                            selectedEl.id,
                            "borderRadius",
                            safeNum(e.target.value),
                          )
                        }
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                  </>
                )}

              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="shrink-0 p-3 border-t border-zinc-200 flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onBack}
            disabled={isSaving}
            className="gap-1"
          >
            <ArrowLeft className="size-3.5" /> Kembali
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!templateName.trim() || isSaving}
            className="bg-zinc-950 text-white hover:bg-zinc-800 gap-1"
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {isSaving ? "Menyimpan..." : isEditMode ? "Perbarui" : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
