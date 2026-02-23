"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
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
    Magnet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TEMPLATE_VARIABLES, hasVariables, resolveVariables, DUMMY_RENDER_CONTEXT } from "@/lib/template-variables";
import type { CroppedImageData } from "./step-upload-crop";
import type { TemplateElement, ElementType } from "./editor-canvas";

// ── Dynamic import (SSR off — Konva needs browser APIs) ────────────────────────
const EditorCanvas = dynamic(() => import("./editor-canvas"), { ssr: false });

// ── Helpers ────────────────────────────────────────────────────────────────────
let elementCounter = 0;

function createElement(type: ElementType, canvasW: number): TemplateElement {
    elementCounter += 1;
    const base = {
        id: `el_${elementCounter}`,
        elementType: type,
        x: 30 + ((elementCounter - 1) * 25) % 150,
        y: 30 + ((elementCounter - 1) * 25) % 150,
        rotation: 0,
        opacity: 100,
        sequence: elementCounter,
    };

    if (type === "photo_slot") {
        return {
            ...base,
            width: Math.min(180, canvasW - 60),
            height: Math.min(240, canvasW - 60),
            properties: {},
        };
    }

    return {
        ...base,
        width: Math.min(200, canvasW - 60),
        height: 40,
        properties: {
            content: "Teks baru",
            fontFamily: "Inter",
            fontSize: 24,
            fontWeight: "400",
            color: "#000000",
            textAlign: "left",
        },
    };
}

// ── Zoom ───────────────────────────────────────────────────────────────────────
const ZOOM_MIN = 0.15;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;

