"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Stage, Layer, Rect, Text, Line, Image as KonvaImage, Transformer } from "react-konva";
import Konva from "konva";
import { resolveVariables, DUMMY_RENDER_CONTEXT } from "@/lib/template-variables";

// ── Types ──────────────────────────────────────────────────────────────────────
export type ElementType = "photo_slot" | "text";

export interface TemplateElement {
    id: string;
    elementType: ElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    sequence: number;
    properties: Record<string, unknown>;
}

interface EditorCanvasProps {
    width: number;
    height: number;
    backgroundDataUrl: string;
    elements: TemplateElement[];
    selectedId: string | null;
    previewMode?: boolean;
    snapEnabled?: boolean;
    onSelect: (id: string | null) => void;
    onElementUpdate: (id: string, attrs: Partial<TemplateElement>) => void;
}

// ── Snap config ────────────────────────────────────────────────────────────────
const SNAP_THRESHOLD = 8; // px tolerance

interface SnapGuides {
    vertical: number | null;   // x position for vertical guide
    horizontal: number | null; // y position for horizontal guide
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function EditorCanvas({
    width,
    height,
    backgroundDataUrl,
    elements,
    selectedId,
    previewMode = false,
    snapEnabled = true,
    onSelect,
    onElementUpdate,
}: EditorCanvasProps) {
    const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
    const [guides, setGuides] = useState<SnapGuides>({ vertical: null, horizontal: null });
    const transformerRef = useRef<Konva.Transformer>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const layerRef = useRef<Konva.Layer>(null);

    const canvasCenterX = width / 2;
    const canvasCenterY = height / 2;

    // Load background image
    useEffect(() => {
        const img = new window.Image();
        img.src = backgroundDataUrl;
        img.onload = () => setBgImage(img);
    }, [backgroundDataUrl]);

    // Attach transformer to selected node
    useEffect(() => {
        const tr = transformerRef.current;
        if (!tr || !layerRef.current) return;

        if (selectedId) {
            const node = layerRef.current.findOne(`#${selectedId}`);
            if (node) {
                tr.nodes([node]);
                tr.getLayer()?.batchDraw();
                return;
            }
        }
        tr.nodes([]);
        tr.getLayer()?.batchDraw();
    }, [selectedId, elements]);

    // Click on empty space → deselect
    const handleStageClick = useCallback(
        (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
            if (e.target === e.target.getStage() || e.target.name() === "background") {
                onSelect(null);
            }
        },
        [onSelect],
    );

    // ── Snap logic during drag ──
    const handleDragMove = useCallback(
        (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
            if (!snapEnabled) return;

            const node = e.target;
            const el = elements.find((el) => el.id === id);
            if (!el) return;

            const nodeW = node.width() * node.scaleX();
            const nodeH = node.height() * node.scaleY();

            let x = node.x();
            let y = node.y();

            const newGuides: SnapGuides = { vertical: null, horizontal: null };

            // Element center
            const elCenterX = x + nodeW / 2;
            const elCenterY = y + nodeH / 2;

            // Snap element center to canvas center X
            if (Math.abs(elCenterX - canvasCenterX) < SNAP_THRESHOLD) {
                x = canvasCenterX - nodeW / 2;
                newGuides.vertical = canvasCenterX;
            }
            // Snap element left edge to canvas center X
            else if (Math.abs(x - canvasCenterX) < SNAP_THRESHOLD) {
                x = canvasCenterX;
                newGuides.vertical = canvasCenterX;
            }
            // Snap element right edge to canvas center X
            else if (Math.abs(x + nodeW - canvasCenterX) < SNAP_THRESHOLD) {
                x = canvasCenterX - nodeW;
                newGuides.vertical = canvasCenterX;
            }

            // Snap element center to canvas center Y
            if (Math.abs(elCenterY - canvasCenterY) < SNAP_THRESHOLD) {
                y = canvasCenterY - nodeH / 2;
                newGuides.horizontal = canvasCenterY;
            }
            // Snap element top edge to canvas center Y
            else if (Math.abs(y - canvasCenterY) < SNAP_THRESHOLD) {
                y = canvasCenterY;
                newGuides.horizontal = canvasCenterY;
            }
            // Snap element bottom edge to canvas center Y
            else if (Math.abs(y + nodeH - canvasCenterY) < SNAP_THRESHOLD) {
                y = canvasCenterY - nodeH;
                newGuides.horizontal = canvasCenterY;
            }

            node.x(x);
            node.y(y);
            setGuides(newGuides);
        },
        [snapEnabled, elements, canvasCenterX, canvasCenterY],
    );

    // Drag end → update element position + clear guides
    const handleDragEnd = useCallback(
        (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
            setGuides({ vertical: null, horizontal: null });
            onElementUpdate(id, {
                x: Math.round(e.target.x()),
                y: Math.round(e.target.y()),
            });
        },
        [onElementUpdate],
    );

    // Transform end → update size + rotation
    const handleTransformEnd = useCallback(
        (id: string, e: Konva.KonvaEventObject<Event>) => {
            const node = e.target;
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();

            // Reset scale to 1, apply to width/height instead
            node.scaleX(1);
            node.scaleY(1);

            onElementUpdate(id, {
                x: Math.round(node.x()),
                y: Math.round(node.y()),
                width: Math.round(Math.max(20, node.width() * scaleX)),
                height: Math.round(Math.max(20, node.height() * scaleY)),
                rotation: Math.round(node.rotation()),
            });
        },
        [onElementUpdate],
    );

    // ── Render ──

    const sortedElements = [...elements].sort((a, b) => a.sequence - b.sequence);
    const showGuides = snapEnabled && (guides.vertical !== null || guides.horizontal !== null);

    return (
        <Stage
            ref={stageRef}
            width={width}
            height={height}
            onClick={handleStageClick}
            onTap={handleStageClick}
        >
            <Layer ref={layerRef}>
                {/* Background image */}
                {bgImage && (
                    <KonvaImage
                        image={bgImage}
                        width={width}
                        height={height}
                        name="background"
                        listening={true}
                    />
                )}

                {/* Elements */}
                {sortedElements.map((el) => {
                    const isSelected = el.id === selectedId;

                    if (el.elementType === "photo_slot") {
                        return (
                            <Rect
                                key={el.id}
                                id={el.id}
                                x={el.x}
                                y={el.y}
                                width={el.width}
                                height={el.height}
                                rotation={el.rotation}
                                opacity={el.opacity / 100}
                                fill="rgba(59, 130, 246, 0.08)"
                                stroke={isSelected ? "#2563eb" : "#3b82f6"}
                                strokeWidth={isSelected ? 2 : 1}
                                dash={[6, 3]}
                                draggable={!previewMode}
                                onClick={() => onSelect(el.id)}
                                onTap={() => onSelect(el.id)}
                                onDragMove={(e) => handleDragMove(el.id, e)}
                                onDragEnd={(e) => handleDragEnd(el.id, e)}
                                onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                            />
                        );
                    }

                    if (el.elementType === "text") {
                        const props = el.properties as {
                            content?: string;
                            fontFamily?: string;
                            fontSize?: number;
                            fontWeight?: string;
                            color?: string;
                            textAlign?: string;
                        };

                        return (
                            <Text
                                key={el.id}
                                id={el.id}
                                x={el.x}
                                y={el.y}
                                width={el.width}
                                height={el.height}
                                rotation={el.rotation}
                                opacity={el.opacity / 100}
                                text={previewMode
                                    ? resolveVariables(props.content || "Teks baru", DUMMY_RENDER_CONTEXT)
                                    : (props.content || "Teks baru")
                                }
                                fontFamily={props.fontFamily || "Inter"}
                                fontSize={props.fontSize || 24}
                                fontStyle={props.fontWeight === "700" ? "bold" : "normal"}
                                fill={props.color || "#000000"}
                                align={(props.textAlign as "left" | "center" | "right") || "left"}
                                verticalAlign="middle"
                                draggable={!previewMode}
                                onClick={() => onSelect(el.id)}
                                onTap={() => onSelect(el.id)}
                                onDragMove={(e) => handleDragMove(el.id, e)}
                                onDragEnd={(e) => handleDragEnd(el.id, e)}
                                onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                            />
                        );
                    }

                    return null;
                })}

                {/* ── Snap guide lines ── */}
                {showGuides && guides.vertical !== null && (
                    <Line
                        points={[guides.vertical, 0, guides.vertical, height]}
                        stroke="#f43f5e"
                        strokeWidth={1}
                        dash={[4, 4]}
                        listening={false}
                    />
                )}
                {showGuides && guides.horizontal !== null && (
                    <Line
                        points={[0, guides.horizontal, width, guides.horizontal]}
                        stroke="#f43f5e"
                        strokeWidth={1}
                        dash={[4, 4]}
                        listening={false}
                    />
                )}

                {/* Transformer for selected element */}
                <Transformer
                    ref={transformerRef}
                    rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
                    rotationSnapTolerance={5}
                    boundBoxFunc={(oldBox, newBox) => {
                        // Limit minimum size
                        if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />
            </Layer>
        </Stage>
    );
}
