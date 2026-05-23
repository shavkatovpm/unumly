"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import type { QuickList } from "@/lib/tezkor-types";
import { cn } from "@/lib/utils";
import { playOnComplete } from "@/lib/sounds";
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

          {/* Items */}
          <ul className="space-y-1.5">
            {list.items.map((item) => (
              <ItemRow
                key={item.id}
                id={item.id}
                text={item.text}
                done={item.done}
                onToggle={() => {
                  // Mirror Bugun's TaskRow behaviour: chime when checking off,
                  // silent when un-checking.
                  if (!item.done) playOnComplete();
                  onToggleItem(item.id);
                }}
                onUpdate={(t) => onUpdateItemText(item.id, t)}
                onRemove={() => onRemoveItem(item.id)}
              />
            ))}
          </ul>

          {/* Add new item(s) */}
          <form
            onSubmit={submitAdd}
            className="mt-4 flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 transition-colors focus-within:border-border-strong"
          >
            <Plus className="size-3.5 shrink-0 text-faint" />
            <input
              ref={addRef}
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              onFocus={(e) => {
                // Pull the input above the on-screen keyboard. We defer so
                // the keyboard has time to start opening; without this, on
                // iOS the input often stays hidden until the user types.
                const el = e.currentTarget;
                window.setTimeout(() => {
                  el.scrollIntoView({ block: "center", behavior: "smooth" });
                }, 250);
              }}
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
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background hover:opacity-90"
          >
            Yopish
          </button>
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
}: {
  id: string;
  text: string;
  done: boolean;
  onToggle: () => void;
  onUpdate: (t: string) => void;
  onRemove: () => void;
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
    <li className="group/item flex items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-hover/50">
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
    </li>
  );
}
