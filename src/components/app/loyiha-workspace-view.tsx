"use client";

/**
 * Bitta loyiha ichidagi workspace — sarlavha (nom/rang/icon) + ikkita
 * qism: Hujjatlar (nested BlockNote sahifalar) va Tasklar (jadval).
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects, useHydratedProjects } from "@/lib/projects-store";
import { CATEGORY_PALETTE, colorWithAlpha } from "@/lib/category-palette";
import { ListLoader } from "./widgets/list-loader";
import { useConfirmRemove } from "./widgets/confirm-dialog";
import { HujjatlarPanel } from "./loyiha/hujjatlar-panel";
import { JadvalPanel } from "./loyiha/jadval-panel";
import { RejaView } from "./reja-view";
import { ProjectIcon } from "./loyiha-icons";
import { ProjectFormModal } from "./loyiha/project-form-modal";

type Tab = "reja" | "hujjatlar" | "tasklar";

export function LoyihaWorkspaceView({ projectId }: { projectId: string }) {
  const { projects, update, remove } = useProjects();
  const hydrated = useHydratedProjects();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("hujjatlar");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const project = projects.find((p) => p.id === projectId);

  const confirmItems = project ? [{ id: project.id, title: project.title }] : [];
  const { askRemove, confirmEl } = useConfirmRemove(
    confirmItems,
    (id) => { remove(id); router.push("/loyiha"); },
    {
      itemLabel: "Loyihani",
      description: '"{title}" va unga tegishli barcha hujjat/tasklar o\'chiriladi. Bu amalni qaytarib bo\'lmaydi.',
    }
  );

  if (!hydrated) {
    return <ListLoader />;
  }

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-[14px] font-medium text-foreground">Loyiha topilmadi</p>
        <p className="mt-1 text-[12.5px] text-muted">O&apos;chirilgan yoki mavjud emas.</p>
        <Link href="/loyiha" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground hover:opacity-70">
          <ArrowLeft className="size-3.5" /> Loyihalarga qaytish
        </Link>
      </div>
    );
  }

  const color = project.color ? CATEGORY_PALETTE[project.color].oklch : "var(--foreground)";

  return (
    <div className="flex h-full flex-col" style={{ height: "var(--tg-vh, 100vh)" }}>
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 md:px-6">
        <Link
          href="/loyiha"
          aria-label="Loyihalarga qaytish"
          className="grid size-8 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          data-open={menuOpen || undefined}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 pl-0.5 pr-1.5 text-left transition-colors hover:bg-hover"
        >
          <span
            className="grid size-8 shrink-0 place-items-center rounded-lg"
            style={{ background: project.color ? colorWithAlpha(project.color, 0.14) : "var(--subtle)", color }}
          >
            <ProjectIcon k={project.icon} className="size-4" />
          </span>
          <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.01em]">{project.title}</h1>
          <MoreVertical className="size-4 shrink-0 text-faint" />
        </button>
        <ProjectHeaderMenu
          open={menuOpen}
          triggerRef={triggerRef}
          onClose={() => setMenuOpen(false)}
          onEdit={() => { setMenuOpen(false); setEditing(true); }}
          onRemove={() => { setMenuOpen(false); askRemove(project.id); }}
        />

        <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-subtle/60 p-0.5 text-[12.5px]">
          <button
            type="button"
            onClick={() => setTab("reja")}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-all",
              tab === "reja" ? "bg-surface shadow-sm text-foreground" : "text-faint hover:text-muted"
            )}
          >
            Reja
          </button>
          <button
            type="button"
            onClick={() => setTab("hujjatlar")}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-all",
              tab === "hujjatlar" ? "bg-surface shadow-sm text-foreground" : "text-faint hover:text-muted"
            )}
          >
            Hujjatlar
          </button>
          <button
            type="button"
            onClick={() => setTab("tasklar")}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-all",
              tab === "tasklar" ? "bg-surface shadow-sm text-foreground" : "text-faint hover:text-muted"
            )}
          >
            Tasklar
          </button>
        </div>
      </header>

      <div className={cn("min-h-0 flex-1", tab === "reja" ? "overflow-hidden" : "overflow-y-auto")}>
        {tab === "reja" ? (
          <RejaView projectId={project.id} />
        ) : tab === "hujjatlar" ? (
          <HujjatlarPanel projectId={project.id} />
        ) : (
          <JadvalPanel projectId={project.id} />
        )}
      </div>

      {editing && (
        <ProjectFormModal
          initial={project}
          onClose={() => setEditing(false)}
          onSubmit={({ title, icon, color }) => {
            update(project.id, { title, icon, color });
            setEditing(false);
          }}
        />
      )}
      {confirmEl}
    </div>
  );
}

const HEADER_MENU_WIDTH = 176;

/** Loyiha sarlavhasi ustiga bosilganda chiqadigan Tahrirlash/O'chirish
 *  menyusi — ilovaning boshqa joylarida (sahifa kartalari, hujjat bloklari)
 *  ishlatilgan xuddi shu "⋯" tili bilan, portal orqali document.body'ga
 *  chiqariladi (aks holda ustki `overflow-y-auto` konteyner kesib
 *  tashlashi mumkin). */
function ProjectHeaderMenu({
  open,
  triggerRef,
  onClose,
  onEdit,
  onRemove,
}: {
  open: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    function place() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: Math.max(8, r.left) });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    }
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      onClose();
    }
    const tid = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(tid);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onClose, triggerRef]);

  if (!open || !mounted || !pos) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[100] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-2xl ring-1 ring-black/5"
      style={{ top: pos.top, left: pos.left, width: HEADER_MENU_WIDTH }}
    >
      <button
        type="button"
        role="menuitem"
        onClick={onEdit}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-hover"
      >
        <Pencil className="size-3.5 text-faint" /> Tahrirlash
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={onRemove}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-danger transition-colors hover:bg-hover"
      >
        <Trash2 className="size-3.5" /> O&apos;chirish
      </button>
    </div>,
    document.body
  );
}
