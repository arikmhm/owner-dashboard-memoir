"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Template Preview (lightweight HTML/CSS renderer)
// Renders template elements exactly as positioned in the editor.
// Used in the template list cards. No Konva dependency.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { ImageIcon } from "lucide-react";
import {
  resolveVariables,
  DUMMY_RENDER_CONTEXT,
} from "@/lib/template-variables";
import type { TemplateElement } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface TemplatePreviewProps {
  /** Template canvas width (px) */
  canvasWidth: number;
  /** Template canvas height (px) */
  canvasHeight: number;
  /** Background image URL */
  backgroundUrl?: string;
  /** Overlay image URL */
  overlayUrl?: string | null;
  /** Elements as saved in the editor */
  elements: TemplateElement[];
  /** Whether elements are still loading */
  isLoading?: boolean;
  /** Whether the template is inactive (applies dimming overlay) */
  inactive?: boolean;
  /** Max height/width ratio — tall templates shrink to fit within this cap */
  maxRatio?: number;
}

export default function TemplatePreview({
  canvasWidth,
  canvasHeight,
  backgroundUrl,
  overlayUrl,
  elements,
  isLoading = false,
  inactive = false,
  maxRatio,
}: TemplatePreviewProps) {
  const sorted = useMemo(
    () => [...elements].sort((a, b) => a.sequence - b.sequence),
    [elements],
  );

  // Scale factors: element px → percentage of canvas
  const toPercent = (val: number, base: number) => (val / base) * 100;

  const ratio = canvasHeight / canvasWidth;
  const isCapped = maxRatio != null && ratio > maxRatio;
  const displayRatio = isCapped ? maxRatio! : ratio;

  // When capped, shrink the content to fit (with margin) and center
  const pad = 0.06; // 6% vertical padding top+bottom
  const innerScale = isCapped ? (maxRatio! / ratio) * (1 - pad * 2) : 1;
  const contentStyle: React.CSSProperties = isCapped
    ? {
        position: "absolute",
        top: `${pad * 100}%`,
        left: `${((1 - innerScale) / 2) * 100}%`,
        width: `${innerScale * 100}%`,
        height: `${(1 - pad * 2) * 100}%`,
      }
    : { position: "absolute", inset: 0 };

  return (
    <div
      className="relative overflow-hidden bg-zinc-100 w-full"
      style={{ paddingBottom: `${displayRatio * 100}%` }}
    >
      {/* Content wrapper — scales down for tall templates */}
      <div style={contentStyle}>
        {/* Background image */}
        {backgroundUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundUrl}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          />
        )}

        {/* Loading skeleton overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="w-full h-full absolute inset-0 opacity-40" />
          </div>
        )}

        {/* Elements */}
        {!isLoading &&
          sorted.map((el) => (
            <ElementPreview
              key={el.id}
              element={el}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              toPercent={toPercent}
            />
          ))}

        {/* Overlay image (on top of elements) */}
        {overlayUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={overlayUrl}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
            style={{ zIndex: 50 }}
          />
        )}
      </div>

      {/* Inactive overlay — on outer container to cover full area */}
      {inactive && (
        <div
          className="absolute inset-0 bg-white/50 flex items-center justify-center"
          style={{ zIndex: 60 }}
        >
          <span className="font-mono text-[9px] font-bold tracking-[0.2em] text-zinc-500 bg-white/90 border border-zinc-300 px-2.5 py-1 rounded-sm">
            NONAKTIF
          </span>
        </div>
      )}
    </div>
  );
}

// ── Individual Element ─────────────────────────────────────────────────────────

interface ElementPreviewProps {
  element: TemplateElement;
  canvasWidth: number;
  canvasHeight: number;
  toPercent: (val: number, base: number) => number;
}

