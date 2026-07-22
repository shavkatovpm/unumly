"use client";

/** "Jadval" — har loyiha ustida necha marta ishlaganingizni sanaydi. Kun
 *  yoki soat kerak emas: har safar ishlaganingizda "+" bosasiz, belgi
 *  qo'shiladi. Ko'p belgi = ko'proq vaqt/e'tibor ketgan loyiha. */

import { Check, Plus } from "lucide-react";
import { useProjects } from "@/lib/projects-store";
import { useFocusCounts } from "@/lib/taqsimot-store";
import { CATEGORY_PALETTE, colorWithAlpha } from "@/lib/category-palette";
import { KATEGORIYALAR } from "@/lib/kategoriya";
import type { LoyihaKategoriya, Project } from "@/lib/types";
import { ProjectIcon } from "../loyiha-icons";

type Guruh = { key: LoyihaKategoriya | null; label: string; color: Project["color"] };

const GURUHLAR: Guruh[] = [
  ...KATEGORIYALAR.map((k) => ({ key: k.key, label: k.label, color: k.color })),
  { key: null, label: "Kategoriyasiz", color: "gray" },
];

export function LoyihaJadval() {
  const { projects } = useProjects();
  const { focus, inc, dec } = useFocusCounts();

  return (
    <div className="space-y-4">
      {GURUHLAR.map((g) => {
        const items = projects.filter((p) => (p.category ?? null) === g.key);
        if (!items.length) return null;
        return (
          <div key={g.key ?? "none"} className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <span className="size-2 rounded-full" style={{ background: CATEGORY_PALETTE[g.color ?? "gray"].oklch }} />
              <span className="text-[12.5px] font-semibold">{g.label}</span>
            </div>
            <ul className="divide-y divide-border">
              {items.map((p) => (
                <LoyihaSatri key={p.id} loyiha={p} soni={focus[p.id] ?? 0} onInc={() => inc(p.id)} onDec={() => dec(p.id)} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function LoyihaSatri({
  loyiha,
  soni,
  onInc,
  onDec,
}: {
  loyiha: Project;
  soni: number;
  onInc: () => void;
  onDec: () => void;
}) {
  const color = loyiha.color ? CATEGORY_PALETTE[loyiha.color].oklch : "var(--foreground)";
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span
        className="grid size-7 shrink-0 place-items-center rounded-md"
        style={{ background: loyiha.color ? colorWithAlpha(loyiha.color, 0.14) : "var(--subtle)", color }}
      >
        <ProjectIcon k={loyiha.icon} className="size-3.5" />
      </span>
      <span className="w-28 shrink-0 truncate text-[12.5px] font-medium sm:w-36">{loyiha.title}</span>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {Array.from({ length: soni }).map((_, i) =>
          i === soni - 1 ? (
            <button
              key={i}
              type="button"
              title="Bekor qilish"
              onClick={onDec}
              className="grid size-6 shrink-0 place-items-center rounded-full transition-transform hover:scale-90"
              style={{ background: color }}
            >
              <Check className="size-3.5 text-white" strokeWidth={3} />
            </button>
          ) : (
            <span key={i} className="grid size-6 shrink-0 place-items-center rounded-full" style={{ background: color }}>
              <Check className="size-3.5 text-white" strokeWidth={3} />
            </span>
          )
        )}
        <button
          type="button"
          onClick={onInc}
          title="Ishladim +1"
          className="grid size-6 shrink-0 place-items-center rounded-full border border-dashed border-faint text-faint transition-colors hover:border-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <span className="shrink-0 font-mono text-[12px] tabular-nums text-faint">{soni} marta</span>
    </li>
  );
}
