"use client";

/**
 * "Odat" bo'limi — backend'ga ulangan.
 * Odatlar Plan tizimiga occurrence sifatida tushadi (Bugun/Agenda/Kalendarda
 * ko'rinadi). Bu yerda: Odatlar (boshqaruv) + Kalendar (bajarilish ko'rinishi).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity, Apple, Archive, Bed, Bike, BookOpen, Brain, Briefcase, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Code,
  Coffee, DollarSign, Droplet, Dumbbell, Flame, Folder, Footprints, GraduationCap, Hammer,
  Headphones, Heart, Home, Languages, Leaf, Moon, Mountain, Music, Palette, Pencil,
  Pill, Plus, Rocket, Salad, ShoppingCart, Smile, Sparkles, Sprout, Star, Sun, Target, Trash2, Users,
  Wallet, X, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHabits, markHabitDay } from "@/lib/habits-store";
import { useHabitCategories } from "@/lib/habit-categories-store";
import { usePlans } from "@/lib/plans-store";
import type { Habit, HabitCategory, Plan } from "@/lib/types";
import { occupiedTimeSlots } from "@/lib/dates";
import { Dialog } from "./widgets/dialog";
import { ConfirmDialog } from "./widgets/confirm-dialog";
import { TimePickerPopover } from "./widgets/time-picker-popover";

/* ─── Ikonalar ─── */
const ICONS = {
  heart: Heart, dumbbell: Dumbbell, book: BookOpen, sparkles: Sparkles, brain: Brain, coffee: Coffee,
  moon: Moon, sun: Sun, target: Target, droplet: Droplet, leaf: Leaf, activity: Activity, folder: Folder,
  bike: Bike, footprints: Footprints, apple: Apple, salad: Salad, pill: Pill, bed: Bed, music: Music,
  headphones: Headphones, palette: Palette, pencil: Pencil, code: Code, languages: Languages,
  grad: GraduationCap, briefcase: Briefcase, dollar: DollarSign, rocket: Rocket, wallet: Wallet,
  cart: ShoppingCart, home: Home, users: Users, smile: Smile, flame: Flame, mountain: Mountain,
  star: Star, zap: Zap, sprout: Sprout, hammer: Hammer,
} as const;
type IconKey = keyof typeof ICONS;
const ICON_CHOICES = Object.keys(ICONS) as IconKey[];
function randomIcon(): IconKey { return ICON_CHOICES[Math.floor(Math.random() * ICON_CHOICES.length)]; }
function CategoryIcon({ k, className }: { k: string; className?: string }) { const Ic = ICONS[k as IconKey] ?? Folder; return <Ic className={className} strokeWidth={1.75} />; }

