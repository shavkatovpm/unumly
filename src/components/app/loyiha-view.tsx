"use client";

/**
 * "Loyiha" bo'limi — to'liq workspace: har bir loyiha o'z Hujjatlar
 * (nested BlockNote sahifalari) va Tasklar (jadval) to'plamiga ega.
 * Bu yerda: loyihalar ro'yxati + yaratish/tahrirlash/o'chirish.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects } from "@/lib/projects-store";
import { CATEGORY_COLOR_KEYS, CATEGORY_PALETTE, colorWithAlpha } from "@/lib/category-palette";
import type { CategoryColor, Project } from "@/lib/types";
import { Dialog } from "./widgets/dialog";
import { useConfirmRemove } from "./widgets/confirm-dialog";
import { ListLoader } from "./widgets/list-loader";
import { useHydratedProjects } from "@/lib/projects-store";
import { PROJECT_ICON_CHOICES, ProjectIcon, randomProjectIcon, type ProjectIconKey } from "./loyiha-icons";

const MAX_PROJECTS = 5;

export function LoyihaView() {
  const { projects, create, update, remove } = useProjects();
  const hydrated = useHydratedProjects();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const confirmItems = projects.map((p) => ({ id: p.id, title: p.title }));
  const { askRemove, confirmEl } = useConfirmRemove(confirmItems, remove, {
    itemLabel: "Loyihani",
    description: '"{title}" va unga tegishli barcha hujjat/tasklar o\'chiriladi. Bu amalni qaytarib bo\'lmaydi.',
  });

  const atLimit = projects.length >= MAX_PROJECTS;

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-4 pb-24 pt-3 md:pb-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em]">Loyiha</h1>
          <p className="mt-0.5 text-[12.5px] text-faint">
            Har biri o&apos;z hujjatlari va tasklariga ega alohida workspace
          </p>
        </div>
        {!atLimit && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="grid size-9 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
            aria-label="Yangi loyiha"
          >
            <Plus className="size-[18px]" />
          </button>
        )}
      </header>

      {!hydrated ? (
        <ListLoader />
      ) : projects.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-subtle text-faint">
            <Sparkles className="size-6" />
          </span>
          <p className="mt-4 text-[15px] font-medium text-foreground">Hali loyiha yo&apos;q</p>
          <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-muted">
            Instagram mavzulari, TZ hujjatlar, tasklar jadvali — har biri uchun
            alohida loyiha oching.
          </p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2.5 text-[13.5px] font-medium text-background transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            Birinchi loyihani yarating
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              onOpen={() => router.push(`/loyiha/${p.id}`)}
              onEdit={() => setEditing(p)}
              onRemove={() => askRemove(p.id)}
            />
          ))}
        </ul>
      )}

      {atLimit && projects.length > 0 && (
        <p className="mt-3 text-center text-[11.5px] text-faint">
          Bir vaqtda ko&apos;pi bilan {MAX_PROJECTS} ta loyiha bo&apos;lishi mumkin.
        </p>
      )}

      {showAdd && (
        <ProjectFormModal
          onClose={() => setShowAdd(false)}
          onSubmit={({ title, icon, color }) => {
            create({ title, icon, color });
            setShowAdd(false);
          }}
        />
      )}
      {editing && (
        <ProjectFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={({ title, icon, color }) => {
            update(editing.id, { title, icon, color });
            setEditing(null);
          }}
        />
      )}
      {confirmEl}
    </div>
  );
}

function ProjectRow({
  project,
  onOpen,
  onEdit,
  onRemove,
}: {
  project: Project;
  onOpen: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const color = project.color ? CATEGORY_PALETTE[project.color].oklch : "var(--foreground)";
  return (
    <li className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-border-strong">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-xl"
          style={{ background: project.color ? colorWithAlpha(project.color, 0.14) : "var(--subtle)", color }}
        >
          <ProjectIcon k={project.icon} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{project.title}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
      </button>
      <button onClick={onEdit} aria-label="Tahrirlash" className="grid size-8 shrink-0 place-items-center rounded-md text-faint opacity-0 transition-opacity hover:bg-hover hover:text-foreground group-hover:opacity-100"><Pencil className="size-3.5" /></button>
      <button onClick={onRemove} aria-label="O'chirish" className="grid size-8 shrink-0 place-items-center rounded-md text-faint opacity-0 transition-opacity hover:bg-hover hover:text-danger group-hover:opacity-100"><Trash2 className="size-3.5" /></button>
    </li>
  );
}

function ProjectFormModal({
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
