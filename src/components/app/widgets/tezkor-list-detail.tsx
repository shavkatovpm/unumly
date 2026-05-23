"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import type { QuickList } from "@/lib/tezkor-types";
import { cn } from "@/lib/utils";
import { playOnComplete } from "@/lib/sounds";
import { useDragReorder } from "@/lib/use-drag-reorder";
import { Dialog } from "./dialog";

export function TezkorListDetail({
  list,
  open,
  onClose,
  onRename,
  onAddItems,
  onToggleItem,
  onUpdateItemText,
  onRemoveItem,
  onRemoveList,
  onCompleteList,
  onReorderItems,
}: {
  list: QuickList | null;
  open: boolean;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
  onAddItems: (id: string, texts: string[]) => void;
  onToggleItem: (itemId: string) => void;
  onUpdateItemText: (itemId: string, text: string) => void;
  onRemoveItem: (itemId: string) => void;
  onRemoveList: (id: string) => void;
  onCompleteList: (id: string) => void;
  onReorderItems: (listId: string, orderedIds: string[]) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [adding, setAdding] = useState("");
  const addRef = useRef<HTMLInputElement>(null);

  // Reset transient state when list changes (e.g. switched task)
  useEffect(() => {
    if (!list) return;
    setEditingName(false);
    setNameDraft(list.name);
    setAdding("");
  }, [list?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag-and-drop reorder for items within this list. The handler computes
  // the new id ordering (dragged inserted before drop target) and persists
  // via the store's reorderItems action.
  const items = list?.items ?? [];
  const drag = useDragReorder(items, (draggedId, beforeId) => {
    const ids = items.map((i) => i.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = beforeId ? ids.indexOf(beforeId) : ids.length;
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    const next = ids.slice();
    next.splice(fromIdx, 1);
    next.splice(fromIdx < toIdx ? toIdx - 1 : toIdx, 0, draggedId);
    if (list) onReorderItems(list.id, next);
  });

  if (!list) return null;

  const total = list.items.length;
  const done = list.items.filter((i) => i.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  function commitName() {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== list!.name) {
      onRename(list!.id, trimmed);
    } else {
      setNameDraft(list!.name);
    }
    setEditingName(false);
  }

  function submitAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const texts = adding
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (texts.length === 0) return;
    onAddItems(list!.id, texts);
    setAdding("");
    requestAnimationFrame(() => addRef.current?.focus());
  }

  function confirmDelete() {
    if (typeof window !== "undefined" && !window.confirm("Ro'yhat o'chirilsinmi? (30 kun davomida tiklash mumkin)")) return;
    onRemoveList(list!.id);
  }

  return (
    <Dialog open={open} onClose={onClose} mobilePlacement="top" className="max-w-lg">
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            Tezkor ro&apos;yhat
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {/* Name (inline editable) */}
          {editingName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                commitName();
              }}
              className="mb-3"
            >
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setNameDraft(list.name);
                    setEditingName(false);
                  }
                }}
                autoFocus
                className="w-full bg-transparent text-[20px] font-semibold tracking-[-0.015em] text-foreground focus:outline-none sm:text-[22px]"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameDraft(list.name);
                setEditingName(true);
              }}
              className="group/name mb-3 flex w-full items-start gap-2 text-left"
            >
              <h2 className="flex-1 text-[20px] font-semibold leading-tight tracking-[-0.015em] text-foreground sm:text-[22px]">
                {list.name}
              </h2>
              <Pencil className="mt-1 size-3.5 shrink-0 text-faint opacity-0 transition-opacity group-hover/name:opacity-100" />
            </button>
          )}

          {/* Progress + count */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-subtle">
              <div
                className="h-full bg-foreground transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="shrink-0 font-mono text-[11.5px] tabular-nums text-faint">
              {done}/{total} · {pct}%
            </p>
          </div>

          {/* Add new item(s) — at the top so it stays above the keyboard
              and is always reachable without scrolling past existing items. */}
          <form
            onSubmit={submitAdd}
            className="mb-3 flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 transition-colors focus-within:border-border-strong"
          >
            <Plus className="size-3.5 shrink-0 text-faint" />
            <input
              ref={addRef}
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              placeholder="Yangi narsa qo'shish…"
              className="flex-1 bg-transparent text-[14px] placeholder:text-faint focus:outline-none"
            />
            {adding.trim() && (
              <button
                type="submit"
                aria-label="Qo'shish"
                className="grid size-7 place-items-center rounded-md bg-foreground text-background hover:opacity-90"
              >
                <Check className="size-3.5" />
              </button>
            )}
          </form>

          {/* Items */}
          <ul className="space-y-1.5">
            {list.items.map((item) => (
              <li
                key={item.id}
                onDragOver={(e) => drag.over(e, item.id)}
                onDrop={(e) => drag.drop(e, item.id)}
                className={cn(
                  "transition-[opacity,box-shadow] duration-150",
                  drag.draggingId === item.id && "opacity-40",
                  drag.overId === item.id &&
                    drag.draggingId !== item.id &&
                    "shadow-[inset_0_2px_0_var(--foreground)]"
                )}
              >
                <ItemRow
                  id={item.id}
                  text={item.text}
                  done={item.done}
                  onToggle={() => {
                    // Mirror Bugun's TaskRow behaviour: chime when checking
                    // off, silent when un-checking.
                    if (!item.done) playOnComplete();
                    onToggleItem(item.id);
                  }}
                  onUpdate={(t) => onUpdateItemText(item.id, t)}
                  onRemove={() => onRemoveItem(item.id)}
                  onDragStart={(e) => drag.start(e, item.id)}
                  onDragEnd={drag.end}
                />
              </li>
            ))}
          </ul>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-border bg-subtle/30 px-4 py-2.5">
          <button
            type="button"
            onClick={confirmDelete}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-faint transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-3" />
            O&apos;chirish
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playOnComplete();
                onCompleteList(list.id);
                onClose();
              }}
              className="flex items-center gap-1.5 rounded-md border border-accent bg-accent-soft px-3 py-1.5 text-[12px] font-medium text-accent-ink transition-colors hover:bg-accent hover:text-background"
            >
              <CheckCircle2 className="size-3.5" />
              Bajardim
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background hover:opacity-90"
            >
              Yopish
            </button>
          </div>
        </footer>
      </div>
    </Dialog>
  );
}

