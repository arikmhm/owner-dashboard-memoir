"use client";

import { useState } from "react";
import { dummyTemplates, dummyTemplateElements } from "@/lib/dummy-data";
import { formatRupiah } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Layers,
  Pencil,
  Play,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  ImageIcon,
  Type,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type Template = (typeof dummyTemplates)[number];

// ── Preview colour palette ─────────────────────────────────────────────────────
const PREVIEW_COLORS: string[] = [
  "#e8e0d8", // warm sand
  "#d4dce4", // cool slate
  "#e0d8e8", // soft lavender
  "#dce8d8", // sage
  "#e8ddd4", // peach
  "#d8e4e8", // ice blue
  "#e4d8e0", // dusty rose
  "#d8e8dd", // mint
];

// ── Slot layout for preview ────────────────────────────────────────────────────
type SlotBox = { l: number; t: number; w: number; h: number };

function getSlotBoxes(slotCount: number, ar: number): SlotBox[] {
  const landscape = ar >= 1.4;
  switch (slotCount) {
    case 1: return [{ l: 10, t: 10, w: 80, h: 80 }];
    case 2: return landscape
      ? [{ l: 3, t: 8, w: 45, h: 84 }, { l: 52, t: 8, w: 45, h: 84 }]
      : [{ l: 8, t: 3, w: 84, h: 45 }, { l: 8, t: 52, w: 84, h: 45 }];
    case 3: return landscape
      ? [{ l: 2, t: 8, w: 30, h: 84 }, { l: 35, t: 8, w: 30, h: 84 }, { l: 68, t: 8, w: 30, h: 84 }]
      : [{ l: 8, t: 2, w: 84, h: 30 }, { l: 8, t: 35, w: 84, h: 30 }, { l: 8, t: 68, w: 84, h: 30 }];
    case 4: return [
      { l: 4, t: 4, w: 44, h: 44 }, { l: 52, t: 4, w: 44, h: 44 },
      { l: 4, t: 52, w: 44, h: 44 }, { l: 52, t: 52, w: 44, h: 44 },
    ];
    case 6: return [
      { l: 3, t: 4, w: 30, h: 44 }, { l: 35, t: 4, w: 30, h: 44 }, { l: 67, t: 4, w: 30, h: 44 },
      { l: 3, t: 52, w: 30, h: 44 }, { l: 35, t: 52, w: 30, h: 44 }, { l: 67, t: 52, w: 30, h: 44 },
    ];
    case 8: return [
      { l: 2, t: 4, w: 22, h: 44 }, { l: 26, t: 4, w: 22, h: 44 }, { l: 50, t: 4, w: 22, h: 44 }, { l: 76, t: 4, w: 22, h: 44 },
      { l: 2, t: 52, w: 22, h: 44 }, { l: 26, t: 52, w: 22, h: 44 }, { l: 50, t: 52, w: 22, h: 44 }, { l: 76, t: 52, w: 22, h: 44 },
    ];
    default: return [{ l: 10, t: 10, w: 80, h: 80 }];
  }
}

