"use client";

/* Reja — mobil ko'rinish: ixcham sarlavha, toifa tablari (faol tab bosilsa —
   menyu), g'oyalar ro'yxati, pastda yopiq "Bajarilgan", tanlab birlashtirish.
   Desktop ko'rinishi reja-view.tsx'da o'zgarmagan holda qoladi. */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown, ArrowUp, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, Combine, FileText, Flag,
  Lightbulb, ListChecks, Pencil, Plus, Tag, Trash2, X, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileAdd } from "@/lib/mobile-add";
import { dismissDoneIdeas } from "@/lib/ideas-store";
import { CATEGORY_COLOR_KEYS, CATEGORY_PALETTE } from "@/lib/category-palette";
import { playOnComplete } from "@/lib/sounds";
import type { Category, CategoryColor, Idea } from "@/lib/types";
import { MonoBlock, MonoHeader, MonoSave, MonoSheet } from "../widgets/mono-sheet";
import { PickerModal } from "../widgets/picker-modal";
import { ConfirmDialog } from "../widgets/confirm-dialog";
import { ListLoader } from "../widgets/list-loader";
import { makeSubtaskId } from "../widgets/subtask-ui";
import { CollapseHead, EmptyCard, Expand, MenuRow, MobileTitle, RoundButton, Tick, groupCls, useMiniToast } from "../widgets/mobile-bits";
import { DONE_VISIBLE_DAYS, SORT_KEY, beforeIdForMove, isOnBoard, isRecentlyDone, reorderCategories, sortIdeas, type SortOrder } from "./reja-logic";
import { CategoryChips, IdeaDetailMobile, PRIORITIES } from "./idea-detail-mobile";
import { relAgo } from "./reja-format";
import { ROW_MOTION } from "../bugun/mobile-ui";

const DONE_DELAY_MS = 700;
const SWIPE = 56;

const SORT_NEXT: Record<SortOrder, SortOrder> = { new: "priority", priority: "old", old: "new" };
const SORT_META: Record<SortOrder, { label: string; hint: string; icon: LucideIcon }> = {
  new: { label: "Yangi", hint: "Yangilari tepada", icon: ArrowDown },
  priority: { label: "Muhim", hint: "Muhimlari tepada", icon: Flag },
  old: { label: "Eski", hint: "Eskilari tepada", icon: ArrowUp },
};

const colorOf = (c: CategoryColor) => CATEGORY_PALETTE[c].oklch;

type Props = {
  /** Loyiha ichida — sarlavha loyiha tablarida bor, takrorlanmaydi. */
  inProject?: boolean;
  ideas: Idea[];
  categories: Category[];
  hydrated: boolean;
  create: (input: { title: string; categoryId: string; notes?: string }) => string;
  update: (id: string, patch: Partial<Idea>) => void;
  toggleDone: (id: string) => void;
  remove: (id: string) => void;
  createCategory: (input: { label: string; color: CategoryColor }) => string;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  /** Faqat mobil ekranda nav "+" ni ushlaydi. */
  active: boolean;
};

