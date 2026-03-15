"use client";

import {
    useState,
    useRef,
    useCallback,
    type ChangeEvent,
    type DragEvent,
} from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Upload, FileImage, CropIcon, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Default crop aspect ratio ──────────────────────────────────────────────────
const CROP_ASPECT = 2 / 3;

// ── Constants ──────────────────────────────────────────────────────────────────
const OUTPUT_WIDTH = 576;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ── Types ──────────────────────────────────────────────────────────────────────
export interface CroppedImageData {
    dataUrl: string;
    width: number;
    height: number;
}

interface StepUploadCropProps {
    onNext: (data: CroppedImageData) => void;
    initialImage?: CroppedImageData | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Crop the image on a hidden canvas, then scale so width = OUTPUT_WIDTH. */
function cropAndScale(
    image: HTMLImageElement,
    pixelCrop: PixelCrop,
): CroppedImageData | null {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // natural → displayed scale
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const srcX = pixelCrop.x * scaleX;
    const srcY = pixelCrop.y * scaleY;
    const srcW = pixelCrop.width * scaleX;
    const srcH = pixelCrop.height * scaleY;

    // output dimensions: width fixed at OUTPUT_WIDTH, height follows ratio
    const ratio = srcH / srcW;
    const outW = OUTPUT_WIDTH;
    const outH = Math.round(OUTPUT_WIDTH * ratio);

    canvas.width = outW;
    canvas.height = outH;

    ctx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

    return { dataUrl: canvas.toDataURL("image/png"), width: outW, height: outH };
}

// ── Component ──────────────────────────────────────────────────────────────────

export function StepUploadCrop({ onNext, initialImage }: StepUploadCropProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [croppedResult, setCroppedResult] = useState<CroppedImageData | null>(
        initialImage ?? null,
    );
    const replaceInputRef = useRef<HTMLInputElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);

    const imgRef = useRef<HTMLImageElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // ── File reader ──
    const loadFile = useCallback((file: File) => {
        setFileError(null);
        if (!file.type.startsWith("image/")) {
            setFileError("Format file tidak didukung. Gunakan PNG, JPG, atau WEBP.");
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setFileError("Ukuran file maksimal 5 MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setImageSrc(reader.result as string);
            setCrop(undefined);
            setCompletedCrop(undefined);
            setCroppedResult(null);
        };
        reader.readAsDataURL(file);
    }, []);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) loadFile(file);
    };

    // ── Drag & drop ──
    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) loadFile(file);
    };

    // ── Crop & scale ──
    const handleCropDone = () => {
        if (!imgRef.current || !completedCrop) return;
        const result = cropAndScale(imgRef.current, completedCrop);
        if (result) setCroppedResult(result);
    };

    // ── Replace image: reset + open file picker ──
    const handleReplace = () => {
        setImageSrc(null);
        setCrop(undefined);
        setCompletedCrop(undefined);
        setCroppedResult(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        // Use a separate input ref to immediately open picker
        replaceInputRef.current?.click();
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // Render
    // ═══════════════════════════════════════════════════════════════════════════

    return (
        <div className="space-y-6">
            {/* ── Upload zone (when no image loaded) ── */}
            {!imageSrc && !croppedResult && (
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        "relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200",
                        "py-20 px-8",
                        isDragging
                            ? "border-zinc-900 bg-zinc-50"
                            : "border-zinc-300 hover:border-zinc-400 bg-zinc-50/50",
                    )}
                >
                    <div className="flex size-14 items-center justify-center rounded-full bg-zinc-100">
                        <Upload className="size-6 text-zinc-400" />
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-sm font-medium text-zinc-700">
                            Klik atau seret gambar ke sini
                        </p>
                        <p className="text-xs text-zinc-400">PNG, JPG, WEBP · Maks. 5 MB</p>
                    </div>
                    {fileError && (
                        <p className="text-xs text-red-600 font-medium">{fileError}</p>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <input
                        ref={replaceInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            )}

            {/* ── Cropper ── */}
            {imageSrc && !croppedResult && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-zinc-700">
                            Seret area crop pada gambar
                        </p>
                        <Button
                            size="xs"
                            variant="ghost"
                            onClick={handleReplace}
                            className="text-zinc-400 hover:text-zinc-600"
                        >
                            <FileImage className="size-3" />
                            Ganti Gambar
                        </Button>
                    </div>

                    <div className="rounded-xl border border-zinc-300 bg-zinc-200 p-4 flex items-center justify-center overflow-auto">
                        <ReactCrop
                            crop={crop}
                            onChange={(c) => setCrop(c)}
                            onComplete={(c) => setCompletedCrop(c)}

                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                ref={imgRef}
                                src={imageSrc}
                                alt="Gambar untuk di-crop"
                                style={{ maxHeight: "60vh", maxWidth: "100%" }}
                                onLoad={(e) => {
                                    const img = e.currentTarget;
                                    const imgW = img.width;
                                    const imgH = img.height;
                                    // Compute default crop area centered, as large as possible at 2:3
                                    const cropH2W = 1 / CROP_ASPECT; // height/width ratio = 3/2
                                    let cw: number, ch: number;
                                    if (imgH / imgW > cropH2W) {
                                        // image taller → width-limited
                                        cw = imgW * 0.9;
                                        ch = cw * cropH2W;
                                    } else {
                                        // image wider → height-limited
                                        ch = imgH * 0.9;
                                        cw = ch / cropH2W;
                                    }
                                    const cx = (imgW - cw) / 2;
                                    const cy = (imgH - ch) / 2;
                                    const initialCrop: PixelCrop = {
                                        unit: "px",
                                        x: cx,
                                        y: cy,
                                        width: cw,
                                        height: ch,
                                    };
                                    setCrop(initialCrop);
                                    setCompletedCrop(initialCrop);
                                }}
                            />
                        </ReactCrop>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            onClick={handleCropDone}
                            disabled={
                                !completedCrop ||
                                completedCrop.width === 0 ||
                                completedCrop.height === 0
                            }
                            className="bg-zinc-950 text-white hover:bg-zinc-800"
                        >
                            <CropIcon className="size-3.5" />
                            Crop Gambar
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Cropped preview ── */}
            {croppedResult && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-zinc-700">
                            Hasil Crop{" "}
                            <span className="text-zinc-400 font-normal">
                                ({croppedResult.width}×{croppedResult.height}px)
                            </span>
                        </p>
                        <Button
                            size="xs"
                            variant="ghost"
                            onClick={handleReplace}
                            className="text-zinc-400 hover:text-zinc-600"
                        >
                            <FileImage className="size-3" />
                            Ganti Gambar
                        </Button>
                    </div>

                    <div className="rounded-xl border border-zinc-300 bg-zinc-200 p-4 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={croppedResult.dataUrl}
                            alt="Cropped preview"
                            className="shadow-sm max-h-[50vh]"
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            onClick={() => onNext(croppedResult)}
                            className="bg-zinc-950 text-white hover:bg-zinc-800"
                        >
                            Lanjut ke Editor
                            <ArrowRight className="size-3.5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
