"use client";

import { useEffect, useRef, useState } from "react";
import { Check, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { useIdeas } from "@/lib/ideas-store";
import { useCategories } from "@/lib/categories-store";
import {
  CATEGORY_COLOR_KEYS,
  CATEGORY_PALETTE,
  colorWithAlpha,
} from "@/lib/category-palette";
import type { Category, CategoryColor, Idea } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Dialog } from "./widgets/dialog";
import { useConfirmRemove } from "./widgets/confirm-dialog";

export function RejaView() {
  const { ideas, create, update, toggleDone, remove } = useIdeas();
  const {
    categories,
    create: createCategory,
    update: updateCategory,
    remove: removeCategory,
  } = useCategories();

  const { askRemove, confirmEl } = useConfirmRemove(ideas, remove, {
    itemLabel: "G'oyani",
  });
  const { askRemove: askRemoveCat, confirmEl: confirmCatEl } = useConfirmRemove(
    categories,
    (id) => {
      // also delete ideas in this category to avoid orphans
      for (const i of ideas.filter((x) => x.categoryId === id)) {
        remove(i.id);
      }
      removeCategory(id);
    },
    { itemLabel: "Toifani" }
  );

  const [dialogState, setDialogState] = useState<
    { mode: "create" } | { mode: "edit"; cat: Category } | null
  >(null);

  const total = ideas.length;
  const done = ideas.filter((i) => i.done).length;

  function ideasOf(catId: string) {
    return ideas
      .filter((i) => i.categoryId === catId)
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-[13px] font-semibold tracking-[-0.01em]">Reja</h1>
          <span className="text-[12px] text-faint">
            G&apos;oyalarni toifa bo&apos;yicha ajrating
          </span>
        </div>
        {total > 0 && (
          <p className="font-mono text-[11px] tabular-nums text-faint">
            {done}/{total}
          </p>
        )}
      </header>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div
          className="grid h-full min-w-min gap-3 p-4"
          style={{
            gridTemplateColumns: `repeat(${categories.length + 1}, minmax(260px, 1fr))`,
          }}
        >
          {categories.map((cat) => (
            <CategoryColumn
              key={cat.id}
              cat={cat}
              ideas={ideasOf(cat.id)}
              onAdd={(title) => create({ title, categoryId: cat.id })}
              onMove={(id, to) => update(id, { categoryId: to })}
              onToggle={toggleDone}
              onRemove={askRemove}
              onEditTitle={(id, title) => update(id, { title })}
              onEditCat={() => setDialogState({ mode: "edit", cat })}
              onRemoveCat={() => askRemoveCat(cat.id)}
              otherCategories={categories.filter((c) => c.id !== cat.id)}
            />
          ))}

          {/* Add new category column */}
          <div className="flex min-h-0 items-start pt-1">
            <button
              type="button"
              onClick={() => setDialogState({ mode: "create" })}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-subtle/30 px-4 py-6 text-[13px] text-faint transition-colors hover:border-border-strong hover:bg-subtle/60 hover:text-muted"
            >
              <Plus className="size-4" />
              Yangi toifa
            </button>
          </div>
        </div>
      </div>

      <CategoryDialog
        state={dialogState}
        onClose={() => setDialogState(null)}
        onCreate={(input) => {
          createCategory(input);
          setDialogState(null);
        }}
        onUpdate={(id, patch) => {
          updateCategory(id, patch);
          setDialogState(null);
        }}
      />

      {confirmEl}
      {confirmCatEl}
    </div>
  );
}

/* ─────────────── Column ─────────────── */