export function RejaMobile({ ideas, categories, hydrated, create, update, toggleDone, remove, createCategory, updateCategory, removeCategory, active, inProject }: Props) {
  const { toast, toastEl } = useMiniToast();
  const [tab, setTab] = useState<string | null>(null);
  const [dir, setDir] = useState(0);
  const [sort, setSort] = useState<SortOrder>("new");
  useEffect(() => {
    const s = window.localStorage.getItem(SORT_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- saqlangan tartib faqat brauzerda
    if (s === "new" || s === "old" || s === "priority") setSort(s);
  }, []);

  const [adding, setAdding] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [catMenu, setCatMenu] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<{ mode: "create" } | { mode: "edit"; id: string } | null>(null);
  const [removeCatId, setRemoveCatId] = useState<string | null>(null);
  const [removeIdeaId, setRemoveIdeaId] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [, setDismissTick] = useState(0); // "Tozalash"dan keyin qayta chizish

  useMobileAdd(() => (categories.length === 0 ? setCatForm({ mode: "create" }) : setAdding(true)), active);

  const cur = categories.find((c) => c.id === tab) ?? categories[0];
  const board = useMemo(() => ideas.filter(isOnBoard), [ideas]);
  const total = board.length;
  const doneTotal = board.filter((i) => i.done).length;
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of categories) m[c.id] = board.filter((i) => i.categoryId === c.id && !i.done).length;
    return m;
  }, [categories, board]);
  const items = cur ? board.filter((i) => i.categoryId === cur.id) : [];
  const activeList = sortIdeas(items.filter((i) => !i.done), sort);
  const recentDone = sortIdeas(items.filter(isRecentlyDone), sort);
  const detail = detailId ? ideas.find((i) => i.id === detailId) ?? null : null;

  function changeSort() {
    const n = SORT_NEXT[sort];
    setSort(n);
    window.localStorage.setItem(SORT_KEY, n);
    toast(SORT_META[n].hint);
  }
  function selectTab(id: string) {
    const a = categories.findIndex((c) => c.id === cur?.id);
    const b = categories.findIndex((c) => c.id === id);
    if (a === b) return;
    setDir(b > a ? 1 : -1);
    setTab(id);
  }
  function goRel(delta: number) {
    const i = categories.findIndex((c) => c.id === cur?.id) + delta;
    if (i < 0 || i >= categories.length) return;
    setDir(delta);
    setTab(categories[i].id);
  }
  function createIdeas(text: string, categoryId: string) {
    // Har bir qator — alohida reja.
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    for (const t of lines) create({ title: t, categoryId });
    if (categoryId !== cur?.id) selectTab(categoryId);
    toast(lines.length > 1 ? `${lines.length} ta reja qo'shildi` : "Reja qo'shildi");
  }
  function moveCat(id: string, delta: -1 | 1) {
    const before = beforeIdForMove(categories, id, delta);
    if (before === undefined) return;
    reorderCategories(categories, id, before, updateCategory);
  }
  function deleteCat(id: string) {
    const idx = categories.findIndex((c) => c.id === id);
    for (const i of ideas.filter((x) => x.categoryId === id)) remove(i.id);
    removeCategory(id);
    const rest = categories.filter((c) => c.id !== id);
    if (cur?.id === id && rest.length) setTab(rest[Math.max(0, idx - 1)].id);
  }
  function exitSelect() { setSelecting(false); setSelected([]); setMergeOpen(false); }
  function toggleSelect(id: string) { setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); }
  function merge(name: string) {
    const sel = board.filter((i) => selected.includes(i.id));
    if (sel.length < 2) return;
    const parentId = create({ title: name.trim() || "Yangi vazifa", categoryId: sel[0].categoryId });
    update(parentId, { subtasks: sel.map((i) => ({ id: makeSubtaskId(), title: i.title, done: i.done })) });
    for (const i of sel) remove(i.id);
    if (sel[0].categoryId !== cur?.id) selectTab(sel[0].categoryId);
    exitSelect();
    setDetailId(parentId); // vaqt/jadval belgilash uchun ochamiz
    toast(`${sel.length} ta reja birlashtirildi`);
  }

  const removeCat = categories.find((c) => c.id === removeCatId);
  const removeIdea = ideas.find((i) => i.id === removeIdeaId);
  const SortIcon = SORT_META[sort].icon;

  return (
    <div className="h-full overflow-y-auto overscroll-contain pb-32 [-webkit-overflow-scrolling:touch]">
      <MobileTitle
        title={inProject ? "" : "Reja"}
        sub={total ? `${total - doneTotal} ta · ${doneTotal}/${total} bajarildi` : undefined}
        aside={
          <>
            <button type="button" onClick={changeSort} aria-label={SORT_META[sort].hint} className="flex h-10 items-center gap-1 rounded-full bg-subtle px-3.5 text-[13px] font-semibold active:scale-95">
              <SortIcon className="size-3.5" /> {SORT_META[sort].label}
            </button>
            {total >= 2 && <RoundButton icon={selecting ? X : CheckCheck} label={selecting ? "Tanlashni bekor qilish" : "Tanlab birlashtirish"} solid={selecting} onClick={() => (selecting ? exitSelect() : setSelecting(true))} />}
          </>
        }
      />

      {!hydrated && categories.length === 0 ? (
        <div className="mt-6"><ListLoader label="Yuklanmoqda…" /></div>
      ) : categories.length === 0 || !cur ? (
        <div className="mt-4 px-4">
          <EmptyCard icon={Tag} title="Toifalar yo'q" text="Boshlash uchun birinchi toifani qo'shing — masalan Ish, Uy yoki O'qish." action={
            <button type="button" onClick={() => setCatForm({ mode: "create" })} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-accent px-5 text-[14px] font-semibold text-accent-ink"><Plus className="size-4" strokeWidth={2.6} /> Yangi toifa</button>
          } />
        </div>
      ) : (
        <div className="px-4">
          <div className="mt-2.5">
            <CatTabs cats={categories} value={cur.id} counts={counts} onPick={selectTab} onMenu={setCatMenu} onAdd={() => setCatForm({ mode: "create" })} />
          </div>

          <AnimatePresence initial={false}>
            {selecting && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                <div className="mt-2 flex items-center gap-2 rounded-[20px] border border-border bg-subtle/50 py-1.5 pl-4 pr-1.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold tabular-nums">{selected.length} ta tanlandi</span>
                    <span className="block text-[12px] text-faint">Bitta umumiy rejaga birlashtiring</span>
                  </span>
                  <button type="button" disabled={selected.length < 2} onClick={() => setMergeOpen(true)} className="flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-accent-ink transition-opacity disabled:opacity-35">
                    <Combine className="size-4" /> Birlashtirish
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={cur.id}
              custom={dir}
              variants={{ enter: (d: number) => ({ x: d * 56, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d: number) => ({ x: -d * 56, opacity: 0 }) }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.16, ease: "easeOut" }}
              drag="x"
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.16}
              onDragEnd={(_, info) => {
                if (info.offset.x < -SWIPE || info.velocity.x < -500) goRel(1);
                else if (info.offset.x > SWIPE || info.velocity.x > 500) goRel(-1);
              }}
              className="mt-2.5 min-h-[50vh]"
            >
              {activeList.length === 0 ? (
                <EmptyCard icon={Lightbulb} title={`${cur.label} bo'sh`} text="Yangi g'oya yoki rejani yozib qo'ying — keyin uni kunga o'tkazasiz." action={
                  <button type="button" onClick={() => setAdding(true)} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-accent px-5 text-[14px] font-semibold text-accent-ink"><Plus className="size-4" strokeWidth={2.6} /> Reja yozish</button>
                } />
              ) : (
                <>
                  <div className={groupCls}>
                    <AnimatePresence initial={false}>
                      {activeList.map((i) => (
                        <IdeaRow key={i.id} idea={i} selecting={selecting} selected={selected.includes(i.id)} onSelect={() => toggleSelect(i.id)} onOpen={() => setDetailId(i.id)} onToggle={() => toggleDone(i.id)} />
                      ))}
                    </AnimatePresence>
                  </div>
                  <button type="button" onClick={() => setAdding(true)} className="mt-3 flex h-[52px] w-full items-center justify-center gap-1.5 rounded-[22px] border border-dashed border-border text-[14px] font-semibold text-muted active:bg-hover">
                    <Plus className="size-4" /> Reja qo&apos;shish
                  </button>
                </>
              )}

              <DoneSection
                items={recentDone}
                selecting={selecting}
                selected={selected}
                onSelect={toggleSelect}
                onOpen={setDetailId}
                onToggle={toggleDone}
                onClear={() => { dismissDoneIdeas(recentDone.map((i) => i.id)); setDismissTick((n) => n + 1); toast("Tozalandi — Arxivda saqlanadi"); }}
              />

              {categories.length > 1 && (
                <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-faint">
                  <ChevronLeft className="size-3.5" /> Toifalar orasida suring <ChevronRight className="size-3.5" />
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Yangi reja */}
      <MonoSheet open={adding} onClose={() => setAdding(false)} label="Yangi reja">
        {adding && <AddIdeaBody categories={categories} initialCat={cur?.id ?? ""} onClose={() => setAdding(false)} onAdd={(t, c) => { createIdeas(t, c); setAdding(false); }} />}
      </MonoSheet>

      <IdeaDetailMobile
        idea={detail}
        categories={categories}
        onClose={() => setDetailId(null)}
        onUpdate={update}
        onToggleDone={toggleDone}
        onDelete={(id) => setRemoveIdeaId(id)}
        onScheduled={(label) => { setDetailId(null); toast(label); }}
      />

      <CatMenu
        cat={categories.find((c) => c.id === catMenu) ?? null}
        index={categories.findIndex((c) => c.id === catMenu)}
        total={categories.length}
        ideasCount={board.filter((i) => i.categoryId === catMenu).length}
        onClose={() => setCatMenu(null)}
        onMove={(d) => catMenu && moveCat(catMenu, d)}
        onEdit={() => { if (catMenu) setCatForm({ mode: "edit", id: catMenu }); setCatMenu(null); }}
        onDelete={() => { setRemoveCatId(catMenu); setCatMenu(null); }}
      />

      <MonoSheet open={!!catForm} onClose={() => setCatForm(null)} label="Toifa">
        {catForm && (
          <CatFormBody
            key={catForm.mode === "edit" ? catForm.id : "new"}
            cat={catForm.mode === "edit" ? categories.find((c) => c.id === catForm.id) : undefined}
            usedColors={categories.map((c) => c.color)}
            onClose={() => setCatForm(null)}
            onSave={(label, color) => {
              if (catForm.mode === "edit") updateCategory(catForm.id, { label, color });
              else { const id = createCategory({ label, color }); setDir(1); setTab(id); }
              setCatForm(null);
              toast(catForm.mode === "edit" ? "Toifa saqlandi" : "Toifa qo'shildi");
            }}
          />
        )}
      </MonoSheet>

      <PickerModal open={mergeOpen} onClose={() => setMergeOpen(false)} label="Birlashtirish">
        {mergeOpen && <MergeBody items={board.filter((i) => selected.includes(i.id))} onMerge={merge} />}
      </PickerModal>

      <ConfirmDialog
        open={!!removeCat}
        destructive
        title="Toifani o'chirasizmi?"
        description={removeCat ? `"${removeCat.label}" va undagi ${ideas.filter((i) => i.categoryId === removeCat.id).length} ta reja o'chiriladi.` : undefined}
        confirmLabel="O'chirish"
        onConfirm={() => { if (removeCat) deleteCat(removeCat.id); setRemoveCatId(null); }}
        onClose={() => setRemoveCatId(null)}
      />
      <ConfirmDialog
        open={!!removeIdea}
        destructive
        title="Rejani o'chirasizmi?"
        description={removeIdea ? `"${removeIdea.title}" o'chiriladi.` : undefined}
        confirmLabel="O'chirish"
        onConfirm={() => { if (removeIdea) { remove(removeIdea.id); setDetailId(null); } setRemoveIdeaId(null); }}
        onClose={() => setRemoveIdeaId(null)}
      />
      {toastEl}
    </div>
  );
}

/* ─── Toifa tablari: faol tab bosilsa — menyu ─── */
function CatTabs({ cats, value, counts, onPick, onMenu, onAdd }: { cats: Category[]; value: string; counts: Record<string, number>; onPick: (id: string) => void; onMenu: (id: string) => void; onAdd: () => void }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    // Faol tab ko'rinib tursin (vertikal scroll'ga tegmasdan).
    const strip = stripRef.current;
    const el = refs.current[value];
    if (!strip || !el) return;
    const left = el.offsetLeft - 16;
    const right = el.offsetLeft + el.offsetWidth - strip.clientWidth + 16;
    if (strip.scrollLeft > left) strip.scrollTo({ left, behavior: "smooth" });
    else if (strip.scrollLeft < right) strip.scrollTo({ left: right, behavior: "smooth" });
  }, [value, cats]);
  return (
    <div ref={stripRef} className="relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {cats.map((c) => {
        const on = c.id === value;
        return (
          <button
            key={c.id}
            ref={(el) => { refs.current[c.id] = el; }}
            type="button"
            onClick={() => (on ? onMenu(c.id) : onPick(c.id))}
            aria-label={on ? `${c.label} — amallar` : c.label}
            className={cn("flex h-10 shrink-0 items-center gap-1.5 rounded-full border pl-3.5 text-[13.5px] font-semibold transition-colors", on ? "border-accent bg-accent pr-2.5 text-accent-ink" : "border-border bg-surface pr-3.5 text-muted")}
          >
            <span className="size-2 shrink-0 rounded-full" style={{ background: colorOf(c.color), boxShadow: on ? "0 0 0 1.5px var(--accent-ink)" : undefined }} />
            {c.label}
            <span className={cn("tabular-nums", on ? "opacity-70" : "text-faint")}>{counts[c.id] ?? 0}</span>
            {on && <ChevronDown className="-ml-0.5 size-3.5 opacity-70" strokeWidth={2.6} />}
          </button>
        );
      })}
      <button type="button" onClick={onAdd} aria-label="Yangi toifa" className="grid size-10 shrink-0 place-items-center rounded-full border border-dashed border-border-strong text-muted active:bg-hover">
        <Plus className="size-4" strokeWidth={2.4} />
      </button>
    </div>
  );
}

