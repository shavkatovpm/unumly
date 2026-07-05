"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, ChevronRight, FileText, Plus, Trash2, X } from "lucide-react";
import { usePages } from "@/lib/pages-store";
import type { Page } from "@/lib/types";
import type { PartialBlock } from "@blocknote/core";
import { Dialog } from "../widgets/dialog";
import { ListLoader } from "../widgets/list-loader";
import { useConfirmRemove } from "../widgets/confirm-dialog";

// BlockNote DOM'ni og'ir manipulyatsiya qiladi — faqat mijoz tomonda,
// SSR paytida hydration mos kelmasligining oldini olish uchun.
const BlockNoteEditor = dynamic(
  () => import("../widgets/block-note-editor").then((m) => m.BlockNoteEditor),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-lg bg-subtle/60" /> }
);

/** Loyihaning "Hujjatlar" ko'rinishi — cheksiz ichma-ich sahifalar, har biri
 *  BlockNote bilan tahrirlanadigan erkin hujjat (TZ, checklist, jadval —
 *  hammasi bitta joyda). Notion'dagi doimiy chap-panel/daraxt o'rniga —
 *  ilovaning o'z uslubi: kartalar ro'yxati + to'liq ekran sheet (xuddi
 *  TaskDetail/HabitDetailSheet kabi). Bo'lim sahifalar sheet ichida kichik
 *  kartalar sifatida ko'rinadi; ustiga bosilsa ichma-ich sheet ochiladi. */
export function HujjatlarPanel({ projectId }: { projectId: string }) {
  const { pages, hydrated, create, update, remove } = usePages(projectId);
  const [openId, setOpenId] = useState<string | null>(null);

  const roots = pages.filter((p) => !p.parentId).sort((a, b) => a.order - b.order);
  const open = pages.find((p) => p.id === openId) ?? null;

  const confirmItems = pages.map((p) => ({ id: p.id, title: p.title }));
  const { askRemove, confirmEl } = useConfirmRemove(confirmItems, remove, {
    itemLabel: "Sahifani",
    description: '"{title}" va uning ichidagi barcha bo\'lim sahifalar o\'chiriladi.',
  });

  function childCount(id: string) {
    return pages.filter((p) => p.parentId === id).length;
  }

  function addRootPage() {
    const id = create({ parentId: null, title: "Nomsiz" });
    setOpenId(id);
  }

  if (!hydrated) return <ListLoader />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-faint">Hujjatlar</p>
        <button
          type="button"
          onClick={addRootPage}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-medium text-faint transition-colors hover:bg-hover hover:text-foreground"
        >
          <Plus className="size-3.5" /> Yangi sahifa
        </button>
      </div>

      {roots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <FileText className="mx-auto size-7 text-faint" />
          <p className="mt-3 text-[13.5px] font-medium text-foreground">Hali sahifa yo&apos;q</p>
          <p className="mx-auto mt-1 max-w-xs text-[12.5px] text-muted">
            TZ, mavzular ro&apos;yxati, checklist, jadval — hammasi shu yerda.
          </p>
          <button
            type="button"
            onClick={addRootPage}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
          >
            <Plus className="size-3.5" /> Birinchi sahifa
          </button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {roots.map((p) => {
            const count = childCount(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setOpenId(p.id)}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-left transition-colors hover:border-border-strong hover:bg-hover"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-subtle text-faint">
                  <FileText className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{p.title || "Nomsiz"}</span>
                  {count > 0 && (
                    <span className="text-[11.5px] text-faint">{count} bo&apos;lim sahifa</span>
                  )}
                </span>
                <ChevronRight className="size-4 shrink-0 text-faint" />
              </button>
            );
          })}
        </div>
      )}

      {open && (
        <PageSheet
          page={open}
          pages={pages}
          onClose={() => setOpenId(null)}
          onUpdate={update}
          onCreateChild={create}
          onRemove={askRemove}
        />
      )}
      {confirmEl}
    </div>
  );
}

function PageSheet({
  page,
  pages,
  onClose,
  onUpdate,
  onCreateChild,
  onRemove,
}: {
  page: Page;
  pages: Page[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Page>) => void;
  onCreateChild: (input: { parentId?: string | null; title?: string }) => string;
  onRemove: (id: string) => void;
}) {
  const [openChildId, setOpenChildId] = useState<string | null>(null);
  const children = pages.filter((p) => p.parentId === page.id).sort((a, b) => a.order - b.order);
  const openChild = children.find((c) => c.id === openChildId) ?? null;

  function addChild() {
    const id = onCreateChild({ parentId: page.id, title: "Nomsiz" });
    setOpenChildId(id);
  }

  return (
    <Dialog open onClose={onClose} mobilePlacement="bottom" className="max-w-2xl sm:min-h-[75vh]">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-[12.5px] text-faint transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Orqaga
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onRemove(page.id)}
            aria-label="O'chirish"
            className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-danger"
          >
            <Trash2 className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
        <input
          value={page.title}
          onChange={(e) => onUpdate(page.id, { title: e.target.value })}
          placeholder="Nomsiz"
          className="w-full bg-transparent text-[24px] font-semibold tracking-[-0.015em] text-foreground outline-none placeholder:text-faint"
        />
        <div className="mt-4">
          <BlockNoteEditor
            key={page.id}
            initialContent={page.content as PartialBlock[] | null}
            onChange={(blocks) => onUpdate(page.id, { content: blocks as unknown[] })}
          />
        </div>

        <div className="mt-8 border-t border-border pt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-faint">
            Bo&apos;lim sahifalar
          </p>
          <div className="space-y-1.5">
            {children.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setOpenChildId(c.id)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-hover"
              >
                <FileText className="size-3.5 shrink-0 text-faint" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{c.title || "Nomsiz"}</span>
                <ChevronRight className="size-3.5 shrink-0 text-faint" />
              </button>
            ))}
            <button
              type="button"
              onClick={addChild}
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-[12.5px] text-faint transition-colors hover:border-border-strong hover:text-foreground"
            >
              <Plus className="size-3.5" /> Bo&apos;lim sahifa qo&apos;shish
            </button>
          </div>
        </div>
      </div>

      {openChild && (
        <PageSheet
          page={openChild}
          pages={pages}
          onClose={() => setOpenChildId(null)}
          onUpdate={onUpdate}
          onCreateChild={onCreateChild}
          onRemove={onRemove}
        />
      )}
    </Dialog>
  );
}
