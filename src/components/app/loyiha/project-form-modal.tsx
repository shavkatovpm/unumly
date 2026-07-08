"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_KEYS, CATEGORY_PALETTE } from "@/lib/category-palette";
import type { CategoryColor, Project } from "@/lib/types";
import { Dialog } from "../widgets/dialog";
import { PROJECT_ICON_CHOICES, ProjectIcon, randomProjectIcon, type ProjectIconKey } from "../loyiha-icons";

/** Loyiha yaratish/tahrirlash formasi — nom + rang + ikon tanlash.
 *  Sidebar/mobil nav'dagi tezkor yaratishda ham, /loyiha sahifasida ham
 *  ishlatiladi. */
export function ProjectFormModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: Project;
  onClose: () => void;
  onSubmit: (input: { title: string; icon: ProjectIconKey; color: CategoryColor }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [icon, setIcon] = useState<ProjectIconKey>((initial?.icon as ProjectIconKey) ?? randomProjectIcon());
  const [color, setColor] = useState<CategoryColor>(initial?.color ?? "indigo");

  function submit() {
    const t = title.trim();
    if (!t) return;
    onSubmit({ title: t, icon, color });
  }

  return (
    <Dialog open onClose={onClose} mobilePlacement="center">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <p className="text-[16px] font-semibold tracking-[-0.01em]">{initial ? "Loyihani tahrirlash" : "Yangi loyiha"}</p>
        <button type="button" onClick={onClose} aria-label="Yopish" className="-mr-1 grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><X className="size-4" /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6">
        <div>
          <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">Nomi</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masalan: Instagram kontent"
            className="w-full border-b border-border bg-transparent pb-2 text-[16px] outline-none placeholder:text-faint focus:border-foreground"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">Rangi</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLOR_KEYS.map((k) => {
              const swatch = CATEGORY_PALETTE[k];
              const active = color === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setColor(k)}
                  title={swatch.label}
                  aria-label={swatch.label}
                  className={cn(
                    "relative grid size-8 place-items-center rounded-full transition-transform hover:scale-110",
                    active && "ring-2 ring-foreground ring-offset-2 ring-offset-surface"
                  )}
                  style={{ background: swatch.oklch }}
                >
                  {active && <Check className="size-3.5 text-background" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">Ikonasi</label>
          <div className="grid grid-cols-8 gap-1.5">
            {PROJECT_ICON_CHOICES.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setIcon(k)}
                className={cn(
                  "grid aspect-square place-items-center rounded-lg border transition-colors",
                  icon === k ? "border-accent bg-accent text-accent-ink" : "border-border text-muted hover:text-foreground"
                )}
              >
                <ProjectIcon k={k} className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-border px-5 py-4">
        <button
          type="button"
          onClick={submit}
          disabled={!title.trim()}
          className="w-full rounded-lg bg-foreground py-3 text-[14px] font-medium text-background transition-opacity disabled:opacity-30"
        >
          {initial ? "Saqlash" : "Yaratish"}
        </button>
      </div>
    </Dialog>
  );
}