/* ─── Reja qatori: butun qator tafsilotni ochadi, belgi o'ngda ─── */
function IdeaRow({ idea, selecting, selected, onSelect, onOpen, onToggle }: { idea: Idea; selecting: boolean; selected: boolean; onSelect: () => void; onOpen: () => void; onToggle: () => void }) {
  const [pending, setPending] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  function toggle() {
    if (idea.done) return onToggle();
    if (pending) {
      if (timer.current) window.clearTimeout(timer.current);
      setPending(false);
      return;
    }
    setPending(true);
    playOnComplete();
    timer.current = window.setTimeout(() => { timer.current = null; onToggle(); }, DONE_DELAY_MS);
  }
  const subs = idea.subtasks ?? [];
  const subDone = subs.filter((s) => s.done).length;
  const visualDone = idea.done || pending;
  const prio = PRIORITIES.find((p) => p.value === idea.priority);
  return (
    <motion.div
      {...ROW_MOTION}
      className={cn("overflow-hidden transition-colors", selecting && selected && "bg-subtle")}
    >
      <div className="flex min-h-[64px] items-center gap-3 px-3.5">
        <button type="button" onClick={selecting ? onSelect : onOpen} className="flex min-w-0 flex-1 items-center gap-3 self-stretch py-3 text-left">
          <span className={cn("size-2 shrink-0 rounded-full", prio ? prio.dot : "bg-border-strong")} />
          <span className="min-w-0 flex-1">
            <span className={cn("block text-[15.5px] font-semibold leading-snug tracking-[-0.01em] transition-colors", visualDone && "text-faint line-through decoration-faint/60")}>{idea.title}</span>
            <span className="mt-0.5 flex items-center gap-2.5 text-[12.5px] text-faint">
              <span>{relAgo(idea.createdAt)}</span>
              {subs.length > 0 && <span className="flex items-center gap-1 tabular-nums"><ListChecks className="size-3.5" />{subDone}/{subs.length}</span>}
              {idea.notes?.trim() && <FileText className="size-3.5" />}
              {prio && <span>{prio.label}</span>}
            </span>
          </span>
        </button>
        {selecting ? (
          <button type="button" onClick={onSelect} aria-label="Tanlash" className="-m-2 grid shrink-0 place-items-center p-2">
            <span className={cn("grid size-[26px] place-items-center rounded-[9px] border-2 transition-colors", selected ? "border-accent bg-accent text-accent-ink" : "border-border-strong")}>
              {selected && <Check className="size-3.5" strokeWidth={3.5} />}
            </span>
          </button>
        ) : (
          <Tick on={visualDone} onClick={toggle} />
        )}
      </div>
    </motion.div>
  );
}

