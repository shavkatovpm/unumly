"use client";

/** "Reja" — qaysi loyihaga qancha vaqt ajratish kerakligini belgilash:
 *  haftalik sig'im, kategoriya foizlari, avtomatik taqsimlash va har loyiha
 *  uchun maqsad soat. Amalda qancha bajarilgani Analitika'da. */

import { useMemo, useState } from "react";
import { Settings2, Undo2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects } from "@/lib/projects-store";
import { useTaqsimotSettings, useFocusCounts } from "@/lib/taqsimot-store";
import { CATEGORY_PALETTE, colorWithAlpha } from "@/lib/category-palette";
import { KATEGORIYALAR } from "@/lib/kategoriya";
import type { LoyihaKategoriya, Project } from "@/lib/types";
import { ProjectIcon } from "../loyiha-icons";

const KUN_QISQA = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

type Guruh = { key: LoyihaKategoriya | null; label: string; desc: string; color: Project["color"] };

const GURUHLAR: Guruh[] = [
  ...KATEGORIYALAR.map((k) => ({ key: k.key, label: k.label, desc: k.desc, color: k.color })),
  { key: null, label: "Kategoriyasiz", desc: "Bo'sh vaqtdan qo'lda ajrating", color: "gray" },
];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function LoyihaReja() {
  const { projects, update } = useProjects();
  const { capacity, categoryPct, setCapacityDay, setCategoryPct } = useTaqsimotSettings();
  const { focus } = useFocusCounts();
  const [prevTargets, setPrevTargets] = useState<Record<string, number> | null>(null);

  const jamiSigim = useMemo(() => round1(capacity.reduce((a, b) => a + b, 0)), [capacity]);
  const jamiMaqsad = useMemo(
    () => round1(projects.reduce((s, p) => s + (p.targetHours ?? 0), 0)),
    [projects]
  );
  const boshVaqt = Math.max(0, round1(jamiSigim - jamiMaqsad));
  const pctJami = KATEGORIYALAR.reduce((a, k) => a + (categoryPct[k.key] ?? 0), 0);

  function avtomatikTaqsimlash() {
    const snapshot: Record<string, number> = {};
    for (const p of projects) snapshot[p.id] = p.targetHours ?? 0;
    setPrevTargets(snapshot);

    for (const kat of KATEGORIYALAR) {
      const katList = projects.filter((p) => p.category === kat.key);
      if (!katList.length) continue;
      const katSoat = jamiSigim * ((categoryPct[kat.key] ?? 0) / 100);
      const per = round1(katSoat / katList.length);
      for (const p of katList) update(p.id, { targetHours: per });
    }
  }

  function bekorQilish() {
    if (!prevTargets) return;
    for (const [id, val] of Object.entries(prevTargets)) update(id, { targetHours: val });
    setPrevTargets(null);
  }

  function maqsadChange(id: string, val: number) {
    setPrevTargets(null);
    update(id, { targetHours: val });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* Haftalik sig'im */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-[13px] font-medium">
            <Settings2 className="size-4 text-faint" />
            Haftalik sig&apos;im
            <span className="font-mono text-[12px] text-faint">({jamiSigim} soat)</span>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {KUN_QISQA.map((k, i) => (
              <div key={k} className="text-center">
                <p className="mb-1 text-[10.5px] text-faint">{k}</p>
                <input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={capacity[i]}
                  onChange={(e) => setCapacityDay(i, Number(e.target.value) || 0)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full rounded-md border border-border bg-transparent py-1.5 text-center font-mono text-[13px] outline-none focus:border-foreground"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatBox label="Jami sig'im" value={`${jamiSigim}s`} />
            <StatBox label="Bu hafta maqsad" value={`${jamiMaqsad}s`} />
            <StatBox label="Bo'sh vaqt" value={`${boshVaqt}s`} accent={boshVaqt > 0} />
          </div>
        </div>

        {/* Kategoriya foizlari + avto-taqsimlash */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-medium">Kategoriya maqsadi (%)</p>
            <span className={cn("font-mono text-[11px]", pctJami === 100 ? "text-faint" : "text-danger")}>
              Jami: {pctJami}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {KATEGORIYALAR.map((k) => (
              <div key={k.key} className="rounded-lg border border-border p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: CATEGORY_PALETTE[k.color].oklch }} />
                  <span className="text-[12px] font-medium">{k.key}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={categoryPct[k.key] ?? 0}
                  onChange={(e) => setCategoryPct(k.key, Number(e.target.value) || 0)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="mt-1.5 w-full rounded-md border border-border bg-transparent py-1 text-center font-mono text-[14px] outline-none focus:border-foreground"
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={avtomatikTaqsimlash}
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-[12.5px] font-medium text-background transition-opacity hover:opacity-90"
            >
              <Wand2 className="size-3.5" /> Avtomatik taqsimlash
            </button>
            {prevTargets && (
              <button
                type="button"
                onClick={bekorQilish}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[12.5px] font-medium text-muted transition-colors hover:text-foreground"
              >
                <Undo2 className="size-3.5" /> Bekor qilish
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loyihalar bo'yicha maqsad */}
      <div className="space-y-4">
        {GURUHLAR.map((g) => {
          const items = projects.filter((p) => (p.category ?? null) === g.key);
          if (!items.length) return null;
          return (
            <div key={g.key ?? "none"} className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: CATEGORY_PALETTE[g.color ?? "gray"].oklch }} />
                  <span className="text-[12.5px] font-semibold">{g.label}</span>
                </div>
                <span className="hidden text-[11px] text-faint sm:inline">{g.desc}</span>
              </div>
              <ul className="divide-y divide-border">
                {items.map((p) => {
                  const color = p.color ? CATEGORY_PALETTE[p.color].oklch : "var(--foreground)";
                  const hozir = focus[p.id] ?? 0;
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span
                        className="grid size-7 shrink-0 place-items-center rounded-md"
                        style={{ background: p.color ? colorWithAlpha(p.color, 0.14) : "var(--subtle)", color }}
                      >
                        <ProjectIcon k={p.icon} className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{p.title}</span>
                      <span className="hidden font-mono text-[11px] text-faint sm:inline">hozir: {hozir}s</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={p.targetHours ?? 0}
                          onChange={(e) => maqsadChange(p.id, Number(e.target.value) || 0)}
                          onFocus={(e) => e.currentTarget.select()}
                          className="w-16 rounded-md border border-border bg-transparent py-1 text-center font-mono text-[12px] outline-none focus:border-foreground"
                        />
                        <span className="text-[11px] text-faint">soat</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 px-2.5 py-2 text-center">
      <p
        className="font-mono text-[15px] font-semibold tabular-nums leading-none"
        style={{ color: accent ? "var(--accent)" : undefined }}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-tight text-faint">{label}</p>
    </div>
  );
}