function ItemRow({
  id: _id,
  text,
  done,
  onToggle,
  onUpdate,
  onRemove,
  onDragStart,
  onDragEnd,
}: {
  id: string;
  text: string;
  done: boolean;
  onToggle: () => void;
  onUpdate: (t: string) => void;
  onRemove: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  useEffect(() => {
    if (!editing) setDraft(text);
  }, [text, editing]);

  function commit() {
    const next = draft.trim();
    if (next && next !== text) onUpdate(next);
    else setDraft(text);
    setEditing(false);
  }

  return (
    <div className="group/item flex items-center gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-hover/50">
      {/* Drag handle (left) — only the handle starts drag, so tapping the
          text still enters edit mode without ambiguity. */}
      <button
        type="button"
        draggable={!!onDragStart}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        aria-label="Tartibni o'zgartirish"
        title="Tortib joyini o'zgartiring"
        className="grid size-6 shrink-0 cursor-grab place-items-center rounded text-faint/60 transition-colors active:cursor-grabbing hover:text-muted"
      >
        <GripVertical className="size-3.5" />
      </button>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              setDraft(text);
              setEditing(false);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-[14px] focus:outline-none"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={cn(
            "min-w-0 flex-1 cursor-text text-[14px] leading-relaxed",
            done ? "text-faint line-through decoration-faint/60" : "text-foreground"
          )}
        >
          {text}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="O'chirish"
        className="grid size-7 shrink-0 place-items-center rounded text-faint opacity-0 transition-colors hover:bg-danger-soft hover:text-danger group-hover/item:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onToggle}
        aria-label={done ? "Bekor qilish" : "Bajarildi"}
        className="grid size-[22px] shrink-0 place-items-center rounded-md border transition-all duration-200"
        style={{
          borderColor: done ? "var(--accent)" : "var(--border-strong)",
          backgroundColor: done ? "var(--accent)" : "transparent",
        }}
      >
        {done && <Check className="size-[14px] text-background" strokeWidth={5} />}
      </button>
    </div>
  );
}
