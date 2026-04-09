"use client";

import { useState } from "react";
import { Check, ImagePlus, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
    StepUploadCrop,
    type CroppedImageData,
} from "@/components/templates/steps/step-upload-crop";
import { StepEditor } from "@/components/templates/steps/step-editor";

// ── Step definitions ───────────────────────────────────────────────────────────
const STEPS = [
    { id: 1, label: "Upload & Crop", icon: ImagePlus },
    { id: 2, label: "Editor", icon: SlidersHorizontal },
] as const;

// ── Page ───────────────────────────────────────────────────────────────────────
export default function CreateTemplatePage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [croppedImage, setCroppedImage] = useState<CroppedImageData | null>(
        null,
    );

    const handleCropNext = (data: CroppedImageData) => {
        setCroppedImage(data);
        setCurrentStep(2);
    };

    const handleBackToUpload = () => {
        setCurrentStep(1);
    };

    const isEditor = currentStep === 2 && croppedImage;

    return (
        <div className={cn(
            "flex flex-col gap-6",
            isEditor && "h-[calc(100vh-64px)] overflow-hidden",
        )}>
            {/* ── Header ── */}
            <div className={cn(
                "flex items-center justify-between gap-4 pb-5 border-b border-zinc-200",
                isEditor && "shrink-0 pb-3",
            )}>
                <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
                    Buat Template
                </h1>
                <Link href="/templates">
                    <Button size="sm" variant="ghost" className="gap-1.5 text-zinc-400 hover:text-zinc-700">
                        <X className="size-4" />
                        Cancel
                    </Button>
                </Link>
            </div>

            {/* ── Stepper indicators ── */}
            <div className={cn(
                "flex items-center justify-center gap-6",
                isEditor && "shrink-0 py-3",
            )}>
                {STEPS.map((step, idx) => {
                    const StepIcon = step.icon;
                    const isActive = currentStep === step.id;
                    const isDone = currentStep > step.id;

                    return (
                        <div key={step.id} className="flex items-center gap-6">
                            {idx > 0 && (
                                <div
                                    className={cn(
                                        "h-px w-16",
                                        isDone ? "bg-zinc-900" : "bg-zinc-200",
                                    )}
                                />
                            )}
                            <div className="flex items-center gap-2.5">
                                <div
                                    className={cn(
                                        "flex items-center justify-center size-7 rounded-sm border-2 transition-all",
                                        isActive
                                            ? "border-zinc-900 bg-zinc-900 text-white"
                                            : isDone
                                                ? "border-zinc-900 bg-zinc-900 text-white"
                                                : "border-zinc-300 bg-white text-zinc-400",
                                    )}
                                >
                                    {isDone ? (
                                        <Check className="size-3.5" />
                                    ) : (
                                        <StepIcon className="size-3.5" />
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        "text-sm font-medium",
                                        isActive || isDone ? "text-zinc-900" : "text-zinc-400",
                                    )}
                                >
                                    {step.label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Step content ── */}
            {currentStep === 1 && (
                <div>
                    <StepUploadCrop
                        onNext={handleCropNext}
                        initialImage={croppedImage}
                    />
                </div>
            )}
            {isEditor && (
                <div className="flex-1 min-h-0 overflow-hidden">
                    <StepEditor croppedImage={croppedImage} onBack={handleBackToUpload} />
                </div>
            )}
        </div>
    );
}
