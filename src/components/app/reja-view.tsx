"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  LayoutGrid,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useIdeas } from "@/lib/ideas-store";
import { useCategories } from "@/lib/categories-store";
import { CATEGORY_COLOR_KEYS, CATEGORY_PALETTE } from "@/lib/category-palette";
import type { Category, CategoryColor, Idea } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Dialog } from "./widgets/dialog";
import { useConfirmRemove } from "./widgets/confirm-dialog";
import { IdeaDetail } from "./widgets/idea-detail";

const DONE_DELAY_MS = 700;
const VIEW_KEY = "unumly:reja:view";
const SORT_KEY = "unumly:reja:sort";
const NEW_ITEM_MS = 500;

type SortOrder = "new" | "old";

function colorAlpha(c: string, a: number) {
  return c.replace(")", ` / ${a})`);
}

/* ════════════════════════════════════════════════════════════
   Main view
   ════════════════════════════════════════════════════════════ */

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
    categories.map((c) => ({ id: c.id, title: c.label })),
    (id) => {
      for (const i of ideas.filter((x) => x.categoryId === id)) remove(i.id);
      removeCategory(id);
    },
    { itemLabel: "Toifani" }
  );

  const [view, setView] = useState<"tab" | "kanban">("tab");
  const [sortOrder, setSortOrder] = useState<SortOrder>("new");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem(VIEW_KEY);
    if (v === "tab" || v === "kanban") setView(v);
    const s = window.localStorage.getItem(SORT_KEY);
    if (s === "new" || s === "old") setSortOrder(s);
  }, []);
  function setViewPersist(v: "tab" | "kanban") {
    setView(v);
    if (typeof window !== "undefined") window.localStorage.setItem(VIEW_KEY, v);
  }
  function setSortPersist(s: SortOrder) {
    setSortOrder(s);
    if (typeof window !== "undefined") window.localStorage.setItem(SORT_KEY, s);
  }

  // Track newly-created idea for animation
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const newTimerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (newTimerRef.current) window.clearTimeout(newTimerRef.current);
  }, []);
  function handleCreate(title: string, categoryId: string) {
    const id = create({ title, categoryId });
    setJustCreatedId(id);
    if (newTimerRef.current) window.clearTimeout(newTimerRef.current);
    newTimerRef.current = window.setTimeout(() => setJustCreatedId(null), NEW_ITEM_MS);
  }

  const [dialogState, setDialogState] = useState<
    { mode: "create" } | { mode: "edit"; cat: Category } | null
  >(null);

  // Idea detail dialog
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailIdea = detailId ? ideas.find((i) => i.id === detailId) ?? null : null;

  const total = ideas.length;
  const done = ideas.filter((i) => i.done).length;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-3">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] sm:text-[13px]">Reja</h1>
          <ViewSwitcher value={view} onChange={setViewPersist} />
          <SortToggle value={sortOrder} onChange={setSortPersist} />
        </div>
        {total > 0 && (
          <p className="font-mono text-[11px] tabular-nums text-faint">
            {done}/{total}
          </p>
        )}
      </header>

      {categories.length === 0 ? (
        <EmptyState onCreate={() => setDialogState({ mode: "create" })} />
      ) : view === "tab" ? (
        <TabView
          ideas={ideas}
          categories={categories}
          sortOrder={sortOrder}
          justCreatedId={justCreatedId}
          onCreate={handleCreate}
          onUpdate={(id, patch) => update(id, patch)}
          onToggle={toggleDone}
          onRemove={askRemove}
          onOpen={setDetailId}
          onCategoryNew={() => setDialogState({ mode: "create" })}
          onCategoryEdit={(c) => setDialogState({ mode: "edit", cat: c })}
          onCategoryDelete={(id) => askRemoveCat(id)}
        />
      ) : (
        <KanbanView
          ideas={ideas}
          categories={categories}
          sortOrder={sortOrder}
          justCreatedId={justCreatedId}
          onCreate={handleCreate}
          onUpdate={(id, patch) => update(id, patch)}
          onToggle={toggleDone}
          onRemove={askRemove}
          onOpen={setDetailId}
          onCategoryNew={() => setDialogState({ mode: "create" })}
          onCategoryEdit={(c) => setDialogState({ mode: "edit", cat: c })}
          onCategoryDelete={(id) => askRemoveCat(id)}
        />
      )}

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

      <IdeaDetail
        idea={detailIdea}
        categories={categories}
        ideas={ideas}
        open={!!detailIdea}
        onClose={() => setDetailId(null)}
        onUpdate={update}
        onRemove={(id) => {
          askRemove(id);
          setDetailId(null);
        }}
        onToggleDone={toggleDone}
      />

      {confirmEl}
      {confirmCatEl}
    </div>
  );
}