// ── Template card ──────────────────────────────────────────────────────────────
interface TemplateCardProps {
  template: Template;
  colorIndex: number;
  onToggleActive: (id: string) => void;
  onRun: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function TemplateCard({
  template,
  colorIndex,
  onToggleActive,
  onRun,
  onEdit,
  onDelete,
}: TemplateCardProps) {
  const slotCount = dummyTemplateElements.filter(
    (el) => el.template_id === template.id && el.element_type === "photo_slot",
  ).length;
  const ar = template.width / template.height;
  const slots = getSlotBoxes(slotCount, ar);
  const bgColor = PREVIEW_COLORS[colorIndex % PREVIEW_COLORS.length];

  return (
    <article
      className={cn(
        "group flex flex-col bg-white border border-zinc-200 rounded-lg overflow-hidden",
        "hover:border-zinc-300 hover:shadow-md transition-all duration-200",
        !template.is_active && "opacity-55",
      )}
    >
      {/* ── Preview — full image, no rounding ── */}
      <div className="relative overflow-hidden" style={{ backgroundColor: bgColor }}>
        {/* Maintain template aspect ratio */}
        <div style={{ paddingBottom: `${(template.height / template.width) * 100}%` }} />

        {/* Slot overlays */}
        {slots.map((s, i) => (
          <div
            key={i}
            className="absolute border border-dashed border-black/15 bg-white/30 backdrop-blur-[1px] flex items-center justify-center"
            style={{ left: `${s.l}%`, top: `${s.t}%`, width: `${s.w}%`, height: `${s.h}%` }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <ImageIcon className="size-3.5 text-black/20" />
              <span className="font-mono text-[8px] font-semibold text-black/25 leading-none">
                {i + 1}
              </span>
            </div>
          </div>
        ))}

        {/* Sample text overlays for preview feel */}
        <div className="absolute bottom-[6%] left-[5%] flex flex-col gap-0.5">
          <div className="flex items-center gap-1 opacity-20">
            <Type className="size-2.5" />
            <div className="h-1.5 w-12 bg-black/40 rounded-full" />
          </div>
          <div className="h-1 w-8 bg-black/15 rounded-full" />
        </div>

        {/* Inactive overlay */}
        {!template.is_active && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <span className="font-mono text-[9px] font-bold tracking-[0.2em] text-zinc-500 bg-white/90 border border-zinc-300 px-2.5 py-1 rounded-sm">
              NONAKTIF
            </span>
          </div>
        )}
      </div>

      {/* ── Card Info ── */}
      <div className="flex-1 px-3.5 pt-3 pb-2.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 truncate leading-snug" title={template.name}>
            {template.name}
          </h3>
          <Badge
            className={cn(
              "font-mono text-[8px] px-1.5 h-4 rounded-sm tracking-widest shrink-0",
              template.is_active
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-zinc-100 text-zinc-400 border border-zinc-200",
            )}
          >
            {template.is_active ? "AKTIF" : "OFF"}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[10px] text-zinc-500 bg-zinc-50 border border-zinc-100 px-1.5 py-0.5 rounded-sm">
            {slotCount} slot
          </span>
          <span className="font-mono text-[10px] text-zinc-400">
            {template.width}×{template.height}
          </span>
          {template.override_price_base != null && (
            <span className="font-mono text-[10px] text-zinc-500 bg-zinc-50 border border-zinc-100 px-1.5 py-0.5 rounded-sm">
              {formatRupiah(template.override_price_base)}
            </span>
          )}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="px-3 py-2 border-t border-zinc-100 flex items-center justify-between">
        <div className="flex gap-0.5">
          <Button size="icon-xs" variant="ghost"
            className="text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50"
            title="Coba template" onClick={() => onRun(template.id)}>
            <Play className="size-3" />
          </Button>
          <Button size="icon-xs" variant="ghost"
            className="text-zinc-400 hover:text-blue-600 hover:bg-blue-50"
            title="Edit template" onClick={() => onEdit(template.id)}>
            <Pencil className="size-3" />
          </Button>
          <Button size="icon-xs" variant="ghost"
            className="text-zinc-400 hover:text-red-500 hover:bg-red-50"
            title="Hapus template" onClick={() => onDelete(template.id)}>
            <Trash2 className="size-3" />
          </Button>
        </div>
        <Button size="icon-xs" variant="ghost"
          className={cn(template.is_active ? "text-zinc-700 hover:text-zinc-500" : "text-zinc-300 hover:text-zinc-500")}
          title={template.is_active ? "Nonaktifkan" : "Aktifkan"}
          onClick={() => onToggleActive(template.id)}>
          {template.is_active ? <ToggleRight className="size-3.5" /> : <ToggleLeft className="size-3.5" />}
        </Button>
      </div>
    </article>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const [templates, setTemplates] = useState(dummyTemplates);

  const handleToggleActive = (id: string) =>
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: !t.is_active } : t)),
    );

  const handleRun = (id: string) => console.log("[Run]", id);
  const handleEdit = (id: string) => console.log("[Edit]", id);
  const handleDelete = (id: string) =>
    setTemplates((prev) => prev.filter((t) => t.id !== id));

  const activeCount = templates.filter((t) => t.is_active).length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
            Manajemen Template
          </h1>
          <p className="text-sm text-zinc-500">
            Buat dan kelola template cetak untuk semua kiosk kamu.{" "}
            <span className="text-zinc-400">
              {activeCount} aktif · {templates.length - activeCount} nonaktif
            </span>
          </p>
        </div>
        <Link href="/templates/create">
          <Button size="sm" className="bg-zinc-950 text-white hover:bg-zinc-800 shrink-0">
            <Plus className="size-3.5" />
            Buat Template
          </Button>
        </Link>
      </div>

      {/* ── Card grid ── */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-300">
          <Layers className="size-10" />
          <p className="text-sm font-medium text-zinc-400">Belum ada template</p>
          <p className="text-xs">Klik &ldquo;Buat Template&rdquo; untuk memulai.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((tpl, idx) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              colorIndex={idx}
              onToggleActive={handleToggleActive}
              onRun={handleRun}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