function ElementPreview({
  element: el,
  canvasWidth,
  canvasHeight,
  toPercent,
}: ElementPreviewProps) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${toPercent(el.x, canvasWidth)}%`,
    top: `${toPercent(el.y, canvasHeight)}%`,
    width: `${toPercent(el.width, canvasWidth)}%`,
    height: `${toPercent(el.height, canvasHeight)}%`,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    transformOrigin: "top left",
    opacity: el.opacity / 100,
    zIndex: el.sequence,
  };

  // ── photo_slot ─────────────────────────────────────────────────────────
  if (el.elementType === "PHOTO_SLOT") {
    const props = el.properties as {
      borderRadius?: number;
      borderWidth?: number;
      borderColor?: string;
    };

    return (
      <div
        style={{
          ...style,
          border: `1px dashed rgba(59, 130, 246, 0.5)`,
          backgroundColor: "rgba(59, 130, 246, 0.06)",
          borderRadius: props.borderRadius
            ? `${toPercent(props.borderRadius, canvasWidth)}%`
            : undefined,
        }}
        className="flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-0.5">
          <ImageIcon className="size-3 text-blue-400/50" />
          <span className="font-mono text-[7px] font-semibold text-blue-400/60 leading-none">
            {el.sequence}
          </span>
        </div>
      </div>
    );
  }

  // ── text ────────────────────────────────────────────────────────────────
  if (el.elementType === "TEXT") {
    const props = el.properties as {
      content?: string;
      fontFamily?: string;
      fontSize?: number;
      fontWeight?: string;
      color?: string;
      textAlign?: string;
    };

    // Scale font size proportionally to the preview container.
    // The preview container width is unknown at render (it's percentage-based),
    // so we use a vw-like trick: fontSize as percentage of element width
    // relative to canvas. We'll approximate with a clamped px value based
    // on a reasonable preview width (~250px typical card width).
    const scaledFontSize = Math.max(
      4,
      ((props.fontSize ?? 24) / canvasWidth) * 100,
    );

    const content = resolveVariables(
      props.content || "Teks",
      DUMMY_RENDER_CONTEXT,
    );

    return (
      <div
        style={{
          ...style,
          fontFamily: props.fontFamily || "Inter, sans-serif",
          // Use cqi (container query inline) for responsive font sizing.
          // Fallback: percentage of container width via vw approximation.
          fontSize: `${scaledFontSize}cqi`,
          fontWeight: props.fontWeight || "400",
          color: props.color || "#000000",
          textAlign:
            (props.textAlign as React.CSSProperties["textAlign"]) || "left",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          lineHeight: 1.2,
        }}
      >
        <span className="w-full truncate">{content}</span>
      </div>
    );
  }

  // ── image ───────────────────────────────────────────────────────────────
  if (el.elementType === "IMAGE") {
    const props = el.properties as { url?: string };

    if (!props.url) {
      return (
        <div
          style={{
            ...style,
            backgroundColor: "rgba(139, 92, 246, 0.08)",
            border: "1px solid rgba(139, 92, 246, 0.2)",
          }}
          className="flex items-center justify-center"
        >
          <ImageIcon className="size-3 text-violet-400/50" />
        </div>
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={props.url}
        alt=""
        draggable={false}
        style={{
          ...style,
          objectFit: "cover",
        }}
        className="select-none pointer-events-none"
      />
    );
  }

  // ── shape ───────────────────────────────────────────────────────────────
  if (el.elementType === "SHAPE") {
    const props = el.properties as {
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      cornerRadius?: number;
      shapeType?: "rect" | "circle";
    };

    const isCircle = props.shapeType === "circle";
    const borderRadius = isCircle
      ? "50%"
      : props.cornerRadius
        ? `${toPercent(props.cornerRadius, canvasWidth)}%`
        : undefined;

    return (
      <div
        style={{
          ...style,
          backgroundColor: props.fill || "rgba(0,0,0,0.1)",
          border: props.stroke
            ? `${props.strokeWidth || 1}px solid ${props.stroke}`
            : undefined,
          borderRadius,
        }}
      />
    );
  }

  return null;
}