/* ─── View switcher ─── */

function ViewSwitcher({
  value,
  onChange,
}: {
  value: "tab" | "kanban";
  onChange: (v: "tab" | "kanban") => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
      <button
        onClick={() => onChange("tab")}
        aria-label="Tab ko'rinishi"
        className={cn(
          "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors sm:px-2",
          value === "tab" ? "bg-foreground text-background" : "text-muted hover:text-foreground"
        )}
      >
        <Layers className="size-3" /> <span className="hidden sm:inline">Tab</span>
      </button>
      <button
        onClick={() => onChange("kanban")}
        aria-label="Kanban ko'rinishi"
        className={cn(
          "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors sm:px-2",
          value === "kanban" ? "bg-foreground text-background" : "text-muted hover:text-foreground"
        )}
      >
        <LayoutGrid className="size-3" /> <span className="hidden sm:inline">Kanban</span>
      </button>
    </div>
  );
}

function SortToggle({
  value,
  onChange,
}: {
  value: SortOrder;
  onChange: (v: SortOrder) => void;
}) {
  return (
    <button
      onClick={() => onChange(value === "new" ? "old" : "new")}
      title={value === "new" ? "Yangilari tepada" : "Eskilari tepada"}
      aria-label={value === "new" ? "Yangilari tepada" : "Eskilari tepada"}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-1 text-[11px] text-muted transition-colors hover:bg-hover hover:text-foreground sm:px-2"
    >
      {value === "new" ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />}
      <span className="hidden font-mono uppercase tracking-wider sm:inline">
        {value === "new" ? "yangi" : "eski"}
      </span>
    </button>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid flex-1 place-items-center">
      <div className="text-center">
        <p className="text-[14px] font-semibold">Toifalar yo&apos;q</p>
        <p className="mt-1 text-[12px] text-muted">Boshlash uchun birinchi toifani qo&apos;shing</p>
        <button
          onClick={onCreate}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background hover:opacity-90"
        >
          <Plus className="size-3.5" /> Yangi toifa
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB VIEW — Linear dense + bottom done dropdown
   ════════════════════════════════════════════════════════════ */

type ViewProps = {
  ideas: Idea[];
  categories: Category[];
  sortOrder: SortOrder;
  justCreatedId: string | null;
  onCreate: (title: string, categoryId: string) => void;
  onUpdate: (id: string, patch: Partial<Idea>) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onOpen: (id: string) => void;
  onCategoryNew: () => void;
  onCategoryEdit: (c: Category) => void;
  onCategoryDelete: (id: string) => void;
};

function sortIdeas(arr: Idea[], order: SortOrder): Idea[] {
  return [...arr].sort((a, b) => {
    const cmp = a.createdAt.localeCompare(b.createdAt);
    return order === "new" ? -cmp : cmp;
  });
}

function TabView(props: ViewProps) {
  const [tab, setTab] = useState(props.categories[0].id);
  // Ensure tab is valid if categories change
  useEffect(() => {
    if (!props.categories.find((c) => c.id === tab)) {
      setTab(props.categories[0]?.id ?? "");
    }
  }, [props.categories, tab]);

  const active = props.categories.find((c) => c.id === tab) ?? props.categories[0];
  const items = props.ideas.filter((i) => i.categoryId === tab);
  const ac = sortIdeas(items.filter((i) => !i.done), props.sortOrder);
  const dn = sortIdeas(items.filter((i) => i.done), props.sortOrder);

  const [adding, setAdding] = useState(false);
  const [v, setV] = useState("");
  const addRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (adding) addRef.current?.focus(); }, [adding]);

  const [doneOpen, setDoneOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MaterialTabBar
        tab={tab}
        setTab={setTab}
        categories={props.categories}
        ideas={props.ideas}
        onCategoryNew={props.onCategoryNew}
        onCategoryEdit={props.onCategoryEdit}
        onCategoryDelete={props.onCategoryDelete}
      />

      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto pb-24 md:pb-0">
        {/* + Yangi reja qo'shish — tepada, lekin tab bardan biroz ajralib turadi */}
        <div className="mt-3 border-y border-border/40">
          {adding ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (v.trim()) props.onCreate(v, tab);
                setV("");
                setAdding(false);
              }}
              className="flex items-center gap-3 px-5 py-2"
            >
              <CircleDashed className="size-3.5 shrink-0 text-faint" />
              <input
                ref={addRef}
                value={v}
                onChange={(e) => setV(e.target.value)}
                onBlur={() => {
                  if (v.trim()) props.onCreate(v, tab);
                  setV("");
                  setAdding(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setV("");
                    setAdding(false);
                  }
                }}
                placeholder={`${active.label} bo'limiga reja yozing...`}
                className="flex-1 bg-transparent text-[13.5px] placeholder:text-faint focus:outline-none"
              />
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex w-full items-center gap-3 px-5 py-3 text-left text-[14.5px] text-faint hover:bg-hover/40 hover:text-muted sm:py-2 sm:text-[13px]"
            >
              <Plus className="size-3.5" />
              <span className="flex-1">Yangi reja qo&apos;shish</span>
            </button>
          )}
        </div>

        {/* Active list — qo'shish tugmasi ostida, kichik bo'shliq bilan */}
        <ul className="mt-3">
          {ac.map((i) => (
            <IdeaRowLinear
              key={i.id}
              idea={i}
              cat={active}
              isNew={i.id === props.justCreatedId}
              onToggle={() => props.onToggle(i.id)}
              onRemove={() => props.onRemove(i.id)}
              onEditTitle={(t) => props.onUpdate(i.id, { title: t })}
              onOpen={() => props.onOpen(i.id)}
            />
          ))}
        </ul>

        {/* Bottom done dropdown */}
        {dn.length > 0 && (
          <section className="border-t border-border bg-subtle/20">
            <button
              onClick={() => setDoneOpen((v) => !v)}
              className="flex w-full items-center gap-2 px-5 py-2 text-left hover:bg-hover/40"
            >
              <ChevronRight
                className={cn(
                  "size-3 text-faint transition-transform",
                  doneOpen && "rotate-90"
                )}
              />
              <Check className="size-3 text-accent" strokeWidth={3} />
              <span className="text-[11.5px] font-medium uppercase tracking-wider text-faint">
                Bajarilgan
              </span>
              <span className="font-mono text-[10.5px] tabular-nums text-faint">
                {dn.length}
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: doneOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <ul>
                  {dn.map((i) => (
                    <IdeaRowLinear
                      key={i.id}
                      idea={i}
                      cat={active}
                      onToggle={() => props.onToggle(i.id)}
                      onRemove={() => props.onRemove(i.id)}
                      onEditTitle={(t) => props.onUpdate(i.id, { title: t })}
                      onOpen={() => props.onOpen(i.id)}
                    />
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ─── Material tab bar (with + button for new category) ─── */

function MaterialTabBar({
  tab,
  setTab,
  categories,
  ideas,
  onCategoryNew,
  onCategoryEdit,
  onCategoryDelete,
}: {
  tab: string;
  setTab: (id: string) => void;
  categories: Category[];
  ideas: Idea[];
  onCategoryNew: () => void;
  onCategoryEdit: (c: Category) => void;
  onCategoryDelete: (id: string) => void;
}) {
  const active = categories.find((c) => c.id === tab) ?? categories[0];
  const activeColor = CATEGORY_PALETTE[active.color].oklch;
  const [menuFor, setMenuFor] = useState<{ id: string; top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabWrapperRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => { setPortalReady(true); }, []);

  useEffect(() => {
    if (!menuFor) return;
    const menuForId = menuFor.id;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      const btn = menuBtnRefs.current[menuForId];
      if (btn?.contains(t)) return;
      setMenuFor(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuFor]);

  function openMenu(id: string, btn: HTMLButtonElement) {
    if (menuFor?.id === id) {
      setMenuFor(null);
      return;
    }
    const r = btn.getBoundingClientRect();
    setMenuFor({
      id,
      top: r.bottom + 4,
      right: window.innerWidth - r.right,
    });
  }

  // Track indicator position to active tab (measured against the scroll container)
  useEffect(() => {
    const el = tabWrapperRefs.current[tab];
    const scroll = scrollRef.current;
    if (!el || !scroll) return;
    const elRect = el.getBoundingClientRect();
    const scrollRect = scroll.getBoundingClientRect();
    setIndicator({
      left: elRect.left - scrollRect.left + scroll.scrollLeft,
      width: elRect.width,
    });
    // Bring the active tab into view if outside the viewport
    el.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [tab, categories]);

  return (
    <div className="relative shrink-0 border-b border-border bg-subtle/20">
      <div
        ref={scrollRef}
        className="reja-tabbar relative flex items-stretch overflow-x-auto overflow-y-hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {categories.map((c) => {
          const isA = tab === c.id;
          const color = CATEGORY_PALETTE[c.color].oklch;
          const count = ideas.filter((i) => i.categoryId === c.id).length;
          return (
            <div
              key={c.id}
              ref={(el) => { tabWrapperRefs.current[c.id] = el; }}
              className="group relative shrink-0"
            >
              <button
                onClick={() => setTab(c.id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap py-3.5 pl-4 pr-8 text-[12.5px] font-medium uppercase tracking-wider transition-colors",
                  isA ? "text-foreground" : "text-muted hover:text-foreground"
                )}
              >
                <span
                  className={cn("size-1.5 shrink-0 rounded-full", isA ? "opacity-100" : "opacity-60")}
                  style={{ background: color }}
                />
                <span className="truncate">{c.label}</span>
                <span className="font-mono text-[10px] tabular-nums text-faint">{count}</span>
              </button>
              <button
                ref={(el) => { menuBtnRefs.current[c.id] = el; }}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openMenu(c.id, e.currentTarget);
                }}
                aria-label="Toifa amallari"
                className={cn(
                  "absolute right-1 top-1.5 z-10 grid size-6 place-items-center rounded text-faint transition-colors hover:bg-hover hover:text-foreground",
                  menuFor?.id === c.id ? "bg-hover text-foreground opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
              >
                <MoreHorizontal className="size-3.5" />
              </button>
            </div>
          );
        })}
        <button
          onClick={onCategoryNew}
          aria-label="Yangi toifa"
          className="flex shrink-0 items-center justify-center gap-1 border-l border-border/60 px-4 py-3.5 text-[12px] text-faint hover:bg-hover/40 hover:text-foreground"
        >
          <Plus className="size-3" />
        </button>
        {/* Sliding indicator placed at the bottom of the scrollable strip */}
        <div
          className="pointer-events-none absolute bottom-0 h-[3px] transition-all duration-300 ease-out"
          style={{
            left: indicator.left,
            width: indicator.width,
            background: activeColor,
          }}
        />
      </div>

      {/* Portal-rendered menu so it escapes overflow clipping */}
      {portalReady && menuFor &&
        createPortal(
          <div
            ref={menuRef}
            className="fade-in fixed z-[100] w-36 overflow-hidden rounded-md border border-border bg-surface shadow-xl"
            style={{ top: menuFor.top, right: menuFor.right }}
          >
            <button
              onClick={() => {
                const cat = categories.find((c) => c.id === menuFor.id);
                if (cat) onCategoryEdit(cat);
                setMenuFor(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-muted hover:bg-hover hover:text-foreground"
            >
              <Pencil className="size-3" /> Tahrir
            </button>
            <button
              onClick={() => {
                onCategoryDelete(menuFor.id);
                setMenuFor(null);
              }}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-1.5 text-left text-[12px] text-muted hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="size-3" /> O&apos;chir
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   KANBAN VIEW — Linear + WIP combo
   ════════════════════════════════════════════════════════════ */

function KanbanView(props: ViewProps) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuFor) return;
    function onDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuFor(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuFor]);

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden pb-20 md:pb-0">
      <div
        className="grid h-full min-w-min"
        style={{
          gridTemplateColumns: `repeat(${props.categories.length}, minmax(260px, 1fr)) 220px`,
        }}
      >
        {props.categories.map((cat, idx) => (
          <KanbanColumn
            key={cat.id}
            cat={cat}
            ideas={props.ideas.filter((i) => i.categoryId === cat.id)}
            sortOrder={props.sortOrder}
            justCreatedId={props.justCreatedId}
            isFirst={idx === 0}
            onCreate={(t) => props.onCreate(t, cat.id)}
            onToggle={props.onToggle}
            onRemove={props.onRemove}
            onUpdate={props.onUpdate}
            onOpen={props.onOpen}
            menuOpen={menuFor === cat.id}
            onMenuToggle={() => setMenuFor(menuFor === cat.id ? null : cat.id)}
            menuRef={menuRef}
            onEdit={() => props.onCategoryEdit(cat)}
            onDelete={() => props.onCategoryDelete(cat.id)}
          />
        ))}
        {/* + Add new category column */}
        <div className="flex items-start border-l border-border bg-subtle/10 p-3">
          <button
            onClick={props.onCategoryNew}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-[12.5px] text-faint hover:border-border-strong hover:text-muted"
          >
            <Plus className="size-3.5" /> Yangi toifa
          </button>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  cat,
  ideas,
  sortOrder,
  justCreatedId,
  isFirst,
  onCreate,
  onToggle,
  onRemove,
  onUpdate,
  onOpen,
  menuOpen,
  onMenuToggle,
  menuRef,
  onEdit,
  onDelete,
}: {
  cat: Category;
  ideas: Idea[];
  sortOrder: SortOrder;
  justCreatedId: string | null;
  isFirst: boolean;
  onCreate: (title: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Idea>) => void;
  onOpen: (id: string) => void;
  menuOpen: boolean;
  onMenuToggle: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = CATEGORY_PALETTE[cat.color].oklch;
  const active = sortIdeas(ideas.filter((i) => !i.done), sortOrder);
  const done = sortIdeas(ideas.filter((i) => i.done), sortOrder);
  const [adding, setAdding] = useState(false);
  const [v, setV] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);
  const [showDone, setShowDone] = useState(false);

  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden", !isFirst && "border-l border-border")}>
      <header className="relative shrink-0 border-b border-border px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-sm" style={{ background: color }} />
            <h3 className="truncate text-[12px] font-medium uppercase tracking-wider">{cat.label}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10.5px] tabular-nums text-faint">
              {active.length}
            </span>
            <button
              onClick={onMenuToggle}
              aria-label="Toifa amallari"
              className="grid size-5 place-items-center rounded text-faint hover:bg-hover hover:text-foreground"
            >
              <MoreHorizontal className="size-3" />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div
            ref={menuRef}
            className="fade-in absolute right-2 top-full z-20 mt-1 w-32 overflow-hidden rounded-md border border-border bg-surface shadow-lg"
          >
            <button onClick={onEdit} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-muted hover:bg-hover hover:text-foreground">
              <Pencil className="size-3" /> Tahrir
            </button>
            <button onClick={onDelete} className="flex w-full items-center gap-2 border-t border-border px-3 py-1.5 text-left text-[12px] text-muted hover:bg-danger-soft hover:text-danger">
              <Trash2 className="size-3" /> O&apos;chir
            </button>
          </div>
        )}
      </header>

      {/* Add row */}
      <div className="border-b border-border/60">
        {adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (v.trim()) onCreate(v);
              setV("");
              setAdding(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5"
          >
            <CircleDashed className="size-3 shrink-0 text-faint" />
            <input
              ref={inputRef}
              value={v}
              onChange={(e) => setV(e.target.value)}
              onBlur={() => {
                if (v.trim()) onCreate(v);
                setV("");
                setAdding(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setV(""); setAdding(false); }
              }}
              placeholder="G'oya..."
              className="flex-1 bg-transparent text-[12px] placeholder:text-faint focus:outline-none"
            />
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px] text-faint hover:bg-hover/40 hover:text-muted"
          >
            <Plus className="size-3" /> Qo&apos;shish
          </button>
        )}
      </div>

      {/* Active */}
      <div className="flex-1 overflow-y-auto">
        {active.map((i) => (
          <IdeaRowLinear
            key={i.id}
            idea={i}
            cat={cat}
            compact
            isNew={i.id === justCreatedId}
            onToggle={() => onToggle(i.id)}
            onRemove={() => onRemove(i.id)}
            onEditTitle={(t) => onUpdate(i.id, { title: t })}
            onOpen={() => onOpen(i.id)}
          />
        ))}

        {/* Done dropdown */}
        {done.length > 0 && (
          <div className="border-t border-border bg-subtle/20">
            <button
              onClick={() => setShowDone((v) => !v)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[10.5px] uppercase tracking-wider text-faint hover:bg-hover/40 hover:text-muted"
            >
              <ChevronRight className={cn("size-3 transition-transform", showDone && "rotate-90")} />
              <Check className="size-3 text-accent" strokeWidth={3} />
              <span className="flex-1">Bajarilgan</span>
              <span className="font-mono tabular-nums">{done.length}</span>
            </button>
            {showDone && (
              <ul>
                {done.map((i) => (
                  <IdeaRowLinear
                    key={i.id}
                    idea={i}
                    cat={cat}
                    compact
                    onToggle={() => onToggle(i.id)}
                    onRemove={() => onRemove(i.id)}
                    onEditTitle={(t) => onUpdate(i.id, { title: t })}
                    onOpen={() => onOpen(i.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════
   IdeaRowLinear — Linear dense row with unumly check animation
   (delay 700ms, check-fill + check-pop, then slide out)
   ════════════════════════════════════════════════════════════ */

function IdeaRowLinear({
  idea,
  cat,
  compact,
  isNew,
  onToggle,
  onRemove,
  onEditTitle,
  onOpen,
}: {
  idea: Idea;
  cat: Category;
  compact?: boolean;
  isNew?: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onEditTitle: (title: string) => void;
  onOpen?: () => void;
}) {
  const color = CATEGORY_PALETTE[cat.color].oklch;
  const done = idea.done;
  const [pendingDone, setPendingDone] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  // Cancel pending if external state flipped
  useEffect(() => {
    if (done && pendingDone) {
      setPendingDone(false);
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [done, pendingDone]);

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (done) {
      onToggle();
      return;
    }
    if (pendingDone) {
      setPendingDone(false);
      return;
    }
    setPendingDone(true);
    timerRef.current = window.setTimeout(() => {
      onToggle();
      timerRef.current = null;
    }, DONE_DELAY_MS);
  }

  // onEditTitle prop is no longer used here — editing happens in IdeaDetail dialog
  void onEditTitle;

  const visualDone = done || pendingDone;
  const articleStyle: React.CSSProperties = pendingDone
    ? {
        maxHeight: 0,
        opacity: 0,
        paddingTop: 0,
        paddingBottom: 0,
        transition:
          "max-height 350ms 250ms cubic-bezier(0.16,1,0.3,1), opacity 300ms 250ms ease-out, padding 350ms 250ms cubic-bezier(0.16,1,0.3,1)",
      }
    : {
        maxHeight: compact ? 36 : 40,
        paddingTop: compact ? "0.375rem" : "0.5rem",
        paddingBottom: compact ? "0.375rem" : "0.5rem",
        transition:
          "max-height 350ms 250ms cubic-bezier(0.16,1,0.3,1), opacity 300ms 250ms ease-out, padding 350ms 250ms cubic-bezier(0.16,1,0.3,1)",
      };

  return (
    <article
      className={cn(
        "group grid items-start gap-2 overflow-hidden border-b border-border/40 hover:bg-hover/40",
        compact ? "grid-cols-[10px_1fr_24px_14px] px-3" : "grid-cols-[16px_1fr_50px_24px_16px] px-5",
        isNew && !pendingDone && "drop-in"
      )}
      style={articleStyle}
    >
      {/* Priority indicator — stripe (compact) or dot (non-compact) */}
      {compact ? (
        <span
          className={cn(
            "mt-1 h-3 w-1 rounded-sm",
            idea.priority === "HIGH"   && "bg-priority-high",
            idea.priority === "MEDIUM" && "bg-priority-medium",
            idea.priority === "LOW"    && "bg-priority-low",
            !idea.priority && "bg-faint/30"
          )}
        />
      ) : (
        <span
          className={cn(
            "mt-1.5 size-1.5 rounded-full",
            idea.priority === "HIGH"   && "bg-priority-high",
            idea.priority === "MEDIUM" && "bg-priority-medium",
            idea.priority === "LOW"    && "bg-priority-low",
            !idea.priority && "bg-faint/40"
          )}
        />
      )}

      <button
        onClick={() => onOpen?.()}
        className={cn(
          "min-w-0 flex-1 cursor-pointer truncate text-left leading-snug",
          compact ? "text-[13.5px] sm:text-[12px]" : "text-[14.5px] sm:text-[13px]",
          visualDone && "text-faint line-through"
        )}
      >
        {idea.title}
      </button>

      {!compact && (
        <span className="text-right font-mono text-[10.5px] tabular-nums text-faint">
          {formatRel(idea.createdAt)}
        </span>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label="O'chirish"
        className="grid size-5 shrink-0 place-items-center rounded text-faint opacity-0 transition-colors hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
      >
        <Trash2 className="size-3" />
      </button>

      <button onClick={handleToggle} className="mt-0.5">
        <CheckBox visualDone={visualDone} color={color} small={compact} />
      </button>
    </article>
  );
}

function CheckBox({ visualDone, color, small }: { visualDone: boolean; color: string; small?: boolean }) {
  return (
    <span
      className={cn(
        "grid place-items-center rounded-md border transition-all duration-200",
        small ? "size-[14px]" : "size-[16px]",
        visualDone ? "check-fill" : "border-border-strong hover:border-accent"
      )}
      style={visualDone ? { background: color, borderColor: color } : undefined}
    >
      {visualDone && (
        <Check
          className={cn("text-background check-pop", small ? "size-2" : "size-2.5")}
          strokeWidth={4}
        />
      )}
    </span>
  );
}

function formatRel(iso: string): string {
  const t = new Date(iso).getTime();
  const d = Math.floor((Date.now() - t) / 86400_000);
  if (d === 0) return "bugun";
  if (d === 1) return "kecha";
  if (d < 7) return `${d}k`;
  return new Date(t).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
}

/* ════════════════════════════════════════════════════════════
   Category dialog (create / edit)
   ════════════════════════════════════════════════════════════ */

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
  const [color, setColor] = useState<CategoryColor>(() =>
    CATEGORY_COLOR_KEYS[Math.floor(Math.random() * CATEGORY_COLOR_KEYS.length)]
  );

  useEffect(() => {
    if (state?.mode === "edit") {
      setLabel(state.cat.label);
      setColor(state.cat.color);
    } else if (state?.mode === "create") {
      setLabel("");
      setColor(
        CATEGORY_COLOR_KEYS[Math.floor(Math.random() * CATEGORY_COLOR_KEYS.length)]
      );
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
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            {isEdit ? "Toifani tahrirlash" : "Yangi toifa"}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="grid size-7 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"
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
                    {active && <Check className="size-3.5 text-background" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
              Ko&apos;rinishi
            </p>
            <div
              className="flex items-center gap-2 rounded-md border-x border-b border-border bg-surface px-3 py-2"
              style={{ borderTop: `4px solid ${CATEGORY_PALETTE[color].oklch}` }}
            >
              <span className="size-2 rounded-full" style={{ background: CATEGORY_PALETTE[color].oklch }} />
              <span className="text-[12.5px] font-semibold">
                {label.trim() || "Toifa nomi"}
              </span>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-subtle/30 px-4 py-2.5">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-[12px] text-muted hover:bg-hover hover:text-foreground">
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
