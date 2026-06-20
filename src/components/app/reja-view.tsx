"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, Reorder, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
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
import { dismissDoneIdeas, isIdeaDismissed, useIdeas } from "@/lib/ideas-store";
import { useCategories, useHydratedCategories } from "@/lib/categories-store";
import { useDragReorder } from "@/lib/use-drag-reorder";
import { CATEGORY_COLOR_KEYS, CATEGORY_PALETTE } from "@/lib/category-palette";
import type { Category, CategoryColor, Idea } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Dialog } from "./widgets/dialog";
import { ConfirmDialog, useConfirmRemove } from "./widgets/confirm-dialog";
import { IdeaDetail } from "./widgets/idea-detail";
import { ListLoader } from "./widgets/list-loader";

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
  const catsHydrated = useHydratedCategories();

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
    const isMobile = window.matchMedia("(max-width: 639px)").matches;
    if (isMobile) {
      setView("tab"); // kanban is unusable on mobile
    } else {
      const v = window.localStorage.getItem(VIEW_KEY);
      if (v === "tab" || v === "kanban") setView(v);
    }
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

  // Reja board faqat sanasiz g'oyalardan iborat — sanali g'oyalar Plan sifatida
  // Bugun/Agenda/Kalendarga o'tib, rejadan chiqib ketadi (Rule 1).
  const boardIdeas = useMemo(() => ideas.filter(isOnBoard), [ideas]);

  const total = boardIdeas.length;
  const done = boardIdeas.filter((i) => i.done).length;

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

      {!catsHydrated && categories.length === 0 ? (
        <ListLoader label="Yuklanmoqda…" />
      ) : categories.length === 0 ? (
        <EmptyState onCreate={() => setDialogState({ mode: "create" })} />
      ) : view === "tab" ? (
        <TabView
          ideas={boardIdeas}
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
          onCategoryReorder={(d, b) => reorderCategories(categories, d, b, updateCategory)}
        />
      ) : (
        <KanbanView
          ideas={boardIdeas}
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
          onCategoryReorder={(d, b) => reorderCategories(categories, d, b, updateCategory)}
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

/* ─── Reorder helper ───────────────────────────────────────────
   Shared by TabView (MaterialTabBar) and KanbanView. Computes the new
   order of categories after a drag-and-drop and pushes order updates
   only for the rows whose position actually changed. */

function reorderCategories(
  current: Category[],
  draggedId: string,
  beforeId: string | null,
  updateCategory: (id: string, patch: Partial<Category>) => void
) {
  const list = [...current];
  const from = list.findIndex((c) => c.id === draggedId);
  const to = beforeId
    ? list.findIndex((c) => c.id === beforeId)
    : list.length;
  if (from < 0) return;
  if (beforeId && to < 0) return;
  if (from === to) return;
  const [moved] = list.splice(from, 1);
  list.splice(from < to ? to - 1 : to, 0, moved);
  list.forEach((c, idx) => {
    if (c.order !== idx) updateCategory(c.id, { order: idx });
  });
}

/* ─── View switcher ─── */

function ViewSwitcher({
  value,
  onChange,
}: {
  value: "tab" | "kanban";
  onChange: (v: "tab" | "kanban") => void;
}) {
  // Hidden on mobile — kanban is uncomfortable on small screens
  return (
    <div className="hidden items-center gap-0.5 rounded-md border border-border bg-surface p-0.5 sm:inline-flex">
      <button
        onClick={() => onChange("tab")}
        aria-label="Tab ko'rinishi"
        className={cn(
          "flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition-colors",
          value === "tab" ? "bg-accent text-accent-ink" : "text-muted hover:text-foreground"
        )}
      >
        <Layers className="size-3" /> Tab
      </button>
      <button
        onClick={() => onChange("kanban")}
        aria-label="Kanban ko'rinishi"
        className={cn(
          "flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition-colors",
          value === "kanban" ? "bg-accent text-accent-ink" : "text-muted hover:text-foreground"
        )}
      >
        <LayoutGrid className="size-3" /> Kanban
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
  onCategoryReorder?: (draggedId: string, beforeId: string | null) => void;
};

function sortIdeas(arr: Idea[], order: SortOrder): Idea[] {
  return [...arr].sort((a, b) => {
    const cmp = a.createdAt.localeCompare(b.createdAt);
    return order === "new" ? -cmp : cmp;
  });
}

// Sanali g'oyalar rejadan chiqadi (ular Plan sifatida Bugun/Agenda/Kalendarda).
function isOnBoard(i: Idea): boolean {
  return !i.scheduledFor;
}

// "Bajarilgan" dropdownda faqat yaqinda (oxirgi 7 kun) bajarilganlar ko'rinadi
// va "Tozalash" bilan yashirilmaganlar. Ma'lumot o'chmaydi — Arxivda qoladi.
const DONE_VISIBLE_DAYS = 7;
function isRecentlyDone(i: Idea): boolean {
  if (!i.done || i.scheduledFor) return false;
  if (isIdeaDismissed(i.id)) return false;
  const at = i.completedAt;
  if (!at) return true; // eski (completedAt yo'q) — ko'rsatamiz
  return Date.now() - new Date(at).getTime() <= DONE_VISIBLE_DAYS * 86_400_000;
}

/* Swipe (chap/o'ng) bilan toifalar orasida o'tish animatsiyasi. */
const SWIPE_VARIANTS = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: "0%", opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};
const SWIPE_THRESHOLD = 56;

function TabView(props: ViewProps) {
  const [tab, setTab] = useState(props.categories[0].id);
  const [dir, setDir] = useState(0);
  // Ensure tab is valid if categories change
  useEffect(() => {
    if (!props.categories.find((c) => c.id === tab)) {
      setTab(props.categories[0]?.id ?? "");
    }
  }, [props.categories, tab]);

  const idx = props.categories.findIndex((c) => c.id === tab);

  // Toifa tanlash — yo'nalishni (chap/o'ng) aniqlab animatsiya beradi.
  function selectTab(id: string) {
    const ni = props.categories.findIndex((c) => c.id === id);
    if (ni === idx) return;
    setDir(ni > idx ? 1 : -1);
    setTab(id);
    setAdding(false);
    setV("");
  }
  function goRel(delta: number) {
    const ni = idx + delta;
    if (ni < 0 || ni >= props.categories.length) return;
    setDir(delta);
    setTab(props.categories[ni].id);
    setAdding(false);
    setV("");
  }

  const active = props.categories.find((c) => c.id === tab) ?? props.categories[0];
  const items = props.ideas.filter((i) => i.categoryId === tab);
  const ac = sortIdeas(items.filter((i) => !i.done), props.sortOrder);
  const dn = sortIdeas(items.filter(isRecentlyDone), props.sortOrder);

  const [adding, setAdding] = useState(false);
  const [v, setV] = useState("");
  const addRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (adding) addRef.current?.focus(); }, [adding]);

  const [doneOpen, setDoneOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Sensorli (touch) qurilmada — drag bilan swipe; desktopda esa wheel (pastda).
  // Desktopda mouse-drag panelni tortib yuborib chalkashtirardi, shuning uchun o'chiramiz.
  const [touchSwipe, setTouchSwipe] = useState(false);
  useEffect(() => {
    setTouchSwipe(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Desktop: gorizontal scroll (trackpad / shift+wheel) bilan toifa almashtirish.
  // (drag="x" — sensorli ekranda swipe; wheel — desktop uchun.)
  // Eng so'nggi holatni navRef orqali o'qiymiz, listener esa bir marta ulanadi.
  const scrollWrapRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<{ idx: number; ids: string[] }>({ idx: 0, ids: [] });
  const catIds = props.categories.map((c) => c.id).join(",");
  useEffect(() => {
    navRef.current = { idx, ids: catIds ? catIds.split(",") : [] };
  }, [idx, catIds]);
  useEffect(() => {
    const el = scrollWrapRef.current;
    if (!el) return;
    // Bitta gesture = bitta switch, lekin qasddan ketma-ket swipe darhol ishlaydi.
    // Trackpad momentumi FAQAT pasayadi; yangi swipe deltani QAYTA ko'taradi.
    // Switch'dan keyin momentum "dumi"ni kutamiz, delta qayta ko'tarilsa — yangi swipe.
    let armed = true;
    let accum = 0;
    let sawTail = false;
    let idleTimer: number | null = null;
    function onWheel(e: WheelEvent) {
      // Faqat gorizontal niyat — vertikal scrollga tegmaymiz.
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault(); // brauzer "orqaga/oldinga" gesturasini to'xtatadi
      const abs = Math.abs(e.deltaX);

      if (!armed) {
        if (abs < 10) sawTail = true;          // momentum pasaydi
        else if (sawTail && abs > 16) {        // delta qayta ko'tarildi — yangi swipe
          armed = true;
          accum = 0;
        }
      }

      // Idle (oqim to'xtadi) — qayta arm (fallback).
      if (idleTimer) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => { armed = true; accum = 0; sawTail = false; }, 120);

      if (!armed) return;
      accum += e.deltaX;
      if (Math.abs(accum) < 45) return;
      const delta = accum > 0 ? 1 : -1;
      accum = 0;
      const { idx: cur, ids } = navRef.current;
      const ni = cur + delta;
      if (ni < 0 || ni >= ids.length) { armed = false; sawTail = false; return; }
      setDir(delta);
      setTab(ids[ni]);
      setAdding(false);
      setV("");
      armed = false;   // momentum dumi shu toifada qoldiradi
      sawTail = false;
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (idleTimer) window.clearTimeout(idleTimer);
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MaterialTabBar
        tab={tab}
        setTab={selectTab}
        categories={props.categories}
        ideas={props.ideas}
        onCategoryNew={props.onCategoryNew}
        onCategoryEdit={props.onCategoryEdit}
        onCategoryDelete={props.onCategoryDelete}
        onCategoryReorder={props.onCategoryReorder}
      />

      <div ref={scrollWrapRef} className="relative flex-1 overflow-hidden">
      <AnimatePresence initial={false} custom={dir}>
      <motion.div
        key={tab}
        custom={dir}
        variants={SWIPE_VARIANTS}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ x: { type: "spring", stiffness: 460, damping: 42 }, opacity: { duration: 0.18 } }}
        drag={touchSwipe ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.16}
        onDragEnd={(_, info) => {
          if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -500) goRel(1);
          else if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 500) goRel(-1);
        }}
        className="absolute inset-0 overflow-y-auto overscroll-x-contain pb-24 md:pb-0"
      >
      <div className="mx-auto w-full max-w-3xl">
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
          <section className="border-t border-border bg-subtle/40">
            <div className="flex items-center">
              <button
                onClick={() => setDoneOpen((v) => !v)}
                className="flex flex-1 items-center gap-2 px-5 py-2 text-left text-muted hover:bg-hover/40 hover:text-foreground"
              >
                <ChevronRight
                  className={cn(
                    "size-3 transition-transform",
                    doneOpen && "rotate-90"
                  )}
                />
                <Check className="size-3" strokeWidth={3} />
                <span className="text-[11.5px] font-medium uppercase tracking-wider">
                  Bajarilgan
                </span>
                <span className="font-mono text-[10.5px] tabular-nums">
                  {dn.length}
                </span>
              </button>
              {doneOpen && (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="mr-3 shrink-0 rounded px-2 py-1 text-[11px] font-medium text-faint transition-colors hover:bg-hover hover:text-foreground"
                  title="Bajarilganlarni ro'yxatdan yashirish (o'chmaydi)"
                >
                  Tozalash
                </button>
              )}
            </div>
            <ConfirmDialog
              open={confirmClear}
              title="Bajarilganlarni tozalash"
              description={`${dn.length} ta bajarilgan g'oya shu ro'yxatdan olib tashlanadi.`}
              confirmLabel="Tozalash"
              onConfirm={() => { dismissDoneIdeas(dn.map((i) => i.id)); setConfirmClear(false); }}
              onClose={() => setConfirmClear(false)}
            />
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
      </motion.div>
      </AnimatePresence>
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
  onCategoryReorder,
}: {
  tab: string;
  setTab: (id: string) => void;
  categories: Category[];
  ideas: Idea[];
  onCategoryNew: () => void;
  onCategoryEdit: (c: Category) => void;
  onCategoryDelete: (id: string) => void;
  onCategoryReorder?: (draggedId: string, beforeId: string | null) => void;
}) {
  // Drag-reorder (framer Reorder): ko'chirilayotgan tab kursor/barmoqni ergashadi,
  // qolganlari silliq surilib bo'shliq ochadi. `order` — id'lar tartibi (drag
  // paytida onReorder bilan yangilanadi), categories o'zgarsa qayta moslashadi.
  const [order, setOrder] = useState<string[]>(() => categories.map((c) => c.id));
  useEffect(() => { setOrder(categories.map((c) => c.id)); }, [categories]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const catById = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);
  const orderRef = useRef(order);
  useEffect(() => { orderRef.current = order; }, [order]);
  function persistOrder(id: string) {
    if (!onCategoryReorder) return;
    const o = orderRef.current;
    const idx = o.indexOf(id);
    const beforeId = idx >= 0 && idx + 1 < o.length ? o[idx + 1] : null;
    onCategoryReorder(id, beforeId);
  }

  // Mobil (sensorli): drag o'rniga strip oddiy scroll qiladi, tartib esa menyu
  // ichidagi ← → strelkalar orqali o'zgaradi.
  const [coarse, setCoarse] = useState(false);
  useEffect(() => { setCoarse(window.matchMedia("(pointer: coarse)").matches); }, []);
  function moveTab(id: string, delta: -1 | 1) {
    if (!onCategoryReorder) return;
    const i = categories.findIndex((c) => c.id === id);
    if (i < 0) return;
    const j = i + delta;
    if (j < 0 || j >= categories.length) return;
    const beforeId =
      delta < 0
        ? categories[i - 1].id
        : i + 2 < categories.length
        ? categories[i + 2].id
        : null;
    onCategoryReorder(id, beforeId);
  }

  const active = categories.find((c) => c.id === tab) ?? categories[0];
  const activeColor = CATEGORY_PALETTE[active.color].oklch;
  const [menuFor, setMenuFor] = useState<{ id: string; top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const tabBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
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
      // Tanlangan tabni qayta bosish menyuni toggle qiladi (qayta ochmaslik uchun).
      if (tabBtnRefs.current[menuForId]?.contains(t)) return;
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
    // Menyu kengligi (w-36 = 144px) — viewport chetidan chiqib qirqilmasligi
    // uchun left'ni clamp qilamiz (chap tabda chapga, o'ng tabda o'ngga sig'adi).
    const MENU_W = 144;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - MENU_W - 8);
    setMenuFor({ id, top: r.bottom + 4, left });
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

  // Drag paytida chetga (chap/o'ng) yetganda strip'ni avtomatik suramiz —
  // shunda ekrandan tashqaridagi tablarga ham ko'chirib bo'ladi.
  useEffect(() => {
    if (!draggingId) return;
    const el = scrollRef.current;
    if (!el) return;
    const EDGE = 56; // chetdagi "issiq zona" (px)
    const MAX = 16; // har kadrdagi maksimal scroll (px)
    let dir = 0;
    let speed = 0;
    let raf = 0;
    function step() {
      if (dir !== 0 && el) el.scrollLeft += dir * speed;
      raf = requestAnimationFrame(step);
    }
    function onMove(e: PointerEvent) {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX;
      if (x < r.left + EDGE) {
        dir = -1;
        speed = Math.min(MAX, ((r.left + EDGE - x) / EDGE) * MAX);
      } else if (x > r.right - EDGE) {
        dir = 1;
        speed = Math.min(MAX, ((x - (r.right - EDGE)) / EDGE) * MAX);
      } else {
        dir = 0;
      }
    }
    document.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(step);
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [draggingId]);

  function tabBtn(c: Category) {
    const isA = tab === c.id;
    const color = CATEGORY_PALETTE[c.color].oklch;
    const count = ideas.filter((i) => i.categoryId === c.id).length;
    return (
      <button
        ref={(el) => { tabBtnRefs.current[c.id] = el; }}
        onClick={(e) => {
          // Tanlangan tabni qayta bosish → amallar menyusi (tahrir/o'chir/surish).
          if (isA) openMenu(c.id, e.currentTarget);
          else setTab(c.id);
        }}
        className={cn(
          "flex items-center gap-2 whitespace-nowrap py-3.5 pl-4 pr-4 text-[12.5px] font-medium uppercase tracking-wider transition-colors",
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
    );
  }
  const addBtn = (
    <button
      onClick={onCategoryNew}
      aria-label="Yangi toifa"
      className="flex shrink-0 items-center justify-center gap-1 border-l border-border/60 px-4 py-3.5 text-[12px] text-faint hover:bg-hover/40 hover:text-foreground"
    >
      <Plus className="size-3" />
    </button>
  );
  const indicatorEl = (
    <div
      className="pointer-events-none absolute bottom-0 h-[3px] transition-all duration-300 ease-out"
      style={{ left: indicator.left, width: indicator.width, background: activeColor, opacity: draggingId ? 0 : 1 }}
    />
  );
  const stripCls = "reja-tabbar relative flex items-stretch overflow-x-auto overflow-y-hidden";

  return (
    <div className="relative shrink-0 border-b border-border bg-subtle/20">
      {coarse ? (
        // MOBIL: oddiy scroll; tartib menyu ichidagi ← → strelkalar orqali
        <div ref={scrollRef} className={stripCls} style={{ scrollbarWidth: "none" }}>
          {categories.map((c) => (
            <div
              key={c.id}
              ref={(el) => { tabWrapperRefs.current[c.id] = el; }}
              className="group relative shrink-0 select-none"
            >
              {tabBtn(c)}
            </div>
          ))}
          {addBtn}
          {indicatorEl}
        </div>
      ) : (
        // DESKTOP: drag-reorder — ko'chirilayotgan tab kursorni ergashadi, bo'shliq ochiladi
        <Reorder.Group as="div" axis="x" values={order} onReorder={setOrder} ref={scrollRef} className={stripCls} style={{ scrollbarWidth: "none" }}>
          {order.map((id) => {
            const c = catById.get(id);
            if (!c) return null;
            const isDragged = draggingId === c.id;
            return (
              <Reorder.Item
                key={id}
                value={id}
                as="div"
                ref={(el: HTMLDivElement | null) => { tabWrapperRefs.current[id] = el; }}
                drag="x"
                onDragStart={() => setDraggingId(id)}
                onDragEnd={() => { persistOrder(id); setDraggingId(null); }}
                whileDrag={{ scale: 1.06, zIndex: 30, boxShadow: "0 12px 30px -8px rgba(0,0,0,0.5)" }}
                transition={{ type: "spring", stiffness: 600, damping: 44 }}
                className={cn(
                  "group relative shrink-0 cursor-grab select-none rounded-lg active:cursor-grabbing",
                  isDragged && "z-30 bg-surface"
                )}
              >
                {tabBtn(c)}
              </Reorder.Item>
            );
          })}
          {addBtn}
          {indicatorEl}
        </Reorder.Group>
      )}

      {/* Portal-rendered menu so it escapes overflow clipping */}
      {portalReady && menuFor &&
        createPortal(
          <div
            ref={menuRef}
            className="fade-in fixed z-[100] w-44 overflow-hidden rounded-md border border-border bg-surface shadow-xl"
            style={{ top: menuFor.top, left: menuFor.left }}
          >
            {coarse && (() => {
              const i = categories.findIndex((c) => c.id === menuFor.id);
              return (
                <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
                  <span className="text-[11px] text-faint">Joyini surish</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveTab(menuFor.id, -1)}
                      disabled={i <= 0}
                      aria-label="Chapga"
                      className="grid size-6 place-items-center rounded text-muted transition-colors hover:bg-hover hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      onClick={() => moveTab(menuFor.id, 1)}
                      disabled={i < 0 || i >= categories.length - 1}
                      aria-label="O'ngga"
                      className="grid size-6 place-items-center rounded text-muted transition-colors hover:bg-hover hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })()}
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
  const [menuFor, setMenuFor] = useState<{ id: string; top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => { setPortalReady(true); }, []);
  const dragCat = useDragReorder(props.categories, (d, b) =>
    props.onCategoryReorder?.(d, b)
  );
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
    // Menyu kengligi (w-36 = 144px) — viewport chetidan chiqib qirqilmasligi
    // uchun left'ni clamp qilamiz (chap tabda chapga, o'ng tabda o'ngga sig'adi).
    const MENU_W = 144;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - MENU_W - 8);
    setMenuFor({ id, top: r.bottom + 4, left });
  }

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden pb-20 md:pb-0">
      <div
        className="grid h-full min-w-min"
        style={{
          gridTemplateColumns: `repeat(${props.categories.length}, minmax(260px, 1fr)) 220px`,
        }}
      >
        {props.categories.map((cat, idx) => (
          <motion.div
            key={cat.id}
            layout
            transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.5 }}
            draggable={!!props.onCategoryReorder}
            onDragStart={(e) => dragCat.start(e as unknown as React.DragEvent, cat.id)}
            onDragOver={(e) => dragCat.over(e, cat.id)}
            onDrop={(e) => dragCat.drop(e, cat.id)}
            onDragEnd={dragCat.end}
            className={cn(
              "h-full select-none transition-[opacity,box-shadow] duration-150",
              dragCat.draggingId === cat.id && "opacity-40",
              dragCat.overId === cat.id && dragCat.draggingId !== cat.id &&
                "shadow-[inset_3px_0_0_var(--foreground)]"
            )}
          >
          <KanbanColumn
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
            menuActive={menuFor?.id === cat.id}
            onMenuToggle={(btn) => openMenu(cat.id, btn)}
            menuBtnRef={(el) => { menuBtnRefs.current[cat.id] = el; }}
          />
          </motion.div>
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

      {/* Portal-rendered menu so it escapes the column's overflow clipping */}
      {portalReady && menuFor &&
        createPortal(
          <div
            ref={menuRef}
            className="fade-in fixed z-[100] w-36 overflow-hidden rounded-md border border-border bg-surface shadow-xl"
            style={{ top: menuFor.top, left: menuFor.left }}
          >
            <button
              onClick={() => {
                const cat = props.categories.find((c) => c.id === menuFor.id);
                if (cat) props.onCategoryEdit(cat);
                setMenuFor(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-muted hover:bg-hover hover:text-foreground"
            >
              <Pencil className="size-3" /> Tahrir
            </button>
            <button
              onClick={() => {
                props.onCategoryDelete(menuFor.id);
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
  menuActive,
  onMenuToggle,
  menuBtnRef,
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
  menuActive: boolean;
  onMenuToggle: (btn: HTMLButtonElement) => void;
  menuBtnRef: (el: HTMLButtonElement | null) => void;
}) {
  const color = CATEGORY_PALETTE[cat.color].oklch;
  const active = sortIdeas(ideas.filter((i) => !i.done), sortOrder);
  const done = sortIdeas(ideas.filter(isRecentlyDone), sortOrder);
  const [adding, setAdding] = useState(false);
  const [v, setV] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);
  const [showDone, setShowDone] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

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
              ref={menuBtnRef}
              type="button"
              onClick={(e) => onMenuToggle(e.currentTarget)}
              aria-label="Toifa amallari"
              className={cn(
                "grid size-5 place-items-center rounded text-faint transition-colors hover:bg-hover hover:text-foreground",
                menuActive && "bg-hover text-foreground"
              )}
            >
              <MoreHorizontal className="size-3" />
            </button>
          </div>
        </div>
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
          <div className="border-t border-border bg-subtle/40">
            <div className="flex items-center">
              <button
                onClick={() => setShowDone((v) => !v)}
                className="flex flex-1 items-center gap-2 px-3 py-1.5 text-left text-[10.5px] uppercase tracking-wider text-muted hover:bg-hover/40 hover:text-foreground"
              >
                <ChevronRight className={cn("size-3 transition-transform", showDone && "rotate-90")} />
                <Check className="size-3" strokeWidth={3} />
                <span className="flex-1">Bajarilgan</span>
                <span className="font-mono tabular-nums">{done.length}</span>
              </button>
              {showDone && (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="mr-2 shrink-0 rounded px-1.5 py-1 text-[10.5px] font-medium text-faint transition-colors hover:bg-hover hover:text-foreground"
                  title="Bajarilganlarni ro'yxatdan yashirish (o'chmaydi)"
                >
                  Tozalash
                </button>
              )}
            </div>
            <ConfirmDialog
              open={confirmClear}
              title="Bajarilganlarni tozalash"
              description={`${done.length} ta bajarilgan g'oya shu ro'yxatdan olib tashlanadi.`}
              confirmLabel="Tozalash"
              onConfirm={() => { dismissDoneIdeas(done.map((i) => i.id)); setConfirmClear(false); }}
              onClose={() => setConfirmClear(false)}
            />
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
        isNew && !pendingDone && "task-pop"
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
                ? "bg-accent text-accent-ink hover:opacity-90"
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
