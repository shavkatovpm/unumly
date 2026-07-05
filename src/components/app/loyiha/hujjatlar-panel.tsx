"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ChevronDown, ChevronRight, FileText, Plus, Trash2, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePages } from "@/lib/pages-store";
import type { Page } from "@/lib/types";
import type { PartialBlock } from "@blocknote/core";
import { ListLoader } from "../widgets/list-loader";
import { useConfirmRemove } from "../widgets/confirm-dialog";

// BlockNote DOM'ni og'ir manipulyatsiya qiladi — faqat mijoz tomonda,
// SSR paytida hydration mos kelmasligining oldini olish uchun.
const BlockNoteEditor = dynamic(
  () => import("../widgets/block-note-editor").then((m) => m.BlockNoteEditor),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-lg bg-subtle/60" /> }
);

type TreeNode = { page: Page; children: TreeNode[] };

function buildTree(pages: Page[]): TreeNode[] {
  const byParent = new Map<string | null, Page[]>();
  for (const p of pages) {
    const arr = byParent.get(p.parentId) ?? [];
    arr.push(p);
    byParent.set(p.parentId, arr);
  }
  function attach(parentId: string | null): TreeNode[] {
    return (byParent.get(parentId) ?? [])
      .sort((a, b) => a.order - b.order)
      .map((page) => ({ page, children: attach(page.id) }));
  }
  return attach(null);
}

/** Loyihaning "Hujjatlar" ko'rinishi — cheksiz ichma-ich sahifalar daraxti,
 *  har biri BlockNote bilan tahrirlanadigan erkin hujjat (TZ, checklist,
 *  jadval — hammasi bitta joyda). */
export function HujjatlarPanel({ projectId }: { projectId: string }) {
  const { pages, hydrated, create, update, remove } = usePages(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [mobileView, setMobileView] = useState<"tree" | "editor">("tree");

  const tree = useMemo(() => buildTree(pages), [pages]);
  const selected = pages.find((p) => p.id === selectedId) ?? null;

  const confirmItems = pages.map((p) => ({ id: p.id, title: p.title }));
  const { askRemove, confirmEl } = useConfirmRemove(confirmItems, remove, {
    itemLabel: "Sahifani",
    description: '"{title}" va uning ichidagi barcha bola sahifalar o\'chiriladi.',
  });

  // Birinchi marta ochilganda — birinchi ildiz sahifani tanlaymiz va (agar
  // biror sahifa bo'lsa) mobil'da ham to'g'ridan-to'g'ri muharrirni ochamiz,
  // aks holda ro'yxatda "tanlangan" ko'rinib, lekin ochilmagan holat paydo bo'lardi.
  useEffect(() => {
    if (!hydrated) return;
    if (selectedId && pages.some((p) => p.id === selectedId)) return;
    const firstId = tree[0]?.page.id ?? null;
    setSelectedId(firstId);
    if (firstId) setMobileView("editor");
  }, [hydrated, tree, pages, selectedId]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function addPage(parentId: string | null) {
    const id = create({ parentId, title: "Nomsiz" });
    if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
    setSelectedId(id);
    setMobileView("editor");
  }

  if (!hydrated) return <ListLoader />;

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      {/* Sahifalar daraxti */}
      <div
        className={cn(
          "flex w-full shrink-0 flex-col overflow-y-auto border-border sm:w-64 sm:border-r",
          mobileView === "editor" && "hidden sm:flex"
        )}
      >
        <div className="flex items-center justify-between px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-faint">Hujjatlar</p>
          <button
            type="button"
            onClick={() => addPage(null)}
            aria-label="Yangi sahifa"
            className="grid size-6 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        {tree.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-[12.5px] text-faint">Hali sahifa yo&apos;q</p>
            <button
              type="button"
              onClick={() => addPage(null)}
              className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-foreground hover:opacity-70"
            >
              <Plus className="size-3.5" /> Birinchi sahifa
            </button>
          </div>
        ) : (
          <ul className="px-1.5 pb-2">
            {tree.map((node) => (
              <PageTreeItem
                key={node.page.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                expanded={expanded}
                onToggleExpand={toggleExpand}
                onSelect={(id) => { setSelectedId(id); setMobileView("editor"); }}
                onAddChild={addPage}
                onRemove={askRemove}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Tanlangan sahifa muharriri */}
      <div className={cn("min-w-0 flex-1 overflow-y-auto", mobileView === "tree" && "hidden sm:block")}>
        {selected ? (
          <div key={selected.id} className="mx-auto max-w-2xl px-4 py-5 sm:px-8">
            <button
              type="button"
              onClick={() => setMobileView("tree")}
              className="mb-3 flex items-center gap-1 text-[12.5px] text-faint hover:text-foreground sm:hidden"
            >
              <ArrowLeft className="size-3.5" /> Hujjatlar
            </button>
            <input
              value={selected.title}
              onChange={(e) => update(selected.id, { title: e.target.value })}
              placeholder="Nomsiz"
              className="w-full bg-transparent text-[26px] font-semibold tracking-[-0.015em] text-foreground outline-none placeholder:text-faint"
            />
            <div className="mt-4">
              <BlockNoteEditor
                key={selected.id}
                initialContent={selected.content as PartialBlock[] | null}
                onChange={(blocks) => update(selected.id, { content: blocks as unknown[] })}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <FileText className="size-8 text-faint" />
            <p className="mt-3 text-[13.5px] text-muted">Sahifa tanlang yoki yangisini yarating</p>
          </div>
        )}
      </div>
      {confirmEl}
    </div>
  );
}

function PageTreeItem({
  node,
  depth,
  selectedId,
  expanded,
  onToggleExpand,
  onSelect,
  onAddChild,
  onRemove,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onRemove: (id: string) => void;
}) {
  const { page, children } = node;
  const hasChildren = children.length > 0;
  const isOpen = expanded.has(page.id);
  const active = page.id === selectedId;

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md py-1.5 pr-1.5 text-[13.5px] transition-colors",
          active ? "bg-subtle text-foreground" : "text-muted hover:bg-hover hover:text-foreground"
        )}
        style={{ paddingLeft: 6 + depth * 16 }}
      >
        <button
          type="button"
          onClick={() => onToggleExpand(page.id)}
          className={cn("grid size-4 shrink-0 place-items-center rounded text-faint", !hasChildren && "invisible")}
        >
          {isOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </button>
        <button type="button" onClick={() => onSelect(page.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
          <FileText className="size-3.5 shrink-0 text-faint" />
          <span className="truncate">{page.title || "Nomsiz"}</span>
        </button>
        <button
          type="button"
          onClick={() => onAddChild(page.id)}
          aria-label="Bola sahifa qo'shish"
          className="grid size-5 shrink-0 place-items-center rounded text-faint opacity-0 transition-opacity hover:bg-hover hover:text-foreground group-hover:opacity-100"
        >
          <Plus className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(page.id)}
          aria-label="O'chirish"
          className="grid size-5 shrink-0 place-items-center rounded text-faint opacity-0 transition-opacity hover:bg-hover hover:text-danger group-hover:opacity-100"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
      {hasChildren && isOpen && (
        <ul>
          {children.map((child) => (
            <PageTreeItem
              key={child.page.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