function CategoryColumn({
  cat,
  ideas,
  onAdd,
  onMove,
  onToggle,
  onRemove,
  onEditTitle,
  onEditCat,
  onRemoveCat,
  otherCategories,
}: {
  cat: Category;
  ideas: Idea[];
  onAdd: (title: string) => void;
  onMove: (id: string, to: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEditTitle: (id: string, title: string) => void;
  onEditCat: () => void;
  onRemoveCat: () => void;
  otherCategories: Category[];
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuPopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (menuPopRef.current?.contains(t)) return;
      if (menuBtnRef.current?.contains(t)) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  function submit() {
    const t = draft.trim();
    if (t) onAdd(t);
    setDraft("");
    setAdding(false);
  }

  const color = CATEGORY_PALETTE[cat.color].oklch;

  return (
    <section
      className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-x border-b border-border bg-surface shadow-[0_1px_0_var(--border)]"
      style={{ borderTop: `4px solid ${color}` }}
    >
      {/* Header */}
      <header className="relative flex shrink-0 items-center justify-between border-b border-border bg-subtle/30 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: color }}
          />
          <h2 className="truncate text-[12.5px] font-semibold tracking-[-0.01em]">
            {cat.label}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="font-mono text-[10.5px] tabular-nums text-faint">
            {ideas.length}
          </span>
          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toifa amallari"
            className="grid size-5 place-items-center rounded text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            <MoreHorizontal className="size-3" />
          </button>
        </div>
        {menuOpen && (
          <div
            ref={menuPopRef}
            className="fade-in absolute right-2 top-full z-10 mt-1 w-36 overflow-hidden rounded-md border border-border bg-surface shadow-lg"
          >
            <button
              type="button"
              onClick={() => {
                onEditCat();
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-muted hover:bg-hover hover:text-foreground"
            >
              <Pencil className="size-3" />
              Tahrirlash
            </button>
            <button
              type="button"
              onClick={() => {
                onRemoveCat();
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-1.5 text-left text-[12px] text-muted hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="size-3" />
              O&apos;chirish
            </button>
          </div>
        )}
      </header>

      {/* Items */}
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {ideas.length === 0 && !adding && (
          <p className="py-6 text-center text-[11px] text-faint">— bo&apos;sh —</p>
        )}

        {ideas.map((i) => (
          <IdeaCard
            key={i.id}
            idea={i}
            categoryColor={cat.color}
            onToggle={() => onToggle(i.id)}
            onRemove={() => onRemove(i.id)}
            onEditTitle={(t) => onEditTitle(i.id, t)}
            onMoveTo={(to) => onMove(i.id, to)}
            otherCategories={otherCategories}
          />
        ))}

        {adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="rounded-md border border-border bg-background p-2"
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
                if (e.key === "Escape") {
                  setDraft("");
                  setAdding(false);
                }
              }}
              onBlur={() => {
                if (draft.trim()) submit();
                else setAdding(false);
              }}
              rows={2}
              placeholder="Yangi g'oya... Enter bilan saqlash"
              className="w-full resize-none bg-transparent text-[12px] leading-snug placeholder:text-faint focus:outline-none"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-1.5 text-[11px] text-faint transition-colors hover:border-border-strong hover:text-muted"
          >
            <Plus className="size-3" /> Qo&apos;shish
          </button>
        )}
      </div>
    </section>
  );
}

/* ─────────────── Idea card ─────────────── */

function IdeaCard({
  idea,
  categoryColor,
  onToggle,
  onRemove,
  onEditTitle,
  onMoveTo,
  otherCategories,
}: {
  idea: Idea;
  categoryColor: CategoryColor;
  onToggle: () => void;
  onRemove: () => void;
  onEditTitle: (title: string) => void;
  onMoveTo: (to: string) => void;
  otherCategories: Category[];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(idea.title);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function save() {
    const t = draft.trim();
    if (t && t !== idea.title) onEditTitle(t);
    setEditing(false);
  }

  const accentColor = CATEGORY_PALETTE[categoryColor].oklch;

  return (
    <article
      className={cn(
        "group rounded-md border border-border bg-background p-2 transition-shadow hover:shadow-sm",
        idea.done && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-label={idea.done ? "Bekor qilish" : "Bajarildi"}
          className={cn(
            "mt-0.5 grid size-[14px] shrink-0 place-items-center rounded border transition-all",
            idea.done
              ? "check-fill"
              : "border-border-strong hover:border-accent"
          )}
          style={
            idea.done
              ? { background: accentColor, borderColor: accentColor }
              : undefined
          }
        >
          {idea.done && (
            <Check className="size-2 text-background check-pop" strokeWidth={4} />
          )}
        </button>

        {editing ? (
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                save();
              }
              if (e.key === "Escape") {
                setDraft(idea.title);
                setEditing(false);
              }
            }}
            onBlur={save}
            rows={2}
            className="flex-1 resize-none bg-transparent text-[12px] leading-snug focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(idea.title);
              setEditing(true);
            }}
            className="min-w-0 flex-1 cursor-text text-left"
          >
            <p
              className={cn(
                "text-[12px] leading-snug",
                idea.done && "line-through"
              )}
            >
              {idea.title}
            </p>
          </button>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {otherCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onMoveTo(c.id)}
              className="size-3 rounded-full ring-1 ring-border transition-transform hover:scale-125"
              style={{ background: CATEGORY_PALETTE[c.color].oklch }}
              title={`${c.label}ga ko'chirish`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="O'chirish"
          className="grid size-5 place-items-center rounded text-faint opacity-0 transition-colors hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </article>
  );
}

/* ─────────────── Category dialog (create/edit) ─────────────── */

function CategoryDialog({
  state,
  onClose,
  onCreate,
  onUpdate,
}: {
  state: { mode: "create" } | { mode: "edit"; cat: Category } | null;
  onClose: () => void;
  onCreate: (input: { label: string; color: CategoryColor }) => void;
  onUpdate: (id: string, patch: { label: string; color: CategoryColor }) => void;
}) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState<CategoryColor>("blue");

  useEffect(() => {
    if (state?.mode === "edit") {
      setLabel(state.cat.label);
      setColor(state.cat.color);
    } else if (state?.mode === "create") {
      setLabel("");
      setColor("blue");
    }
  }, [state]);

  if (!state) return null;
  const isEdit = state.mode === "edit";

  function submit() {
    const t = label.trim();
    if (!t) return;
    if (isEdit && state) {
      const editState = state as { mode: "edit"; cat: Category };
      onUpdate(editState.cat.id, { label: t, color });
    } else {
      onCreate({ label: t, color });
    }
  }

  return (
    <Dialog open={!!state} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            {isEdit ? "Toifani tahrirlash" : "Yangi toifa"}
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

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
              Nomi
            </label>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Masalan: Oila, Sport, Sayohat..."
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[13.5px] placeholder:text-faint focus:border-border-strong focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
              Rangi
            </label>
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
                    {active && (
                      <Check className="size-3.5 text-background" strokeWidth={3} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div>
            <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
              Ko&apos;rinishi
            </p>
            <div
              className="flex items-center gap-2 rounded-md border-x border-b border-border bg-surface px-3 py-2"
              style={{ borderTop: `4px solid ${CATEGORY_PALETTE[color].oklch}` }}
            >
              <span
                className="size-2 rounded-full"
                style={{ background: CATEGORY_PALETTE[color].oklch }}
              />
              <span className="text-[12.5px] font-semibold">
                {label.trim() || "Toifa nomi"}
              </span>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-subtle/30 px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[12px] text-muted transition-colors hover:bg-hover hover:text-foreground"
          >
            Bekor
          </button>
          <button
            type="submit"
            disabled={!label.trim()}
            className={cn(
              "rounded-md px-3 py-1.5 text-[12px] font-medium transition-opacity",
              label.trim()
                ? "bg-foreground text-background hover:opacity-90"
                : "cursor-not-allowed bg-foreground/40 text-background"
            )}
          >
            {isEdit ? "Saqlash" : "Qo'shish"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
