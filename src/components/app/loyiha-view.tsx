"use client";

/**
 * "Loyiha" bo'limi — to'liq workspace: har bir loyiha o'z Hujjatlar
 * (nested BlockNote sahifalari) va Tasklar (jadval) to'plamiga ega.
 * Bu yerda: loyihalar ro'yxati + yaratish/tahrirlash/o'chirish.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Pencil, Sparkles, Plus, Trash2 } from "lucide-react";
import { useProjects } from "@/lib/projects-store";
import { CATEGORY_PALETTE, colorWithAlpha } from "@/lib/category-palette";
import type { Project } from "@/lib/types";
import { useConfirmRemove } from "./widgets/confirm-dialog";
import { ListLoader } from "./widgets/list-loader";
import { useHydratedProjects } from "@/lib/projects-store";
import { ProjectIcon } from "./loyiha-icons";
import { ProjectFormModal } from "./loyiha/project-form-modal";

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

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-4 pb-24 pt-3 md:pb-6 lg:max-w-4xl xl:max-w-5xl">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em]">Loyiha</h1>
          <p className="mt-0.5 text-[12.5px] text-faint">
            Har biri o&apos;z hujjatlari va tasklariga ega alohida workspace
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="grid size-9 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
          aria-label="Yangi loyiha"
        >
          <Plus className="size-[18px]" />
        </button>
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
        <ul className="grid gap-2 lg:grid-cols-2">
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
      <button onClick={onEdit} aria-label="Tahrirlash" className="grid size-8 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"><Pencil className="size-3.5" /></button>
      <button onClick={onRemove} aria-label="O'chirish" className="grid size-8 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"><Trash2 className="size-3.5" /></button>
    </li>
  );
}

