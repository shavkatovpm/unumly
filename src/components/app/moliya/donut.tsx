"use client";

/* Donut grafik, uning izohi (legend) va markazi — tanlangan bo'lak
   ajralib turadi, markazda o'sha summa chiqadi. */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatSom } from "@/lib/money";
import { short } from "./shared";

export type Slice = { id: string; label: string; value: number; color: string };

export function Donut({ slices, size = 112, stroke = 13, active, onPick, center }: { slices: Slice[]; size?: number; stroke?: number; active?: string | null; onPick?: (id: string | null) => void; center: React.ReactNode }) {
  // Tanlangan bo'lak 4px qalinroq — chetdan kesilmasligi uchun joy qoldiramiz.
  const r = (size - stroke - 4) / 2;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((t, x) => t + x.value, 0) || 1;
  const gap = slices.length > 1 ? 3 : 0;
  const starts = slices.map((_, i) => slices.slice(0, i).reduce((t, x) => t + (x.value / total) * c, 0));
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--subtle)" strokeWidth={stroke} />
        {slices.map((x, i) => {
          const len = (x.value / total) * c;
          const dim = !!active && active !== x.id;
          return (
            <motion.circle
              key={x.id}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={x.color}
              strokeWidth={active === x.id ? stroke + 4 : stroke}
              strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
              initial={{ strokeDashoffset: -starts[i], opacity: 0 }}
              animate={{ strokeDashoffset: -starts[i], opacity: dim ? 0.25 : 1 }}
              transition={{ duration: 0.3 }}
              onClick={onPick ? (e) => { e.stopPropagation(); onPick(active === x.id ? null : x.id); } : undefined}
              className={onPick ? "cursor-pointer" : undefined}
            />
          );
        })}
      </svg>
      <span className="pointer-events-none relative text-center">{center}</span>
    </span>
  );
}

export function Legend({ slices, active, onPick, limit = 6 }: { slices: Slice[]; active: string | null; onPick: (id: string | null) => void; limit?: number }) {
  const total = slices.reduce((t, x) => t + x.value, 0) || 1;
  return (
    <div className="space-y-0.5">
      {slices.slice(0, limit).map((x) => (
        <button key={x.id} type="button" onClick={() => onPick(active === x.id ? null : x.id)} className={cn("flex min-h-10 w-full items-center gap-2 rounded-xl px-1.5 text-left transition-opacity", active && active !== x.id && "opacity-40")}>
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: x.color }} />
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{x.label}</span>
          <span className="text-[12.5px] tabular-nums text-faint">{Math.round((x.value / total) * 100)}%</span>
          <span className="w-[92px] text-right text-[13.5px] font-semibold tabular-nums">{formatSom(x.value)}</span>
        </button>
      ))}
    </div>
  );
}

export function DonutCenter({ slices, active, label, total }: { slices: Slice[]; active: string | null; label: string; total: number }) {
  const a = slices.find((x) => x.id === active);
  return (
    <>
      <span className="block max-w-[72px] truncate text-[11.5px] font-medium text-muted">{a ? a.label : label}</span>
      <span className="block text-[15px] font-bold tabular-nums tracking-[-0.02em]">{short(a ? a.value : total)}</span>
    </>
  );
}