/* ─── Bajarilganlar: yopiq holda pastda ─── */
function DoneSection({ items, selecting, selected, onSelect, onOpen, onToggle, onClear }: { items: Idea[]; selecting: boolean; selected: string[]; onSelect: (id: string) => void; onOpen: (id: string) => void; onToggle: (id: string) => void; onClear: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  if (items.length === 0) return null;
  return (
    <section className="mt-5">
      <div className="flex gap-2">
        <CollapseHead icon={Check} label="Bajarilgan" count={items.length} open={open} onToggle={() => setOpen((v) => !v)} />
        <AnimatePresence initial={false}>
          {open && (
            <motion.button initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} type="button" onClick={() => setConfirm(true)} className="h-12 shrink-0 overflow-hidden whitespace-nowrap rounded-[18px] border border-border bg-surface px-4 text-[13.5px] font-semibold text-muted">
              Tozalash
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <Expand open={open}>
        <div className={cn(groupCls, "mt-2")}>
          <AnimatePresence initial={false}>
            {items.map((i) => (
              <IdeaRow key={i.id} idea={i} selecting={selecting} selected={selected.includes(i.id)} onSelect={() => onSelect(i.id)} onOpen={() => onOpen(i.id)} onToggle={() => onToggle(i.id)} />
            ))}
          </AnimatePresence>
        </div>
        <p className="mt-2 px-1 text-[12px] text-faint">Oxirgi {DONE_VISIBLE_DAYS} kunda bajarilganlar. Eskilari Arxivda.</p>
      </Expand>
      <ConfirmDialog
        open={confirm}
        title="Bajarilganlarni tozalash"
        description={`${items.length} ta bajarilgan g'oya shu ro'yxatdan olib tashlanadi. Ular Arxivda qoladi.`}
        confirmLabel="Tozalash"
        onConfirm={() => { onClear(); setConfirm(false); }}
        onClose={() => setConfirm(false)}
      />
    </section>
  );
}

/* ─── Yangi reja ─── */
function AddIdeaBody({ categories, initialCat, onClose, onAdd }: { categories: Category[]; initialCat: string; onClose: () => void; onAdd: (text: string, catId: string) => void }) {
  const [text, setText] = useState("");
  const [catId, setCatId] = useState(initialCat);
  const n = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).length;
  return (
    <>
      <MonoHeader label="Yangi reja" value={text} onChange={setText} placeholder="Nima qilmoqchisiz?" onClose={onClose} />
      <p className="flex items-center gap-1.5 px-3 text-[12.5px] text-faint">
        <ListChecks className="size-3.5" />
        {n > 1 ? `${n} ta alohida reja bo'ladi` : "Har bir yangi qator — alohida reja"}
      </p>
      <MonoBlock icon={Tag} label="Toifa">
        <CategoryChips categories={categories} value={catId} onChange={setCatId} />
      </MonoBlock>
      <MonoSave disabled={n === 0} onClick={() => onAdd(text, catId)}>{n > 1 ? `${n} ta qo'shish` : "Qo'shish"}</MonoSave>
    </>
  );
}

/* ─── Toifa menyusi ─── */
function CatMenu({ cat, index, total, ideasCount, onClose, onMove, onEdit, onDelete }: { cat: Category | null; index: number; total: number; ideasCount: number; onClose: () => void; onMove: (d: -1 | 1) => void; onEdit: () => void; onDelete: () => void }) {
  const arrow = "grid size-10 place-items-center rounded-full bg-subtle text-foreground transition-opacity active:scale-95 disabled:opacity-30";
  return (
    <PickerModal open={!!cat} onClose={onClose} label={cat?.label ?? ""}>
      {cat && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-[20px] bg-subtle/60 px-3.5 py-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in oklab, ${colorOf(cat.color)} 18%, transparent)` }}>
              <span className="size-3 rounded-full" style={{ background: colorOf(cat.color) }} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{CATEGORY_PALETTE[cat.color].label}</span>
              <span className="block text-[12.5px] text-faint">{ideasCount} ta reja</span>
            </span>
          </div>
          <div className="flex items-center justify-between rounded-[20px] border border-border px-3.5 py-2">
            <span>
              <span className="block text-[14.5px] font-semibold">Joyini surish</span>
              <span className="block text-[12.5px] tabular-nums text-faint">{index + 1} / {total}</span>
            </span>
            <span className="flex gap-2">
              <button type="button" disabled={index <= 0} onClick={() => onMove(-1)} aria-label="Chapga" className={arrow}><ChevronLeft className="size-5" /></button>
              <button type="button" disabled={index >= total - 1} onClick={() => onMove(1)} aria-label="O'ngga" className={arrow}><ChevronRight className="size-5" /></button>
            </span>
          </div>
          <div className={groupCls}>
            <MenuRow icon={Pencil} label="Nomi va rangini o'zgartirish" onClick={onEdit} trailing={<ChevronRight className="size-4 text-faint" />} />
            <MenuRow icon={Trash2} label="Toifani o'chirish" onClick={onDelete} danger />
          </div>
        </div>
      )}
    </PickerModal>
  );
}

/* ─── Toifa formasi ─── */
function CatFormBody({ cat, usedColors, onClose, onSave }: { cat?: Category; usedColors: CategoryColor[]; onClose: () => void; onSave: (label: string, color: CategoryColor) => void }) {
  const [label, setLabel] = useState(cat?.label ?? "");
  const [color, setColor] = useState<CategoryColor>(cat?.color ?? CATEGORY_COLOR_KEYS.find((k) => k !== "white" && k !== "gray" && !usedColors.includes(k)) ?? "indigo");
  return (
    <>
      <MonoHeader label={cat ? "Toifani tahrirlash" : "Yangi toifa"} value={label} onChange={setLabel} placeholder="Masalan: Oila, Sport, Sayohat" onEnter={() => label.trim() && onSave(label.trim(), color)} onClose={onClose} />
      <MonoBlock icon={Tag} label="Rangi" aside={<span className="opacity-60">{CATEGORY_PALETTE[color].label}</span>}>
        <div className="grid grid-cols-6 gap-2">
          {CATEGORY_COLOR_KEYS.map((k) => {
            const on = color === k;
            return (
              <button key={k} type="button" onClick={() => setColor(k)} aria-label={CATEGORY_PALETTE[k].label} className={cn("grid aspect-square place-items-center rounded-full transition-transform active:scale-90", on && "ring-2 ring-foreground ring-offset-2 ring-offset-surface")} style={{ background: colorOf(k) }}>
                {on && <Check className="size-4 text-background" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </MonoBlock>
      <div className="flex items-center gap-2 rounded-[22px] border border-border bg-surface p-3">
        <span className="text-[11.5px] font-semibold opacity-75">Ko&apos;rinishi</span>
        <span className="ml-auto flex h-10 items-center gap-2 rounded-full border border-border bg-background pl-3.5 pr-4 text-[14px] font-semibold">
          <span className="size-2 rounded-full" style={{ background: colorOf(color) }} />
          {label.trim() || "Toifa nomi"}
        </span>
      </div>
      <MonoSave disabled={!label.trim()} onClick={() => onSave(label.trim(), color)}>{cat ? "Saqlash" : "Qo'shish"}</MonoSave>
    </>
  );
}

/* ─── Birlashtirish ─── */
function MergeBody({ items, onMerge }: { items: Idea[]; onMerge: (name: string) => void }) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // PickerModal ochilishda fokusni olib tashlaydi — undan keyin maydonga qaytaramiz.
  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="space-y-3">
      <input ref={inputRef} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onMerge(name); }} placeholder="Umumiy nom (masalan: Bozorlik)" className="h-12 w-full rounded-[16px] border border-border bg-background px-3.5 text-[16px] outline-none placeholder:text-faint focus:border-border-strong" />
      <p className="flex items-center gap-1.5 px-1 text-[13px] font-semibold text-muted"><ListChecks className="size-4" /> {items.length} ta reja ichki vazifa bo&apos;ladi</p>
      <div className={cn(groupCls, "max-h-[220px] overflow-y-auto")}>
        {items.map((i) => (
          <div key={i.id} className="flex min-h-11 items-center gap-2.5 px-3.5 text-[14.5px]">
            <span className="size-1.5 shrink-0 rounded-full bg-faint" />
            <span className="truncate">{i.title}</span>
          </div>
        ))}
      </div>
      <p className="px-1 text-[12.5px] text-faint">Birlashgach, sana va vaqt belgilash uchun ochiladi.</p>
      <button type="button" disabled={!name.trim()} onClick={() => onMerge(name)} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[22px] bg-accent text-[15.5px] font-bold text-accent-ink disabled:bg-subtle disabled:text-faint">
        <Combine className="size-5" /> Birlashtirish
      </button>
    </div>
  );
}