// ── Props ──────────────────────────────────────────────────────────────────────
interface StepEditorProps {
    croppedImage: CroppedImageData;
    onBack: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────
export function StepEditor({ croppedImage, onBack }: StepEditorProps) {
    const [elements, setElements] = useState<TemplateElement[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [templateName, setTemplateName] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [overridePrice, setOverridePrice] = useState("");
    const [previewMode, setPreviewMode] = useState(false);
    const [showVarDropdown, setShowVarDropdown] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const contentInputRef = useRef<HTMLInputElement>(null);
    const canvasAreaRef = useRef<HTMLDivElement>(null);

    const canvasW = croppedImage.width;
    const canvasH = croppedImage.height;

    // ── Fit-to-viewport on mount ──
    useEffect(() => {
        if (!canvasAreaRef.current) return;
        const rect = canvasAreaRef.current.getBoundingClientRect();
        const padding = 60;
        const fitX = (rect.width - padding * 2) / canvasW;
        const fitY = (rect.height - padding * 2) / canvasH;
        setZoom(Math.min(fitX, fitY, 1));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const zoomIn = () => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
    const zoomOut = () => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN));
    const zoomFit = () => {
        if (!canvasAreaRef.current) return;
        const rect = canvasAreaRef.current.getBoundingClientRect();
        const padding = 60;
        const fitX = (rect.width - padding * 2) / canvasW;
        const fitY = (rect.height - padding * 2) / canvasH;
        setZoom(Math.min(fitX, fitY, 1));
    };

    // ── Element CRUD ──
    const addElement = (type: ElementType) => {
        const el = createElement(type, canvasW);
        setElements((prev) => [...prev, el]);
        setSelectedId(el.id);
    };

    const removeElement = (id: string) => {
        setElements((prev) => prev.filter((e) => e.id !== id));
        if (selectedId === id) setSelectedId(null);
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
    const handleSave = () => {
        const output = {
            name: templateName,
            isActive,
            overridePrice: overridePrice ? Number(overridePrice) : null,
            canvas: { width: canvasW, height: canvasH, backgroundImage: croppedImage.dataUrl.slice(0, 60) + "..." },
            elements: elements.map((el) => ({
                elementType: el.elementType,
                sequence: el.sequence,
                x: el.x, y: el.y, width: el.width, height: el.height,
                rotation: el.rotation, opacity: el.opacity,
                properties: el.properties,
            })),
        };
        console.log("[Save Template]", output);
        alert("Template tersimpan! (lihat console untuk data)");
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
                className="flex-1 bg-zinc-100 relative overflow-hidden flex items-center justify-center"
            >
                <div
                    style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
                    className="shadow-2xl"
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
                    <button onClick={zoomOut} disabled={zoom <= ZOOM_MIN}
                        className="size-7 flex items-center justify-center rounded-md hover:bg-zinc-100 disabled:opacity-30 transition-colors">
                        <ZoomOut className="size-3.5" />
                    </button>
                    <span className="text-[11px] font-mono text-zinc-600 w-10 text-center select-none">
                        {Math.round(zoom * 100)}%
                    </span>
                    <button onClick={zoomIn} disabled={zoom >= ZOOM_MAX}
                        className="size-7 flex items-center justify-center rounded-md hover:bg-zinc-100 disabled:opacity-30 transition-colors">
                        <ZoomIn className="size-3.5" />
                    </button>
                    <div className="h-4 w-px bg-zinc-200 mx-0.5" />
                    <button onClick={zoomFit} title="Fit to viewport"
                        className="size-7 flex items-center justify-center rounded-md hover:bg-zinc-100 transition-colors">
                        <Maximize className="size-3.5" />
                    </button>
                    <div className="h-4 w-px bg-zinc-200 mx-0.5" />
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
                        {previewMode ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
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
                            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Template</p>
                        </div>
                        <div className="p-3 space-y-2.5">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-500">Nama</label>
                                <Input placeholder="Contoh: Classic Stripe" value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-500">Override Harga</label>
                                <Input type="number" placeholder="Kosongkan = default" value={overridePrice}
                                    onChange={(e) => setOverridePrice(e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-zinc-500">Status</span>
                                <button onClick={() => setIsActive(!isActive)}
                                    className={cn("flex items-center gap-1.5 text-xs font-medium transition-colors",
                                        isActive ? "text-zinc-800" : "text-zinc-400")}>
                                    {isActive ? <><ToggleRight className="size-4" /> Aktif</> : <><ToggleLeft className="size-4" /> Nonaktif</>}
                                </button>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-500">Dimensi</span>
                                <span className="font-mono text-zinc-700">{canvasW}×{canvasH}px</span>
                            </div>
                        </div>
                    </div>

                    {/* Add Element */}
                    <div className="rounded-lg border border-zinc-200 overflow-hidden">
                        <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50/50">
                            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Tambah Element</p>
                        </div>
                        <div className="p-2 flex gap-2">
                            <Button size="xs" variant="outline" onClick={() => addElement("photo_slot")} className="flex-1 gap-1 h-8">
                                <ImageIcon className="size-3" /> Foto Slot
                            </Button>
                            <Button size="xs" variant="outline" onClick={() => addElement("text")} className="flex-1 gap-1 h-8">
                                <TypeIcon className="size-3" /> Teks
                            </Button>
                        </div>
                    </div>

                    {/* Element List */}
                    <div className="rounded-lg border border-zinc-200 overflow-hidden">
                        <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50/50">
                            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Elements ({elements.length})</p>
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
                                        <div key={el.id} onClick={() => setSelectedId(el.id)}
                                            className={cn(
                                                "flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer transition-colors",
                                                el.id === selectedId ? "border-blue-300 bg-blue-50" : "border-zinc-100 hover:border-zinc-200 bg-white",
                                            )}>
                                            <div className="flex items-center gap-2">
                                                <span className={cn("font-mono text-[10px] font-bold size-4.5 flex items-center justify-center rounded",
                                                    el.elementType === "photo_slot" ? "bg-blue-500 text-white" : "bg-amber-500 text-white")}>
                                                    {el.elementType === "photo_slot" ? "F" : "T"}
                                                </span>
                                                <div className="leading-none">
                                                    <span className="text-xs text-zinc-700 font-medium">
                                                        {el.elementType === "photo_slot"
                                                            ? `Foto ${elements.filter((e, i) => e.elementType === "photo_slot" && i <= idx).length}`
                                                            : ((el.properties.content as string) || "Teks").slice(0, 15)}
                                                    </span>
                                                    <span className="block font-mono text-[9px] text-zinc-400 mt-0.5">
                                                        {el.width}×{el.height} · {el.rotation}°
                                                    </span>
                                                </div>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                                                className="text-zinc-300 hover:text-red-500 transition-colors p-0.5">
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
                                    {selectedEl.elementType === "photo_slot" ? "Foto Slot" : "Teks"}
                                </p>
                            </div>
                            <div className="p-3 space-y-2.5">
                                {/* Position & Size */}
                                <div className="grid grid-cols-2 gap-2">
                                    {(["x", "y", "width", "height"] as const).map((key) => (
                                        <div key={key} className="space-y-0.5">
                                            <label className="text-[10px] font-medium text-zinc-400">{key === "width" ? "W" : key === "height" ? "H" : key.toUpperCase()}</label>
                                            <Input type="number" value={selectedEl[key]}
                                                onChange={(e) => handleElementUpdate(selectedEl.id, { [key]: Number(e.target.value) })}
                                                className="h-7 text-xs font-mono" />
                                        </div>
                                    ))}
                                </div>
                                {/* Rotation */}
                                <div className="flex items-center gap-2">
                                    <RotateCw className="size-3 text-zinc-400 shrink-0" />
                                    <Input type="number" value={selectedEl.rotation}
                                        onChange={(e) => handleElementUpdate(selectedEl.id, { rotation: Number(e.target.value) })}
                                        className="h-7 text-xs font-mono flex-1" />
                                    <span className="text-[10px] text-zinc-400">deg</span>
                                </div>

                                {/* Text properties */}
                                {selectedEl.elementType === "text" && (
                                    <>
                                        <hr className="border-blue-100" />
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-medium text-zinc-500">Konten</label>
                                                <button onClick={() => setShowVarDropdown(!showVarDropdown)}
                                                    className={cn("flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded border transition-colors",
                                                        showVarDropdown ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-zinc-50 text-zinc-400 border-zinc-200 hover:text-zinc-600")}>
                                                    <Braces className="size-2.5" /> Variabel
                                                </button>
                                            </div>
                                            <Input ref={contentInputRef}
                                                value={(selectedEl.properties.content as string) || ""}
                                                onChange={(e) => updateProperty(selectedEl.id, "content", e.target.value)}
                                                placeholder="Ketik teks atau sisipkan {{variabel}}" className="h-7 text-xs font-mono" />
                                            {hasVariables((selectedEl.properties.content as string) || "") && (
                                                <p className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-2 py-1 font-mono truncate">
                                                    → {resolveVariables((selectedEl.properties.content as string) || "", DUMMY_RENDER_CONTEXT)}
                                                </p>
                                            )}
                                            {showVarDropdown && (
                                                <div className="border border-zinc-200 rounded-md bg-white shadow-sm max-h-40 overflow-y-auto">
                                                    {[...new Set(TEMPLATE_VARIABLES.map((v) => v.category))].map((cat) => (
                                                        <div key={cat}>
                                                            <div className="px-2 py-1 bg-zinc-50 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider sticky top-0">{cat}</div>
                                                            {TEMPLATE_VARIABLES.filter((v) => v.category === cat).map((v) => (
                                                                <button key={v.key} onClick={() => insertVariable(v.key)}
                                                                    className="w-full text-left px-2 py-1 hover:bg-blue-50 transition-colors flex items-center justify-between gap-2">
                                                                    <span className="text-[10px] text-zinc-700">
                                                                        <span className="font-mono text-blue-600">{`{{${v.key}}}`}</span>
                                                                        <span className="text-zinc-400 ml-1">{v.label}</span>
                                                                    </span>
                                                                    <span className="text-[9px] text-zinc-300 font-mono truncate max-w-20">{v.example}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-0.5">
                                                <label className="text-[10px] font-medium text-zinc-400">Font</label>
                                                <select value={(selectedEl.properties.fontFamily as string) || "Inter"}
                                                    onChange={(e) => updateProperty(selectedEl.id, "fontFamily", e.target.value)}
                                                    className="h-7 w-full text-xs rounded-md border border-input bg-transparent px-2">
                                                    <option value="Inter">Inter</option><option value="Arial">Arial</option>
                                                    <option value="Georgia">Georgia</option><option value="Courier New">Courier New</option>
                                                    <option value="Times New Roman">Times New Roman</option>
                                                </select>
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="text-[10px] font-medium text-zinc-400">Size</label>
                                                <Input type="number" value={(selectedEl.properties.fontSize as number) || 24}
                                                    onChange={(e) => updateProperty(selectedEl.id, "fontSize", Number(e.target.value))}
                                                    className="h-7 text-xs font-mono" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-0.5">
                                                <label className="text-[10px] font-medium text-zinc-400">Weight</label>
                                                <select value={(selectedEl.properties.fontWeight as string) || "400"}
                                                    onChange={(e) => updateProperty(selectedEl.id, "fontWeight", e.target.value)}
                                                    className="h-7 w-full text-xs rounded-md border border-input bg-transparent px-2">
                                                    <option value="400">Regular</option><option value="700">Bold</option>
                                                </select>
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="text-[10px] font-medium text-zinc-400">Warna</label>
                                                <input type="color" value={(selectedEl.properties.color as string) || "#000000"}
                                                    onChange={(e) => updateProperty(selectedEl.id, "color", e.target.value)}
                                                    className="h-7 w-full rounded-md border border-input cursor-pointer" />
                                            </div>
                                        </div>
                                        <div className="space-y-0.5">
                                            <label className="text-[10px] font-medium text-zinc-400">Align</label>
                                            <div className="flex gap-1">
                                                {(["left", "center", "right"] as const).map((align) => (
                                                    <button key={align} onClick={() => updateProperty(selectedEl.id, "textAlign", align)}
                                                        className={cn("flex-1 h-7 text-[10px] rounded-md border transition-colors",
                                                            (selectedEl.properties.textAlign || "left") === align
                                                                ? "bg-blue-500 text-white border-blue-500"
                                                                : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300")}>
                                                        {align === "left" ? "Kiri" : align === "center" ? "Tengah" : "Kanan"}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Actions */}
                <div className="shrink-0 p-3 border-t border-zinc-200 flex items-center justify-between gap-2">
                    <Button size="sm" variant="outline" onClick={onBack} className="gap-1">
                        <ArrowLeft className="size-3.5" /> Kembali
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={!templateName.trim()}
                        className="bg-zinc-950 text-white hover:bg-zinc-800 gap-1">
                        <Save className="size-3.5" /> Simpan
                    </Button>
                </div>
            </div>
        </div>
    );
}
