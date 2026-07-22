"use client";

/** "Analitika" — reja (maqsad) bo'yicha amalda qancha bajarilgani, foizda
 *  va vizual (halqa/progress) ko'rinishda, kategoriya va loyiha kesimida. */

import { useEffect, useMemo, useState } from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useProjects } from "@/lib/projects-store";
import { useFocusCounts } from "@/lib/taqsimot-store";
import { getFocusHistory } from "@/lib/taqsimot-actions";
import { CATEGORY_PALETTE, colorWithAlpha } from "@/lib/category-palette";
import { KATEGORIYALAR } from "@/lib/kategoriya";
import type { Project } from "@/lib/types";
import { ProjectIcon } from "../loyiha-icons";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function LoyihaAnalitika() {
  const { projects } = useProjects();
  const { focus } = useFocusCounts();
  const [history, setHistory] = useState<Record<string, number[]>>({});

  useEffect(() => {
    let alive = true;
    void getFocusHistory(6).then((h) => {
      if (alive) setHistory(h);
    });
    return () => {
      alive = false;
    };
  }, []);

  const kategoriyalar = useMemo(
    () =>
      KATEGORIYALAR.map((k) => {
        const items = projects.filter((p) => p.category === k.key);
        const maqsad = round1(items.reduce((s, p) => s + (p.targetHours ?? 0), 0));
        const amalda = round1(items.reduce((s, p) => s + (focus[p.id] ?? 0), 0));
        const pct = maqsad > 0 ? Math.round((amalda / maqsad) * 100) : 0;
        return { ...k, items, maqsad, amalda, pct };
      }),
    [projects, focus]
  );

  const rows = useMemo(() => {
    return projects
      .filter((p) => (p.targetHours ?? 0) > 0 || (focus[p.id] ?? 0) > 0)
      .map((p) => {
        const amalda = focus[p.id] ?? 0;
        const maqsad = p.targetHours ?? 0;
        const pct = maqsad > 0 ? Math.round((amalda / maqsad) * 100) : amalda > 0 ? 100 : 0;
        return { p, amalda, maqsad, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [projects, focus]);

  return (
    <div className="space-y-4">
      {/* Kategoriya bo'yicha bajarish % */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-3 text-[12.5px] font-semibold">Reja bo&apos;yicha bajarish — kategoriya</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kategoriyalar.map((k) => (
            <div key={k.key} className="flex flex-col items-center rounded-lg border border-border p-3">
              <div className="relative">
                <ProgressRing pct={k.pct} color={CATEGORY_PALETTE[k.color].oklch} />
                <div className="absolute inset-0 grid place-items-center">
                  <span className="font-mono text-[13px] font-semibold tabular-nums">{k.pct}%</span>
                </div>
              </div>
              <p className="mt-2 text-[12px] font-medium">{k.key}</p>
              <p className="font-mono text-[10.5px] tabular-nums text-faint">
                {k.amalda}/{k.maqsad}s
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Loyiha bo'yicha bajarish % */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-3 text-[12.5px] font-semibold">Reja bo&apos;yicha bajarish — loyiha</p>
        {rows.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-faint">Hali maqsad yoki belgi kiritilmagan</p>
        ) : (
          <div className="space-y-2.5">
            {rows.map(({ p, amalda, maqsad, pct }) => {
              const color = p.color ? CATEGORY_PALETTE[p.color].oklch : "var(--foreground)";
              const over = pct > 100;
              return (
                <div key={p.id} className="flex items-center gap-2.5">
                  <span
                    className="grid size-6 shrink-0 place-items-center rounded-md"
                    style={{ background: p.color ? colorWithAlpha(p.color, 0.14) : "var(--subtle)", color }}
                  >
                    <ProjectIcon k={p.icon} className="size-3.5" />
                  </span>
                  <span className="w-24 shrink-0 truncate text-[12.5px] font-medium sm:w-32">{p.title}</span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-subtle">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${Math.min(100, pct)}%`, background: over ? "var(--accent)" : color }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right font-mono text-[11.5px] tabular-nums text-faint">
                    {amalda}/{maqsad}s · {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trend */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-3 text-[12.5px] font-semibold">Trend — oxirgi 6 hafta</p>
        {projects.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-faint">Hali loyiha yo&apos;q</p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {projects.map((p) => (
              <TrendCard key={p.id} loyiha={p} tarix={history[p.id] ?? [0, 0, 0, 0, 0, focus[p.id] ?? 0]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressRing({
  pct,
  color,
  size = 56,
  stroke = 5,
}: {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped / 100)}
        className="transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}

function TrendCard({ loyiha, tarix }: { loyiha: Project; tarix: number[] }) {
  const color = loyiha.color ? CATEGORY_PALETTE[loyiha.color].oklch : "var(--foreground)";
  const last = tarix[tarix.length - 1];
  const prev = tarix[tarix.length - 2];
  const delta = prev ? Math.round(((last - prev) / prev) * 100) : 0;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-2.5">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-lg"
        style={{ background: loyiha.color ? colorWithAlpha(loyiha.color, 0.14) : "var(--subtle)", color }}
      >
        <ProjectIcon k={loyiha.icon} className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium">{loyiha.title}</p>
        <div className="mt-1 flex items-center gap-2">
          <Sparkline data={tarix} color={color} />
          <span className="font-mono text-[12px] tabular-nums">{last}s</span>
          <DeltaBadge delta={delta} />
        </div>
      </div>
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 64;
  const h = 22;
  const max = Math.max(1, ...data);
  const min = Math.min(...data);
  const range = Math.max(1, max - min);
  const step = w / Math.max(1, data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10.5px] font-medium text-faint">
        <Minus className="size-3" />
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className="flex items-center gap-0.5 text-[10.5px] font-medium tabular-nums"
      style={{ color: up ? "var(--accent)" : "var(--danger)" }}
    >
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? "+" : ""}
      {delta}%
    </span>
  );
}