const UZ_DAYS_SHORT = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];
const WEEK_FROM_MON = [1, 2, 3, 4, 5, 6, 0];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/* ─── Sana ─── */
function midnight(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function iso(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
const TODAY = midnight(new Date());
function isScheduled(h: Habit, d: Date): boolean { return h.days.includes(d.getDay()); }
function scheduleLabel(days: number[]): string {
  if (days.length >= 7) return "Har kuni";
  if (days.length === 0) return "Hech qachon";
  if (days.length === 5 && [1, 2, 3, 4, 5].every((x) => days.includes(x))) return "Ish kunlari";
  return WEEK_FROM_MON.filter((d) => days.includes(d)).map((d) => UZ_DAYS_SHORT[d]).join(" ");
}
type Logs = Record<string, Set<string>>;
function isDoneOn(log: Set<string>, d: Date): boolean { return log.has(iso(d)); }

/* Odatning tanlangan hafta kunlari bo'yicha band slotlar (keyingi 7 kun ichida
   har bir kun bir marta uchraydi). Tahrirda odatning o'z occurrence'lari hisobga
   olinmaydi (excludeHabitId). */
function occupiedForDays(plans: Plan[], days: number[], excludeHabitId?: string): string[] {
  if (days.length === 0) return [];
  const base = excludeHabitId ? plans.filter((p) => p.habitId !== excludeHabitId) : plans;
  const set = new Set<string>();
  for (let off = 0; off < 7; off++) {
    const d = addDays(TODAY, off);
    if (!days.includes(d.getDay())) continue;
    for (const s of occupiedTimeSlots(base, iso(d))) set.add(s);
  }
  return [...set];
}

/* ════════════════════════════════════════════════════════════ */

type Tab = "habits" | "calendar";

export function OdatView() {
  const [tab, setTab] = useState<Tab>("habits");
  const { categories: cats, create: createCat, update: updateCat, remove: removeCat } = useHabitCategories();
  const { habits, archived, create, update, archive, restore, remove } = useHabits();
  const { plans, toggleStatus } = usePlans();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addCat, setAddCat] = useState<string | null | undefined>(undefined); // odat qo'shishda oldindan tanlangan toifa (undefined = majburiy tanlov)
  const [addDaysPreset, setAddDaysPreset] = useState<number[] | undefined>(undefined); // kun ustiga bosib qo'shishda oldindan tanlangan hafta kuni
  const [showAddCat, setShowAddCat] = useState(false);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ kind: "habit" | "category"; id: string; name: string } | null>(null);

  // Bajarilish — occurrence Plan'lardan (habitId + DONE) olinadi.
  const logs = useMemo<Logs>(() => {
    const m: Logs = {};
    for (const p of plans) { if (!p.habitId || p.status !== "DONE") continue; (m[p.habitId] ??= new Set<string>()).add(p.scheduledFor); }
    return m;
  }, [plans]);
  // habitId|sana → planId (kun belgilash uchun, faqat occurrence mavjud bo'lsa)
  const occById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of plans) if (p.habitId) m.set(`${p.habitId}|${p.scheduledFor}`, p.id);
    return m;
  }, [plans]);

  function toggleDay(h: Habit, d: Date) { const pid = occById.get(`${h.id}|${iso(d)}`); if (pid) toggleStatus(pid); else void markHabitDay(h.id, iso(d)); }
  function saveHabit(id: string, patch: { title: string; categoryId: string | null; days: number[]; time: string | undefined }) { update(id, patch); setDetailId(null); }
  function addHabitWeekday(id: string, weekday: number) { const h = habits.find((x) => x.id === id); if (!h || h.days.includes(weekday)) return; update(id, { days: [...h.days, weekday].sort((a, b) => a - b) }); }
  function newHabitForDay(weekday: number) { setAddCat(undefined); setAddDaysPreset([weekday]); setShowAdd(true); }
  function askRemoveHabit(id: string) { const h = habits.find((x) => x.id === id); setPending({ kind: "habit", id, name: h?.title ?? "" }); }
  function askRemoveCategory(id: string) { const c = cats.find((x) => x.id === id); setPending({ kind: "category", id, name: c?.label ?? "" }); }
  function archiveHabit(id: string) { archive(id); setDetailId(null); }
  function confirmDelete() {
    if (!pending) return;
    if (pending.kind === "habit") { remove(pending.id); setDetailId(null); }
    else { removeCat(pending.id); }
    setPending(null);
  }

  const detailHabit = detailId ? habits.find((h) => h.id === detailId) ?? null : null;
  const editCat = editCatId ? cats.find((c) => c.id === editCatId) ?? null : null;

  return (
    <div className="flex flex-col overflow-y-auto" style={{ height: "var(--tg-vh, 100vh)" }}>
      <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-background/85 backdrop-blur">
        <div className="flex h-12 items-center justify-between px-4 md:px-6">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] sm:text-[13px]">Odat</h1>
          <button type="button" onClick={() => { setAddCat(undefined); setAddDaysPreset(undefined); setShowAdd(true); }} className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground" aria-label="Yangi odat"><Plus className="size-4" /></button>
        </div>
        <div className="mx-auto flex max-w-xl gap-6 px-5 md:px-6">
          {([["habits", "Odatlar"], ["calendar", "Kalendar"]] as [Tab, string][]).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setTab(v)} className={cn("relative py-2.5 text-[13px] font-medium transition-colors", tab === v ? "text-foreground" : "text-faint hover:text-muted")}>
              {label}{tab === v && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-foreground" />}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto w-full max-w-xl px-5 pb-12 md:px-6">
        {tab === "habits" ? (
          <HabitsTab cats={cats} habits={habits} archived={archived} onOpen={setDetailId} onAddHabit={(pre) => { setAddCat(pre); setAddDaysPreset(undefined); setShowAdd(true); }} onAddCategory={() => setShowAddCat(true)} onEditCategory={(id) => setEditCatId(id)} onDeleteCategory={askRemoveCategory} onRestore={restore} onDeleteHabit={askRemoveHabit} />
        ) : (
          <CalendarTab cats={cats} habits={habits} logs={logs} onToggle={toggleDay} onOpen={setDetailId} onAddExisting={addHabitWeekday} onNewHabit={newHabitForDay} />
        )}
      </div>

      {showAdd && <AddHabitModal cats={cats} plans={plans} initialCategory={addCat} initialDays={addDaysPreset} onClose={() => setShowAdd(false)} onAdd={(inp) => create(inp)} onCreateCategory={(inp) => createCat(inp)} />}
      {showAddCat && <AddCategoryModal onClose={() => setShowAddCat(false)} onAdd={(inp) => createCat(inp)} />}
      {editCat && <EditCategoryModal cat={editCat} onClose={() => setEditCatId(null)} onSave={(patch) => { updateCat(editCat.id, patch); setEditCatId(null); }} />}
      {detailHabit && <HabitDetailSheet cats={cats} plans={plans} habit={detailHabit} onClose={() => setDetailId(null)} onArchive={archiveHabit} onRemove={askRemoveHabit} onSave={saveHabit} onCreateCategory={(inp) => createCat(inp)} />}
      {pending && (
        <ConfirmDialog
          open
          destructive
          title={pending.kind === "habit" ? "Odatni o'chirish?" : "Toifani o'chirish?"}
          description={pending.kind === "habit"
            ? `"${pending.name}" va uning vazifalari o'chiriladi. Bu amalni qaytarib bo'lmaydi.`
            : `"${pending.name}" o'chiriladi. Undagi odatlar toifasiz bo'lib qoladi.`}
          confirmLabel="O'chirish"
          onConfirm={confirmDelete}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  );
}

/* ════════════════ ODATLAR — Halqa cardlar + 5 ro'yxat varianti ════════════════ */

type P = { cats: HabitCategory[]; habits: Habit[]; archived: Habit[]; onOpen: (id: string) => void; onAddHabit: (preselect?: string | null) => void; onAddCategory: () => void; onEditCategory: (id: string) => void; onDeleteCategory: (id: string) => void; onRestore: (id: string) => void; onDeleteHabit: (id: string) => void };
/* helperlar */
function iconOf(cats: HabitCategory[], id: string | null): string { return cats.find((c) => c.id === id)?.icon ?? "folder"; }

function HabitsTab({ cats, habits, archived, onOpen, onAddHabit, onAddCategory, onEditCategory, onDeleteCategory, onRestore, onDeleteHabit }: P) {
  const [sel, setSel] = useState("all");
  const [menu, setMenu] = useState<{ id: string; rect: DOMRect } | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const cur = sel === "all" || cats.some((c) => c.id === sel) ? sel : "all";
  const items = cur === "all" ? habits : catHabits(habits, cur);
  const showIcon = cur === "all";
  function onTabClick(id: string, e: React.MouseEvent<HTMLButtonElement>) {
    if (cur === id) setMenu({ id, rect: e.currentTarget.getBoundingClientRect() });
    else setSel(id);
  }

  // Faqat scroll bor tomonda fade ko'rsatamiz (joyiga sig'sa — fade yo'q).
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });
  function updateEdge() { const el = scrollRef.current; if (!el) return; setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 }); }
  useEffect(() => { updateEdge(); const el = scrollRef.current; if (!el) return; const ro = new ResizeObserver(updateEdge); ro.observe(el); window.addEventListener("resize", updateEdge); return () => { ro.disconnect(); window.removeEventListener("resize", updateEdge); }; }, [cats.length]);
  const fadeL = edge.left ? "transparent, #000 36px" : "#000 0";
  const fadeR = edge.right ? "#000 calc(100% - 36px), transparent" : "#000 100%";
  const maskVal = `linear-gradient(to right, ${fadeL}, ${fadeR})`;

  return (
    <div className="pt-4">
      <div className="flex items-stretch border-b border-border">
        <button type="button" onClick={() => setSel("all")} className={cn("relative flex shrink-0 items-center border-r border-border px-3 py-2.5 text-[13px] font-medium transition-colors", cur === "all" ? "text-foreground" : "text-faint hover:text-muted")}>
          Barchasi{cur === "all" && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />}
        </button>
        <div
          ref={scrollRef}
          onScroll={updateEdge}
          className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto"
          style={{ maskImage: maskVal, WebkitMaskImage: maskVal }}
        >
          {cats.length === 0 ? (
            <button type="button" onClick={onAddCategory} className="flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium text-faint hover:text-foreground"><Plus className="size-3.5" /> Toifa qo&apos;shish</button>
          ) : cats.map((c) => (
            <button key={c.id} type="button" onClick={(e) => onTabClick(c.id, e)} className={cn("relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium transition-colors", cur === c.id ? "text-foreground" : "text-faint hover:text-muted")}>
              <CategoryIcon k={c.icon} className="size-4" />{c.label}
              {cur === c.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />}
            </button>
          ))}
        </div>
        {cats.length > 0 && <button type="button" onClick={onAddCategory} className="flex shrink-0 items-center gap-1 border-l border-border px-3 text-[13px] font-medium text-faint hover:text-foreground" aria-label="Toifa qo'shish"><Plus className="size-4" /></button>}
      </div>

      {items.length === 0 ? (
        <button type="button" onClick={() => onAddHabit(cur === "all" ? undefined : cur)} className="mt-4 flex w-full flex-col items-center rounded-2xl border border-dashed border-border py-12 text-center transition-colors hover:border-border-strong hover:bg-hover/30">
          <span className="grid size-12 place-items-center rounded-2xl bg-subtle text-foreground"><Plus className="size-6" /></span>
          <span className="mt-3 text-[14.5px] font-medium">Odat qo&apos;shish</span>
          <span className="mt-1 text-[12.5px] text-faint">Hali odat yo&apos;q — birinchisini qo&apos;shing</span>
        </button>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
          {items.map((h, i) => (
            <button key={h.id} type="button" onClick={() => onOpen(h.id)} className={cn("flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-hover/40", i > 0 && "border-t border-border")}>
              {showIcon && <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-subtle text-muted"><CategoryIcon k={iconOf(cats, h.categoryId)} className="size-4" /></span>}
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium tracking-[-0.01em]">{h.title}</span>
              <WeekDays days={h.days} />
            </button>
          ))}
          <div className="border-t border-border"><AddRow label="Odat qo'shish" onClick={() => onAddHabit(cur === "all" ? undefined : cur)} /></div>
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-5">
          <button type="button" onClick={() => setShowArchive((v) => !v)} className="flex w-full items-center justify-between px-1 py-2 text-[12px] font-medium text-faint hover:text-foreground">
            <span className="inline-flex items-center gap-1.5"><Archive className="size-3.5" /> Arxivlangan ({archived.length})</span>
            <ChevronDown className={cn("size-4 transition-transform", showArchive && "rotate-180")} />
          </button>
          {showArchive && (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              {archived.map((h, i) => (
                <div key={h.id} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-border")}>
                  <span className="min-w-0 flex-1 truncate text-[14px] text-muted">{h.title}</span>
                  <button type="button" onClick={() => onRestore(h.id)} className="shrink-0 text-[12px] font-medium text-faint hover:text-foreground">Qaytarish</button>
                  <button type="button" onClick={() => onDeleteHabit(h.id)} aria-label="O'chirish" className="grid size-7 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-danger-soft hover:text-danger"><Trash2 className="size-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {menu && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setMenu(null)} />
          <div className="fixed z-[61] min-w-[150px] overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-xl" style={{ top: menu.rect.bottom + 6, left: Math.min(menu.rect.left, (typeof window !== "undefined" ? window.innerWidth : 360) - 162) }}>
            <button type="button" onClick={() => { onEditCategory(menu.id); setMenu(null); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-foreground hover:bg-hover"><Pencil className="size-4 text-faint" /> Tahrirlash</button>
            <button type="button" onClick={() => { onDeleteCategory(menu.id); setMenu(null); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-danger hover:bg-danger-soft"><Trash2 className="size-4" /> O&apos;chirish</button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

function catHabits(habits: Habit[], catId: string) { return habits.filter((h) => h.categoryId === catId); }
function WeekDays({ days }: { days: number[] }) {
  return <span className="flex shrink-0 items-center gap-1">{WEEK_FROM_MON.map((d) => <span key={d} className={cn("text-[8px] font-medium leading-none", days.includes(d) ? "text-foreground/50" : "text-faint/35")}>{UZ_DAYS_SHORT[d]}</span>)}</span>;
}
function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-medium text-faint transition-colors hover:text-foreground"><Plus className="size-4" />{label}</button>;
}

/* ════════════════ KALENDAR ════════════════ */

function CalendarTab({ cats, habits, logs, onToggle, onOpen, onAddExisting, onNewHabit }: { cats: HabitCategory[]; habits: Habit[]; logs: Logs; onToggle: (h: Habit, d: Date) => void; onOpen: (id: string) => void; onAddExisting: (habitId: string, weekday: number) => void; onNewHabit: (weekday: number) => void }) {
  const [mode, setMode] = useState<"week" | "month">("week");
  const [dayDetail, setDayDetail] = useState<string | null>(null);
  return (
    <div className="pt-6">
      <div className="mx-auto flex max-w-[220px] gap-1 rounded-lg bg-subtle p-1">
        {([["week", "Hafta"], ["month", "Oy"]] as ["week" | "month", string][]).map(([v, label]) => (
          <button key={v} type="button" onClick={() => setMode(v)} className={cn("flex-1 rounded-md py-1.5 text-[12.5px] font-medium transition-colors", mode === v ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground")}>{label}</button>
        ))}
      </div>
      {mode === "week" ? <WeekMode cats={cats} habits={habits} logs={logs} onToggle={onToggle} onOpen={onOpen} onAddExisting={onAddExisting} onNewHabit={onNewHabit} /> : <MonthMode habits={habits} logs={logs} onDayClick={(k) => setDayDetail(k)} />}
      {dayDetail && <DayHabitsSheet cats={cats} dateKey={dayDetail} habits={habits} logs={logs} onToggle={onToggle} onOpen={onOpen} onAddExisting={onAddExisting} onNewHabit={onNewHabit} onClose={() => setDayDetail(null)} />}
    </div>
  );
}

function WeekMode({ cats, habits, logs, onToggle, onOpen, onAddExisting, onNewHabit }: { cats: HabitCategory[]; habits: Habit[]; logs: Logs; onToggle: (h: Habit, d: Date) => void; onOpen: (id: string) => void; onAddExisting: (habitId: string, weekday: number) => void; onNewHabit: (weekday: number) => void }) {
  const [offset, setOffset] = useState(0);
  const week = useMemo(() => { const mondayOff = (TODAY.getDay() + 6) % 7; const monday = addDays(TODAY, -mondayOff + offset * 7); return Array.from({ length: 7 }, (_, i) => addDays(monday, i)); }, [offset]);
  const [sel, setSel] = useState<string>(iso(TODAY));
  const selDate = week.find((d) => iso(d) === sel) ?? week[0];
  const dueSel = habits.filter((h) => isScheduled(h, selDate));
  const future = selDate.getTime() > TODAY.getTime();
  function goWeek(delta: number) { const nw = offset + delta; setOffset(nw); const mondayOff = (TODAY.getDay() + 6) % 7; setSel(nw === 0 ? iso(TODAY) : iso(addDays(TODAY, -mondayOff + nw * 7))); }
  const rangeLabel = `${week[0].toLocaleDateString("uz", { day: "numeric", month: "short" })} – ${week[6].toLocaleDateString("uz", { day: "numeric", month: "short" })}`;
  const weekPct = useMemo(() => { let sc = 0, dn = 0; for (const d of week) { if (d.getTime() > TODAY.getTime()) continue; for (const h of habits) { if (!isScheduled(h, d)) continue; sc++; if (isDoneOn(logs[h.id] ?? new Set(), d)) dn++; } } return sc ? Math.round((dn / sc) * 100) : 0; }, [week, habits, logs]);
  return (
    <>
      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={() => goWeek(-1)} aria-label="Oldingi hafta" className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><ChevronLeft className="size-4" /></button>
        <span className="text-[12.5px] font-medium text-muted">{offset === 0 ? "Shu hafta" : rangeLabel}</span>
        <button type="button" onClick={() => goWeek(1)} aria-label="Keyingi hafta" className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><ChevronRight className="size-4" /></button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {week.map((d) => {
          const active = iso(d) === sel; const isToday = iso(d) === iso(TODAY); const fut = d.getTime() > TODAY.getTime();
          const dueN = habits.filter((h) => isScheduled(h, d)).length; const doneN = habits.filter((h) => isScheduled(h, d) && isDoneOn(logs[h.id] ?? new Set(), d)).length; const full = dueN > 0 && doneN === dueN;
          return (
            <button key={iso(d)} type="button" onClick={() => setSel(iso(d))} className={cn("flex flex-col items-center gap-1.5 rounded-xl border py-2.5 transition-colors", active ? "border-foreground" : "border-transparent hover:bg-hover", fut && !active && "opacity-60")}>
              <span className={cn("text-[10px] uppercase tracking-wide", active ? "text-foreground" : "text-faint")}>{UZ_DAYS_SHORT[d.getDay()]}</span>
              <span className={cn("text-[15px] font-semibold tabular-nums", isToday && "text-foreground", !isToday && !active && "text-muted")}>{d.getDate()}</span>
              <span className={cn("size-1.5 rounded-full", full ? "bg-foreground" : dueN ? "bg-border-strong" : "bg-transparent")} />
            </button>
          );
        })}
      </div>
      <p className="mb-1 mt-7 text-[11px] font-medium uppercase tracking-[0.18em] text-faint">{iso(selDate) === iso(TODAY) ? "Bugun" : selDate.toLocaleDateString("uz", { weekday: "long", day: "numeric", month: "long" })}{future && " · kelajak"}</p>
      {dueSel.length === 0 ? <p className="py-10 text-center text-[13px] text-faint">Bu kun uchun odat yo&apos;q</p> : dueSel.map((h) => {
        const done = isDoneOn(logs[h.id] ?? new Set(), selDate);
        return (
          <div key={h.id} className="flex items-center gap-3 border-b border-border py-3.5 last:border-0">
            <button type="button" onClick={() => onOpen(h.id)} className="min-w-0 flex-1 text-left"><p className={cn("truncate text-[14.5px] tracking-[-0.01em]", done ? "text-faint line-through" : "text-foreground")}>{h.title}</p><p className="mt-0.5 truncate text-[12px] text-faint">{cats.find((c) => c.id === h.categoryId)?.label ?? "Toifasiz"}</p></button>
            <CheckButton done={done} sched={!future} onClick={() => onToggle(h, selDate)} />
          </div>
        );
      })}
      <DayAdd date={selDate} habits={habits} onAddExisting={onAddExisting} onNewHabit={onNewHabit} />
      <BigRing pct={weekPct} caption={offset === 0 ? "Shu hafta bajarildi" : `${rangeLabel} bajarildi`} />
    </>
  );
}

function MonthMode({ habits, logs, onDayClick }: { habits: Habit[]; logs: Logs; onDayClick: (key: string) => void }) {
  const [mOff, setMOff] = useState(0);
  const dayRatio = useMemo(() => (d: Date) => { const due = habits.filter((h) => isScheduled(h, d)); const done = due.filter((h) => isDoneOn(logs[h.id] ?? new Set(), d)).length; return { due: due.length, done }; }, [habits, logs]);
  const base = useMemo(() => new Date(TODAY.getFullYear(), TODAY.getMonth() + mOff, 1), [mOff]);
  const month = useMemo(() => { const startOff = (base.getDay() + 6) % 7; const dim = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate(); const cells: (Date | null)[] = []; for (let i = 0; i < startOff; i++) cells.push(null); for (let n = 1; n <= dim; n++) cells.push(new Date(base.getFullYear(), base.getMonth(), n)); while (cells.length % 7 !== 0) cells.push(null); return cells; }, [base]);
  const monthLabel = base.toLocaleDateString("uz", { month: "long", year: "numeric" });
  const monthPct = useMemo(() => { let sc = 0, dn = 0; for (const d of month) { if (!d || d.getTime() > TODAY.getTime()) continue; const r = dayRatio(d); sc += r.due; dn += r.done; } return sc ? Math.round((dn / sc) * 100) : 0; }, [month, dayRatio]);
  return (
    <>
      <div className="mt-5 rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => setMOff((o) => o - 1)} aria-label="Oldingi oy" className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><ChevronLeft className="size-4" /></button>
          <p className="text-[14px] font-semibold capitalize tracking-[-0.01em]">{monthLabel}</p>
          <button type="button" onClick={() => setMOff((o) => o + 1)} aria-label="Keyingi oy" className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><ChevronRight className="size-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"].map((l) => <span key={l} className="pb-1 text-[10px] uppercase tracking-wide text-faint">{l}</span>)}
          {month.map((d, i) => { if (!d) return <span key={i} />; const future = d.getTime() > TODAY.getTime(); const r = dayRatio(d); const ratio = r.due > 0 ? r.done / r.due : 0; return (
            <button key={i} type="button" onClick={() => onDayClick(iso(d))} className="flex h-9 items-center justify-center"><DayCircle day={d.getDate()} ratio={ratio} due={r.due} future={future} isToday={iso(d) === iso(TODAY)} /></button>
          ); })}
        </div>
      </div>
      <p className="mt-4 text-center text-[11.5px] text-faint">Kunni bosib o&apos;sha kun odatlarini ko&apos;ring</p>
      <BigRing pct={monthPct} caption={`${monthLabel} bajarildi`} />
    </>
  );
}

function DayHabitsSheet({ cats, dateKey, habits, logs, onToggle, onOpen, onAddExisting, onNewHabit, onClose }: { cats: HabitCategory[]; dateKey: string; habits: Habit[]; logs: Logs; onToggle: (h: Habit, d: Date) => void; onOpen: (id: string) => void; onAddExisting: (habitId: string, weekday: number) => void; onNewHabit: (weekday: number) => void; onClose: () => void }) {
  const [y, m, d] = dateKey.split("-").map(Number); const date = midnight(new Date(y, m - 1, d)); const future = date.getTime() > TODAY.getTime(); const isPast = date.getTime() < TODAY.getTime();
  const due = habits.filter((h) => isScheduled(h, date)); const doneN = due.filter((h) => isDoneOn(logs[h.id] ?? new Set(), date)).length;
  const label = iso(date) === iso(TODAY) ? "Bugun" : date.toLocaleDateString("uz", { weekday: "long", day: "numeric", month: "long" });
  return (
    <Dialog open onClose={onClose} mobilePlacement="bottom">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <div><p className="text-[16px] font-semibold capitalize tracking-[-0.01em]">{label}</p><p className="mt-0.5 text-[12px] text-faint">{doneN}/{due.length} bajarildi</p></div>
        <button type="button" onClick={onClose} aria-label="Yopish" className="-mr-1 grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><X className="size-4" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
        {due.length === 0 ? <p className="py-8 text-center text-[13px] text-faint">Bu kun uchun odat yo&apos;q</p> : due.map((h) => { const done = isDoneOn(logs[h.id] ?? new Set(), date); return (
          <div key={h.id} className="flex items-center gap-3 border-b border-border py-3.5 last:border-0"><button type="button" onClick={() => onOpen(h.id)} className="min-w-0 flex-1 text-left"><p className={cn("truncate text-[14.5px]", done ? "text-faint line-through" : "text-foreground")}>{h.title}</p><p className="mt-0.5 text-[12px] text-faint">{cats.find((c) => c.id === h.categoryId)?.label ?? "Toifasiz"}</p></button><CheckButton done={done} sched={!future} onClick={() => onToggle(h, date)} /></div>
        ); })}
        {!isPast && <DayAdd date={date} habits={habits} onAddExisting={onAddExisting} onNewHabit={onNewHabit} />}
      </div>
    </Dialog>
  );
}

/* Kun ostida: o'sha hafta kuniga mavjud odat yoki yangi odat qo'shish. */
function DayAdd({ date, habits, onAddExisting, onNewHabit }: { date: Date; habits: Habit[]; onAddExisting: (habitId: string, weekday: number) => void; onNewHabit: (weekday: number) => void }) {
  const [open, setOpen] = useState(false);
  const wd = date.getDay();
  const candidates = habits.filter((h) => !h.days.includes(wd));
  return (
    <div className="py-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-faint transition-colors hover:text-foreground"><Plus className="size-4" /> Odat qo&apos;shish</button>
      {open && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface">
          <button type="button" onClick={() => { onNewHabit(wd); setOpen(false); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13.5px] font-medium hover:bg-hover"><Plus className="size-4 text-faint" /> Yangi odat</button>
          {candidates.length > 0 && <p className="border-t border-border px-4 pb-1 pt-2 text-[10.5px] uppercase tracking-[0.15em] text-faint">Mavjud odatlar</p>}
          {candidates.map((h) => (
            <button key={h.id} type="button" onClick={() => { onAddExisting(h.id, wd); setOpen(false); }} className="flex w-full items-center gap-2.5 border-t border-border px-4 py-2.5 text-left text-[13.5px] hover:bg-hover">{h.title}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Umumiy kichik komponentlar ─── */
function CheckButton({ done, sched, onClick }: { done: boolean; sched: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} disabled={!sched} aria-label="Bajarildi" className={cn("grid size-7 shrink-0 place-items-center rounded-full border transition-all active:scale-90 disabled:opacity-25", done ? "border-foreground bg-foreground text-background" : "border-border-strong text-transparent hover:border-foreground")}><Check className="size-3.5" strokeWidth={2.5} /></button>;
}
function BigRing({ pct, caption }: { pct: number; caption: string }) {
  const R = 51, C = 2 * Math.PI * R;
  return (
    <div className="mt-5 flex flex-col items-center">
      <span className="relative grid size-[138px] place-items-center">
        <svg className="size-[138px] -rotate-90" viewBox="0 0 138 138">
          <circle cx="69" cy="69" r={R} fill="none" stroke="var(--subtle)" strokeWidth="9" />
          <circle cx="69" cy="69" r={R} fill="none" stroke="var(--foreground)" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} style={{ transition: "stroke-dashoffset 0.5s ease-out" }} />
        </svg>
        <span className="absolute text-[30px] font-semibold tabular-nums">{pct}%</span>
      </span>
      <span className="mt-2 text-[11.5px] capitalize text-faint">{caption}</span>
    </div>
  );
}

function DayCircle({ day, ratio, due, future, isToday }: { day: number; ratio: number; due: number; future: boolean; isToday: boolean }) {
  const showRing = due > 0 && !future && ratio > 0; const R = 11, C = 2 * Math.PI * R;
  return (
    <span className={cn("relative grid size-7 place-items-center rounded-full", isToday && "ring-1 ring-foreground ring-offset-1 ring-offset-surface")}>
      {showRing && <svg className="absolute inset-0 size-7 -rotate-90" viewBox="0 0 28 28" aria-hidden><circle cx="14" cy="14" r={R} fill="none" stroke="var(--border)" strokeWidth="2.5" /><circle cx="14" cy="14" r={R} fill="none" stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - ratio)} /></svg>}
      <span className={cn("relative z-[1] text-[12px] tabular-nums", showRing ? "font-medium text-foreground" : future ? "text-faint/40" : due > 0 ? "text-muted" : "text-faint/40")}>{day}</span>
    </span>
  );
}

/* ════════ Odat detali ════════ */
function HabitDetailSheet({ cats, plans, habit, onClose, onArchive, onRemove, onSave, onCreateCategory }: {
  cats: HabitCategory[]; plans: Plan[]; habit: Habit; onClose: () => void; onArchive: (id: string) => void; onRemove: (id: string) => void; onSave: (id: string, patch: { title: string; categoryId: string | null; days: number[]; time: string | undefined }) => void; onCreateCategory: (input: { label: string; icon: string }) => string;
}) {
  const [title, setTitle] = useState(habit.title);
  const [categoryId, setCategoryId] = useState<string | null>(habit.categoryId);
  const [days, setDays] = useState<number[]>([...habit.days]);
  const [time, setTime] = useState(habit.time ?? "");
  const [catCreating, setCatCreating] = useState(false); const [newLabel, setNewLabel] = useState(""); const [newIcon, setNewIcon] = useState<IconKey>(randomIcon);
  const daily = days.length >= 7;
  const cat = cats.find((c) => c.id === categoryId);
  const dirty = title.trim() !== habit.title
    || categoryId !== habit.categoryId
    || time !== (habit.time ?? "")
    || [...days].sort((a, b) => a - b).join(",") !== [...habit.days].sort((a, b) => a - b).join(",");
  function createCatNow() { if (!newLabel.trim()) return; const id = onCreateCategory({ label: newLabel.trim(), icon: newIcon }); setCategoryId(id); setCatCreating(false); setNewLabel(""); setNewIcon(randomIcon()); }
  function save() { if (!title.trim() || days.length === 0 || !dirty) return; onSave(habit.id, { title: title.trim(), categoryId, days: [...days].sort((a, b) => a - b), time: time || undefined }); onClose(); }
  return (
    <Dialog open onClose={onClose} mobilePlacement="bottom">
      <header className="flex shrink-0 items-start justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-subtle"><CategoryIcon k={cat?.icon ?? "folder"} className="size-[18px]" /></span><div><p className="text-[16px] font-semibold tracking-[-0.01em]">{title || habit.title}</p><p className="mt-0.5 text-[12px] text-faint">{cat?.label ?? "Toifasiz"}  ·  {scheduleLabel(days)}{time ? `  ·  ${time}` : ""}</p></div></div>
        <button type="button" onClick={onClose} aria-label="Yopish" className="-mr-1 grid size-8 shrink-0 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><X className="size-4" /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6">
        <div><Lbl>Nomi</Lbl><input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 w-full border-b border-border bg-transparent pb-2 text-[16px] outline-none placeholder:text-faint focus:border-foreground" /></div>
        <div>
          <Lbl>Toifa</Lbl>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {cats.map((c) => <button key={c.id} type="button" onClick={() => { setCategoryId(c.id); setCatCreating(false); }} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors", categoryId === c.id && !catCreating ? "border-transparent bg-foreground text-background" : "border-border text-muted hover:text-foreground")}><CategoryIcon k={c.icon} className="size-3.5" />{c.label}</button>)}
            <button type="button" onClick={() => { setCategoryId(null); setCatCreating(false); }} className={cn("inline-flex items-center rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors", categoryId === null && !catCreating ? "border-transparent bg-foreground text-background" : "border-border text-muted hover:text-foreground")}>Toifasiz</button>
            <button type="button" onClick={() => setCatCreating((v) => !v)} className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors", catCreating ? "border-foreground text-foreground" : "border-dashed border-border text-faint hover:text-foreground")}><Plus className="size-3.5" /> Yangi</button>
          </div>
          {catCreating && (
            <div className="mt-3 space-y-3 rounded-xl border border-border p-3">
              <input autoFocus value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Yangi toifa nomi" className="w-full border-b border-border bg-transparent pb-2 text-[14px] outline-none placeholder:text-faint focus:border-foreground" />
              <IconPicker value={newIcon} onChange={setNewIcon} />
              <button type="button" onClick={createCatNow} disabled={!newLabel.trim()} className="w-full rounded-lg bg-foreground py-2 text-[13px] font-medium text-background transition-opacity disabled:opacity-30">Toifa qo&apos;shish</button>
            </div>
          )}
        </div>
        <div>
          <div className="mb-2.5 flex items-center justify-between"><Lbl>Qaysi kunlari</Lbl><button type="button" onClick={() => setDays(daily ? [] : [...ALL_DAYS])} className={cn("text-[12px] font-medium transition-colors", daily ? "text-foreground" : "text-faint hover:text-muted")}>Har kuni</button></div>
          <div className="flex gap-1.5">{WEEK_FROM_MON.map((idx) => { const on = days.includes(idx); return <button key={idx} type="button" onClick={() => setDays((p) => on ? p.filter((x) => x !== idx) : [...p, idx])} className={cn("flex-1 rounded-md border py-2 text-[12px] font-medium transition-colors", on ? "border-foreground bg-foreground text-background" : "border-border text-faint hover:border-border-strong")}>{UZ_DAYS_SHORT[idx]}</button>; })}</div>
        </div>
        <div><Lbl>Eslatma vaqti</Lbl><TimeField value={time} occupiedSlots={occupiedForDays(plans, days, habit.id)} onChange={(t) => setTime(t ?? "")} /></div>
        <div className="flex gap-4 border-t border-border pt-5 text-[13px]"><button type="button" onClick={() => onArchive(habit.id)} className="inline-flex items-center gap-1.5 text-muted hover:text-foreground"><Archive className="size-4" /> Arxivlash</button><button type="button" onClick={() => onRemove(habit.id)} className="inline-flex items-center gap-1.5 text-faint hover:text-danger"><Trash2 className="size-4" /> O&apos;chirish</button></div>
      </div>
      <div className="shrink-0 border-t border-border px-5 py-4"><button type="button" onClick={save} disabled={!title.trim() || days.length === 0 || !dirty} className="w-full rounded-lg bg-foreground py-3 text-[14px] font-medium text-background transition-opacity disabled:opacity-30">Saqlash</button></div>
    </Dialog>
  );
}

/* ════════ Modallar ════════ */
function AddHabitModal({ cats, plans, initialCategory, initialDays, onClose, onAdd, onCreateCategory }: { cats: HabitCategory[]; plans: Plan[]; initialCategory?: string | null; initialDays?: number[]; onClose: () => void; onAdd: (input: { title: string; categoryId: string | null; days: number[]; time?: string }) => void; onCreateCategory: (input: { label: string; icon: string }) => string }) {
  const [title, setTitle] = useState(""); const [categoryId, setCategoryId] = useState<string | null | undefined>(initialCategory); const [days, setDays] = useState<number[]>(initialDays && initialDays.length ? [...initialDays] : [...ALL_DAYS]); const [time, setTime] = useState("");
  const [creating, setCreating] = useState(false); const [newLabel, setNewLabel] = useState(""); const [newIcon, setNewIcon] = useState<IconKey>(randomIcon);
  const daily = days.length >= 7;
  const chosen = categoryId !== undefined; // toifa (yoki Toifasiz) tanlangan
  function createNow() { if (!newLabel.trim()) return; const id = onCreateCategory({ label: newLabel.trim(), icon: newIcon }); setCategoryId(id); setCreating(false); setNewLabel(""); setNewIcon(randomIcon()); }
  function submit() { if (!title.trim() || categoryId === undefined) return; onAdd({ title: title.trim(), categoryId, days: [...days].sort((a, b) => a - b), time: time || undefined }); onClose(); }
  return (
    <Dialog open onClose={onClose} mobilePlacement="bottom">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4"><p className="text-[16px] font-semibold tracking-[-0.01em]">Yangi odat</p><button type="button" onClick={onClose} aria-label="Yopish" className="-mr-1 grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><X className="size-4" /></button></header>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6">
        <div>
          <Lbl>Toifa</Lbl>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {cats.map((c) => <button key={c.id} type="button" onClick={() => { setCategoryId(c.id); setCreating(false); }} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors", categoryId === c.id && !creating ? "border-transparent bg-foreground text-background" : "border-border text-muted hover:text-foreground")}><CategoryIcon k={c.icon} className="size-3.5" />{c.label}</button>)}
            <button type="button" onClick={() => { setCategoryId(null); setCreating(false); }} className={cn("inline-flex items-center rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors", categoryId === null && !creating ? "border-transparent bg-foreground text-background" : "border-border text-muted hover:text-foreground")}>Toifasiz</button>
            <button type="button" onClick={() => setCreating((v) => !v)} className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors", creating ? "border-foreground text-foreground" : "border-dashed border-border text-faint hover:text-foreground")}><Plus className="size-3.5" /> Yangi</button>
          </div>
          {creating && (
            <div className="mt-3 space-y-3 rounded-xl border border-border p-3">
              <input autoFocus value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Yangi toifa nomi" className="w-full border-b border-border bg-transparent pb-2 text-[14px] outline-none placeholder:text-faint focus:border-foreground" />
              <IconPicker value={newIcon} onChange={setNewIcon} />
              <button type="button" onClick={createNow} disabled={!newLabel.trim()} className="w-full rounded-lg bg-foreground py-2 text-[13px] font-medium text-background transition-opacity disabled:opacity-30">Toifa qo&apos;shish</button>
            </div>
          )}
          {!chosen && !creating && <p className="mt-2 text-[11.5px] text-faint">Avval toifa tanlang (yoki «Toifasiz»).</p>}
        </div>

        {chosen && <>
          <div><Lbl>Nomi</Lbl><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Suv ichish" className="mt-1.5 w-full border-b border-border bg-transparent pb-2 text-[16px] outline-none placeholder:text-faint focus:border-foreground" /></div>
          <div><div className="mb-2.5 flex items-center justify-between"><Lbl>Qaysi kunlari</Lbl><button type="button" onClick={() => setDays(daily ? [] : [...ALL_DAYS])} className={cn("text-[12px] font-medium transition-colors", daily ? "text-foreground" : "text-faint hover:text-muted")}>Har kuni</button></div><div className="flex gap-1.5">{WEEK_FROM_MON.map((idx) => { const on = days.includes(idx); return <button key={idx} type="button" onClick={() => setDays((p) => on ? p.filter((x) => x !== idx) : [...p, idx])} className={cn("flex-1 rounded-md border py-2 text-[12px] font-medium transition-colors", on ? "border-foreground bg-foreground text-background" : "border-border text-faint hover:border-border-strong")}>{UZ_DAYS_SHORT[idx]}</button>; })}</div></div>
          <div><Lbl>Eslatma vaqti (ixtiyoriy)</Lbl><TimeField value={time} occupiedSlots={occupiedForDays(plans, days)} onChange={(t) => setTime(t ?? "")} /></div>
        </>}
      </div>
      <div className="shrink-0 border-t border-border px-5 py-4"><button type="button" onClick={submit} disabled={!chosen || !title.trim() || days.length === 0} className="w-full rounded-lg bg-foreground py-3 text-[14px] font-medium text-background transition-opacity disabled:opacity-30">Qo&apos;shish</button></div>
    </Dialog>
  );
}

function AddCategoryModal({ onClose, onAdd }: { onClose: () => void; onAdd: (input: { label: string; icon: string }) => void }) {
  const [label, setLabel] = useState(""); const [icon, setIcon] = useState<IconKey>(randomIcon);
  function submit() { if (!label.trim()) return; onAdd({ label: label.trim(), icon }); onClose(); }
  return (
    <Dialog open onClose={onClose} mobilePlacement="bottom">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4"><p className="text-[16px] font-semibold tracking-[-0.01em]">Yangi toifa</p><button type="button" onClick={onClose} aria-label="Yopish" className="-mr-1 grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><X className="size-4" /></button></header>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6">
        <div><Lbl>Nomi</Lbl><input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Masalan: Salomatlik" className="mt-1.5 w-full border-b border-border bg-transparent pb-2 text-[16px] outline-none placeholder:text-faint focus:border-foreground" /></div>
        <div><Lbl>Ikona</Lbl><div className="mt-1.5"><IconPicker value={icon} onChange={setIcon} /></div></div>
      </div>
      <div className="shrink-0 border-t border-border px-5 py-4"><button type="button" onClick={submit} disabled={!label.trim()} className="w-full rounded-lg bg-foreground py-3 text-[14px] font-medium text-background transition-opacity disabled:opacity-30">Qo&apos;shish</button></div>
    </Dialog>
  );
}

function EditCategoryModal({ cat, onClose, onSave }: { cat: HabitCategory; onClose: () => void; onSave: (patch: { label: string; icon: string }) => void }) {
  const [label, setLabel] = useState(cat.label); const [icon, setIcon] = useState<IconKey>(cat.icon as IconKey);
  function submit() { if (!label.trim()) return; onSave({ label: label.trim(), icon }); }
  return (
    <Dialog open onClose={onClose} mobilePlacement="bottom">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4"><p className="text-[16px] font-semibold tracking-[-0.01em]">Toifani tahrirlash</p><button type="button" onClick={onClose} aria-label="Yopish" className="-mr-1 grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><X className="size-4" /></button></header>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6">
        <div><Lbl>Nomi</Lbl><input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1.5 w-full border-b border-border bg-transparent pb-2 text-[16px] outline-none placeholder:text-faint focus:border-foreground" /></div>
        <div><Lbl>Ikona</Lbl><div className="mt-1.5"><IconPicker value={icon} onChange={setIcon} /></div></div>
      </div>
      <div className="shrink-0 border-t border-border px-5 py-4"><button type="button" onClick={submit} disabled={!label.trim()} className="w-full rounded-lg bg-foreground py-3 text-[14px] font-medium text-background transition-opacity disabled:opacity-30">Saqlash</button></div>
    </Dialog>
  );
}

function Lbl({ children }: { children: React.ReactNode }) { return <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">{children}</p>; }

/* Ikona tanlash — ixcham (8 ustun, kichik), uzun scroll bo'lmasligi uchun. */
function IconPicker({ value, onChange }: { value: string; onChange: (k: IconKey) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {ICON_CHOICES.map((k) => (
        <button key={k} type="button" onClick={() => onChange(k)} className={cn("grid aspect-square place-items-center rounded-lg border transition-colors", value === k ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:text-foreground")}>
          <CategoryIcon k={k} className="size-4" />
        </button>
      ))}
    </div>
  );
}

/* Vaqt tanlash — boshqa tasklardagi kabi (TimePickerPopover). */
function TimeField({ value, onChange, occupiedSlots }: { value: string; onChange: (v: string | undefined) => void; occupiedSlots?: string[] }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-[14px] tabular-nums transition-colors",
          open ? "border-border-strong bg-subtle text-foreground" : "border-border bg-background text-foreground hover:border-border-strong",
          !value && "text-faint"
        )}
      >
        <Clock className="size-3.5 text-faint" />
        <span>{value || "Vaqt tanlash"}</span>
      </button>
      <TimePickerPopover
        open={open}
        triggerRef={ref}
        value={value}
        occupiedSlots={occupiedSlots}
        onChange={(v) => onChange(v)}
        onClear={() => { onChange(undefined); setOpen(false); }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
