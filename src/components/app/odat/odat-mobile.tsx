"use client";

/* Odat — mobil ko'rinish: Kalendar (hafta/oy) va Odatlar (toifalar, arxiv),
   odat tafsiloti (seriya, bu hafta, tahrirlash), qo'shish oynasi. Seriya va
   foizlar mavjud bajarilish ma'lumotidan (occurrence plan'lar) hisoblanadi.
   Desktop ko'rinishi odat-view.tsx'da o'zgarmagan holda qoladi. */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, Archive, Check, ChevronLeft, ChevronRight, ChevronDown, Clock, Flame, Folder, Medal, Pencil, Plus,
  Repeat, Sparkles, Trash2, Undo2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileAdd } from "@/lib/mobile-add";
import { occupiedTimeSlots, type OccupiedSlot } from "@/lib/dates";
import { playOnComplete } from "@/lib/sounds";
import type { Habit, HabitCategory, Plan } from "@/lib/types";
import type { CreateHabitInput } from "@/lib/habits-store";
import { MonoActions, MonoBlock, MonoExpand, MonoHeader, MonoSave, MonoSheet, MonoTile } from "../widgets/mono-sheet";
import { PickerModal } from "../widgets/picker-modal";
import { TimePicker } from "../widgets/time-picker";
import { ConfirmDialog } from "../widgets/confirm-dialog";
import { ListLoader } from "../widgets/list-loader";
import { CollapseHead, EmptyCard, Expand, MenuRow, MobileTitle, Ring, Segment, SheetHeadCard, Tick, groupCls, useMiniToast } from "../widgets/mobile-bits";
import { CategoryIcon, ICON_CHOICES, type IconKey } from "./habit-icons";

/* ─── Sana ─── */
const UZ_DAYS_SHORT = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];
const UZ_DAYS_LONG = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const WEEK_FROM_MON = [1, 2, 3, 4, 5, 6, 0];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
function midnight(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function iso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fromIso(s: string) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
const TODAY = midnight(new Date());
const TODAY_ISO = iso(TODAY);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function dayTitle(d: Date) { return iso(d) === TODAY_ISO ? "Bugun" : `${UZ_DAYS_LONG[d.getDay()]}, ${d.getDate()}-${MONTHS[d.getMonth()]}`; }
function scheduleLabel(days: number[]) {
  if (days.length >= 7) return "Har kuni";
  if (days.length === 0) return "Hech qachon";
  if (days.length === 5 && [1, 2, 3, 4, 5].every((x) => days.includes(x))) return "Ish kunlari";
  return WEEK_FROM_MON.filter((d) => days.includes(d)).map((d) => UZ_DAYS_SHORT[d]).join(" ");
}
function rangeLabel(a: Date, b: Date) {
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}` : `${a.getDate()} ${MONTHS[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MONTHS[b.getMonth()].slice(0, 3)}`;
}
function weekOf(offset: number) {
  const monday = addDays(TODAY, -((TODAY.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/* ─── Bajarilish hisobi ─── */
type Logs = Record<string, Set<string>>;
const isScheduled = (h: Habit, d: Date) => h.days.includes(d.getDay());
const doneOn = (logs: Logs, h: Habit, d: Date) => logs[h.id]?.has(iso(d)) ?? false;

/** Joriy va eng uzun seriya — jadvaldagi kunlar bo'yicha (bugun hali belgilanmagan bo'lsa, kechadan sanaladi). */
function streakOf(h: Habit, logs: Logs) {
  let cur = 0;
  let d = TODAY;
  if (isScheduled(h, d) && !doneOn(logs, h, d)) d = addDays(d, -1);
  for (let i = 0; i < 400; i++, d = addDays(d, -1)) {
    if (!isScheduled(h, d)) continue;
    if (doneOn(logs, h, d)) cur++;
    else break;
  }
  let best = 0, run = 0;
  for (let off = 400; off >= 0; off--) {
    const x = addDays(TODAY, -off);
    if (!isScheduled(h, x)) continue;
    if (doneOn(logs, h, x)) { run++; best = Math.max(best, run); } else if (off > 0) run = 0;
  }
  return { cur, best: Math.max(best, cur) };
}
function rateOf(h: Habit, logs: Logs, days: number) {
  let sc = 0, dn = 0;
  for (let off = 0; off < days; off++) {
    const d = addDays(TODAY, -off);
    if (!isScheduled(h, d)) continue;
    sc++;
    if (doneOn(logs, h, d)) dn++;
  }
  return sc ? Math.round((dn / sc) * 100) : 0;
}
function ratioFor(habits: Habit[], logs: Logs, dates: Date[]) {
  let sc = 0, dn = 0;
  for (const d of dates) {
    if (d.getTime() > TODAY.getTime()) continue;
    for (const h of habits) { if (!isScheduled(h, d)) continue; sc++; if (doneOn(logs, h, d)) dn++; }
  }
  return { sc, dn, pct: sc ? Math.round((dn / sc) * 100) : 0 };
}

/** Tanlangan hafta kunlarida keyingi 7 kun ichidagi band vaqtlar (odatning o'zi hisobga olinmaydi). */
function busySlots(plans: Plan[], days: number[], excludeHabitId?: string): OccupiedSlot[] {
  if (days.length === 0) return [];
  const base = excludeHabitId ? plans.filter((p) => p.habitId !== excludeHabitId) : plans;
  const seen = new Map<string, OccupiedSlot>();
  for (let off = 0; off < 7; off++) {
    const d = addDays(TODAY, off);
    if (!days.includes(d.getDay())) continue;
    for (const s of occupiedTimeSlots(base, iso(d))) if (!seen.has(s.time)) seen.set(s.time, s);
  }
  return [...seen.values()];
}

type Tab = "calendar" | "habits";

export type OdatMobileProps = {
  active: boolean;
  hydrated: boolean;
  cats: HabitCategory[];
  habits: Habit[];
  archived: Habit[];
  plans: Plan[];
  logs: Logs;
  onToggleDay: (h: Habit, d: Date) => void;
  createHabit: (input: CreateHabitInput) => string;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  archiveHabit: (id: string) => void;
  restoreHabit: (id: string) => void;
  removeHabit: (id: string) => void;
  createCat: (input: { label: string; icon: string }) => string;
  updateCat: (id: string, patch: Partial<HabitCategory>) => void;
  removeCat: (id: string) => void;
};

export function OdatMobile(p: OdatMobileProps) {
  const { cats, habits, archived, logs } = p;
  const { toast, toastEl } = useMiniToast();
  const [tab, setTab] = useState<Tab>("calendar");
  const [dir, setDir] = useState(0);
  const [mode, setMode] = useState<"week" | "month">("week");
  const [add, setAdd] = useState<{ cat?: string | null; days?: number[] } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<{ mode: "create" } | { mode: "edit"; id: string } | null>(null);
  const [pending, setPending] = useState<{ kind: "habit" | "category"; id: string; name: string } | null>(null);

  useMobileAdd(() => setAdd({}), p.active);

  const todayDue = habits.filter((h) => isScheduled(h, TODAY));
  const todayDone = todayDue.filter((h) => doneOn(logs, h, TODAY)).length;
  const detail = detailId ? [...habits, ...archived].find((h) => h.id === detailId) ?? null : null;

  function selectTab(t: Tab) { setDir(t === "habits" ? 1 : -1); setTab(t); }
  function toggleDay(h: Habit, d: Date) {
    if (d.getTime() > TODAY.getTime()) return;
    if (!doneOn(logs, h, d)) playOnComplete();
    p.onToggleDay(h, d);
  }
  function addWeekday(id: string, wd: number) {
    const h = habits.find((x) => x.id === id);
    if (!h || h.days.includes(wd)) return;
    p.updateHabit(id, { days: [...h.days, wd].sort((a, b) => a - b) });
    toast(`${UZ_DAYS_LONG[wd]} kunlari ham qo'shildi`);
  }
  function confirmDelete() {
    if (!pending) return;
    if (pending.kind === "habit") { p.removeHabit(pending.id); setDetailId(null); toast("Odat o'chirildi"); }
    else { p.removeCat(pending.id); toast("Toifa o'chirildi"); }
    setPending(null);
  }

  return (
    <div className="h-full overflow-y-auto overscroll-contain pb-32 [-webkit-overflow-scrolling:touch]">
      <MobileTitle
        title="Odat"
        sub={todayDue.length ? `Bugun ${todayDone}/${todayDue.length}` : "Bugun odat yo'q"}
        aside={<Ring value={todayDue.length ? todayDone / todayDue.length : 0} size={34} stroke={3.5}><Flame className="size-4 text-muted" /></Ring>}
      />

      {/* Bitta ixcham qator: bo'lim tablari + (Kalendarda) Hafta/Oy */}
      <div className="mt-2.5 flex items-center gap-2 px-4">
        <Segment value={tab} options={[{ id: "calendar", label: "Kalendar" }, { id: "habits", label: "Odatlar" }]} onChange={selectTab} id="odat-m-tab" solid className="flex-1" />
        {tab === "calendar" && <Segment value={mode} options={[{ id: "week", label: "Hafta" }, { id: "month", label: "Oy" }]} onChange={setMode} id="odat-m-mode" className="w-[124px]" />}
      </div>

      {!p.hydrated && habits.length === 0 ? (
        <div className="mt-6"><ListLoader label="Odatlar yuklanmoqda…" /></div>
      ) : (
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={tab}
            custom={dir}
            variants={{ enter: (d: number) => ({ x: d * 56, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d: number) => ({ x: -d * 56, opacity: 0 }) }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.16, ease: "easeOut" }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.14}
            onDragEnd={(_, info) => {
              if ((info.offset.x < -56 || info.velocity.x < -500) && tab === "calendar") selectTab("habits");
              else if ((info.offset.x > 56 || info.velocity.x > 500) && tab === "habits") selectTab("calendar");
            }}
            className="px-4"
          >
            {tab === "calendar" ? (
              <div className="pt-1">
                {mode === "week"
                  ? <WeekMode cats={cats} habits={habits} logs={logs} onToggle={toggleDay} onOpen={setDetailId} onAddExisting={addWeekday} onNewHabit={(wd) => setAdd({ days: [wd] })} />
                  : <MonthMode cats={cats} habits={habits} logs={logs} onToggle={toggleDay} onOpen={setDetailId} onAddExisting={addWeekday} onNewHabit={(wd) => setAdd({ days: [wd] })} />}
              </div>
            ) : (
              <HabitsTab
                cats={cats}
                habits={habits}
                archived={archived}
                logs={logs}
                onOpen={setDetailId}
                onAdd={(cat) => setAdd({ cat })}
                onAddCat={() => setCatForm({ mode: "create" })}
                onEditCat={(id) => setCatForm({ mode: "edit", id })}
                onDeleteCat={(id) => setPending({ kind: "category", id, name: cats.find((c) => c.id === id)?.label ?? "" })}
                onRestore={(id) => { p.restoreHabit(id); toast("Qaytarildi"); }}
                onDelete={(id) => setPending({ kind: "habit", id, name: [...habits, ...archived].find((h) => h.id === id)?.title ?? "" })}
              />
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <MonoSheet open={!!add} onClose={() => setAdd(null)} label="Yangi odat">
        {add && (
          <AddHabitBody
            cats={cats}
            plans={p.plans}
            initialCategory={add.cat}
            initialDays={add.days}
            onClose={() => setAdd(null)}
            onAdd={(inp) => { p.createHabit(inp); setAdd(null); toast("Odat qo'shildi"); }}
            onCreateCategory={(label, icon) => p.createCat({ label, icon })}
          />
        )}
      </MonoSheet>

      <MonoSheet open={!!detail} onClose={() => setDetailId(null)} label={detail?.title ?? "Odat"}>
        {detail && (
          <HabitDetailBody
            key={detail.id}
            habit={detail}
            cats={cats}
            plans={p.plans}
            logs={logs}
            onClose={() => setDetailId(null)}
            onToggle={(d) => toggleDay(detail, d)}
            onSave={(patch) => { p.updateHabit(detail.id, patch); toast("Saqlandi"); }}
            onArchive={() => { p.archiveHabit(detail.id); setDetailId(null); toast("Arxivlandi"); }}
            onRestore={() => { p.restoreHabit(detail.id); toast("Qaytarildi"); }}
            onDelete={() => setPending({ kind: "habit", id: detail.id, name: detail.title })}
            onCreateCategory={(label, icon) => p.createCat({ label, icon })}
          />
        )}
      </MonoSheet>

      <MonoSheet open={!!catForm} onClose={() => setCatForm(null)} label="Toifa">
        {catForm && (
          <CatFormBody
            key={catForm.mode === "edit" ? catForm.id : "new"}
            cat={catForm.mode === "edit" ? cats.find((c) => c.id === catForm.id) : undefined}
            onClose={() => setCatForm(null)}
            onSave={(label, icon) => {
              if (catForm.mode === "edit") p.updateCat(catForm.id, { label, icon });
              else p.createCat({ label, icon });
              toast(catForm.mode === "edit" ? "Toifa saqlandi" : "Toifa qo'shildi");
              setCatForm(null);
            }}
          />
        )}
      </MonoSheet>

      <ConfirmDialog
        open={!!pending}
        destructive
        title={pending?.kind === "category" ? "Toifani o'chirasizmi?" : "Odatni o'chirasizmi?"}
        description={pending ? (pending.kind === "habit" ? `"${pending.name}" va uning vazifalari o'chiriladi. Bu amalni qaytarib bo'lmaydi.` : `"${pending.name}" o'chiriladi. Undagi odatlar toifasiz bo'lib qoladi.`) : undefined}
        confirmLabel="O'chirish"
        onConfirm={confirmDelete}
        onClose={() => setPending(null)}
      />
      {toastEl}
    </div>
  );
}

/* ════════════════ KALENDAR ════════════════ */

type CalProps = { cats: HabitCategory[]; habits: Habit[]; logs: Logs; onToggle: (h: Habit, d: Date) => void; onOpen: (id: string) => void; onAddExisting: (id: string, wd: number) => void; onNewHabit: (wd: number) => void };

function PeriodNav({ title, sub, onPrev, onNext }: { title: string; sub?: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <button type="button" onClick={onPrev} aria-label="Oldingi" className="grid size-10 shrink-0 place-items-center rounded-full text-muted active:bg-hover"><ChevronLeft className="size-5" /></button>
      <p className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold tracking-[-0.01em]">
        {title}{sub && <span className="ml-1.5 text-[13px] font-normal text-faint">{sub}</span>}
      </p>
      <button type="button" onClick={onNext} aria-label="Keyingi" className="grid size-10 shrink-0 place-items-center rounded-full text-muted active:bg-hover"><ChevronRight className="size-5" /></button>
    </div>
  );
}

function MiniRing({ ratio, size = 40, children, className }: { ratio: number; size?: number; children: React.ReactNode; className?: string }) {
  const r = (size - 3) / 2, c = 2 * Math.PI * r;
  return (
    <span className={cn("relative grid shrink-0 place-items-center rounded-full", className)} style={{ width: size, height: size }}>
      {ratio > 0 && (
        <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={2.5} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--foreground)" strokeWidth={2.5} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} style={{ transition: "stroke-dashoffset .35s" }} />
        </svg>
      )}
      <span className="relative">{children}</span>
    </span>
  );
}

function WeekMode({ cats, habits, logs, onToggle, onOpen, onAddExisting, onNewHabit }: CalProps) {
  const [offset, setOffset] = useState(0);
  const [sel, setSel] = useState(TODAY_ISO);
  const [addOpen, setAddOpen] = useState(false);
  const week = useMemo(() => weekOf(offset), [offset]);
  const selDate = week.find((d) => iso(d) === sel) ?? week[0];
  const due = habits.filter((h) => isScheduled(h, selDate));
  const future = selDate.getTime() > TODAY.getTime();
  const doneN = due.filter((h) => doneOn(logs, h, selDate)).length;
  const stats = ratioFor(habits, logs, week);
  const range = rangeLabel(week[0], week[6]);
  function go(delta: number) {
    const n = offset + delta;
    setOffset(n);
    setSel(n === 0 ? TODAY_ISO : iso(weekOf(n)[0]));
  }
  return (
    <>
      <PeriodNav title={offset === 0 ? "Shu hafta" : offset === -1 ? "O'tgan hafta" : offset === 1 ? "Keyingi hafta" : range} sub={Math.abs(offset) <= 1 ? range : undefined} onPrev={() => go(-1)} onNext={() => go(1)} />
      <div className="mt-1 grid grid-cols-7 gap-1 rounded-[22px] border border-border bg-surface p-1">
        {week.map((d) => {
          const on = iso(d) === sel;
          const isToday = iso(d) === TODAY_ISO;
          const fut = d.getTime() > TODAY.getTime();
          const dueN = habits.filter((h) => isScheduled(h, d)).length;
          const dn = habits.filter((h) => isScheduled(h, d) && doneOn(logs, h, d)).length;
          return (
            <button key={iso(d)} type="button" onClick={() => setSel(iso(d))} className={cn("flex flex-col items-center gap-0.5 rounded-[18px] py-1.5 transition-colors", on ? "bg-accent text-accent-ink" : "active:bg-hover", fut && !on && "opacity-55")}>
              <span className={cn("text-[11px] font-semibold", on ? "opacity-75" : "text-faint")}>{UZ_DAYS_SHORT[d.getDay()]}</span>
              <span className={cn("grid size-8 place-items-center rounded-full text-[16px] font-semibold tabular-nums", !on && isToday && "ring-1 ring-inset ring-foreground/40")}>{d.getDate()}</span>
              <span className="flex h-1.5 items-center">
                {dueN > 0 && !fut ? (
                  <span className={cn("h-1.5 rounded-full", on ? "bg-accent-ink" : "bg-foreground")} style={{ width: 4 + Math.round((dn / dueN) * 14), opacity: dn ? 1 : 0.25 }} />
                ) : dueN > 0 ? (
                  <span className={cn("size-1.5 rounded-full", on ? "bg-accent-ink/50" : "bg-border-strong")} />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-1.5 mt-3.5 flex items-baseline justify-between px-1">
        <p className="text-[13px] font-semibold text-muted">{dayTitle(selDate)}{future && " · kelajak"}</p>
        {due.length > 0 && <span className="text-[12.5px] tabular-nums text-faint">{doneN}/{due.length}</span>}
      </div>
      <DayList cats={cats} habits={due} logs={logs} date={selDate} onToggle={onToggle} onOpen={onOpen} />
      <button type="button" onClick={() => setAddOpen(true)} className="mt-3 flex h-[52px] w-full items-center justify-center gap-1.5 rounded-[22px] border border-dashed border-border text-[14px] font-semibold text-muted active:bg-hover">
        <Plus className="size-4" /> <span>{`${UZ_DAYS_LONG[selDate.getDay()]} kuniga odat qo'shish`}</span>
      </button>

      <StatCard pct={stats.pct} title={offset === 0 ? "Shu hafta" : range} line={`${stats.dn} / ${stats.sc} marta bajarildi`} habits={habits} logs={logs} />
      <DayAddModal open={addOpen} date={selDate} habits={habits} cats={cats} onClose={() => setAddOpen(false)} onAddExisting={onAddExisting} onNewHabit={onNewHabit} />
    </>
  );
}

function DayList({ cats, habits, logs, date, onToggle, onOpen }: { cats: HabitCategory[]; habits: Habit[]; logs: Logs; date: Date; onToggle: (h: Habit, d: Date) => void; onOpen: (id: string) => void }) {
  const future = date.getTime() > TODAY.getTime();
  if (habits.length === 0) return <div className="rounded-[22px] border border-dashed border-border py-10 text-center text-[14px] text-faint">Bu kun uchun odat yo&apos;q</div>;
  return (
    <div className={groupCls}>
      {habits.map((h) => {
        const done = doneOn(logs, h, date);
        const cat = cats.find((c) => c.id === h.categoryId);
        return (
          <div key={h.id} className="flex min-h-[64px] items-center gap-3 px-3.5">
            <button type="button" onClick={() => onOpen(h.id)} className="flex min-w-0 flex-1 items-center gap-3 self-stretch py-3 text-left">
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-[14px] transition-colors", done ? "bg-accent text-accent-ink" : "bg-subtle text-muted")}><CategoryIcon k={cat?.icon ?? "folder"} className="size-[18px]" /></span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-[15.5px] font-semibold tracking-[-0.01em]", done && "text-faint line-through decoration-faint/60")}>{h.title}</span>
                <span className="block truncate text-[12.5px] text-faint">{cat?.label ?? "Toifasiz"}{h.time ? ` · ${h.time}` : ""}</span>
              </span>
            </button>
            <Tick on={done} disabled={future} onClick={() => onToggle(h, date)} />
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ pct, title, line, habits, logs }: { pct: number; title: string; line: string; habits: Habit[]; logs: Logs }) {
  const best = habits.map((h) => ({ h, s: streakOf(h, logs).cur })).sort((a, b) => b.s - a.s)[0];
  return (
    <div className="mt-5 flex items-center gap-4 rounded-[24px] border border-border bg-surface p-4">
      <Ring value={pct / 100} size={84} stroke={8}>
        <span className="relative text-[20px] font-bold tabular-nums">{pct}%</span>
      </Ring>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold tracking-[-0.01em]">{title}</span>
        <span className="block text-[13px] text-muted">{line}</span>
        {best && best.s > 0 && <span className="mt-1.5 flex items-center gap-1 text-[12.5px] text-faint"><Flame className="size-3.5" /> <span className="truncate">{best.h.title} · {best.s} kun</span></span>}
      </span>
    </div>
  );
}

function MonthMode({ cats, habits, logs, onToggle, onOpen, onAddExisting, onNewHabit }: CalProps) {
  const [mOff, setMOff] = useState(0);
  const [day, setDay] = useState<string | null>(null);
  const [addFor, setAddFor] = useState<Date | null>(null);
  const base = new Date(TODAY.getFullYear(), TODAY.getMonth() + mOff, 1);
  const cells = useMemo(() => {
    const b = new Date(TODAY.getFullYear(), TODAY.getMonth() + mOff, 1);
    const startOff = (b.getDay() + 6) % 7;
    const dim = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate();
    const out: (Date | null)[] = Array.from({ length: startOff }, () => null);
    for (let n = 1; n <= dim; n++) out.push(new Date(b.getFullYear(), b.getMonth(), n));
    while (out.length % 7) out.push(null);
    return out;
  }, [mOff]);
  const stats = ratioFor(habits, logs, cells.filter((c): c is Date => !!c));
  const title = `${cap(MONTHS[base.getMonth()])} ${base.getFullYear()}`;
  const dayDate = day ? fromIso(day) : null;
  const dayDue = dayDate ? habits.filter((h) => isScheduled(h, dayDate)) : [];
  return (
    <>
      <PeriodNav title={title} sub={mOff === 0 ? "Shu oy" : undefined} onPrev={() => setMOff((o) => o - 1)} onNext={() => setMOff((o) => o + 1)} />
      <div className="mt-1 rounded-[24px] border border-border bg-surface p-2">
        <div className="grid grid-cols-7">
          {WEEK_FROM_MON.map((w) => <span key={w} className="grid h-8 place-items-center text-[12px] font-medium text-faint">{UZ_DAYS_SHORT[w]}</span>)}
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const fut = d.getTime() > TODAY.getTime();
            const dueN = habits.filter((h) => isScheduled(h, d)).length;
            const dn = habits.filter((h) => isScheduled(h, d) && doneOn(logs, h, d)).length;
            const ratio = !fut && dueN ? dn / dueN : 0;
            const isToday = iso(d) === TODAY_ISO;
            return (
              <button key={i} type="button" onClick={() => setDay(iso(d))} className="grid h-12 place-items-center">
                <MiniRing ratio={ratio} className={cn(isToday && ratio === 0 && "ring-1 ring-inset ring-foreground/40")}>
                  <span className={cn("text-[15px] tabular-nums", isToday ? "font-bold text-foreground" : ratio > 0 ? "font-semibold" : fut || !dueN ? "text-faint/50" : "text-muted")}>{d.getDate()}</span>
                </MiniRing>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-center text-[12.5px] text-faint">Kunni bosib, o&apos;sha kungi odatlarni belgilang</p>
      <StatCard pct={stats.pct} title={title} line={`${stats.dn} / ${stats.sc} marta bajarildi`} habits={habits} logs={logs} />

      <PickerModal open={!!dayDate} onClose={() => setDay(null)} label={dayDate ? dayTitle(dayDate) : ""}>
        {dayDate && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-[13px]">
              <span className="font-semibold text-muted">{dayDate.getTime() > TODAY.getTime() ? "Kelajak kun" : "Bajarilish"}</span>
              <span className="tabular-nums text-faint">{dayDue.filter((h) => doneOn(logs, h, dayDate)).length}/{dayDue.length} bajarildi</span>
            </div>
            <DayList cats={cats} habits={dayDue} logs={logs} date={dayDate} onToggle={onToggle} onOpen={(id) => { setDay(null); onOpen(id); }} />
            {dayDate.getTime() >= TODAY.getTime() && (
              <button type="button" onClick={() => { setDay(null); setAddFor(dayDate); }} className="flex h-12 w-full items-center justify-center gap-1.5 rounded-[18px] border border-dashed border-border text-[14px] font-semibold text-muted active:bg-hover">
                <Plus className="size-4" /> Odat qo&apos;shish
              </button>
            )}
          </div>
        )}
      </PickerModal>
      <DayAddModal open={!!addFor} date={addFor ?? TODAY} habits={habits} cats={cats} onClose={() => setAddFor(null)} onAddExisting={onAddExisting} onNewHabit={onNewHabit} />
    </>
  );
}

/* Kun uchun: yangi odat yoki mavjud odatni shu hafta kuniga qo'shish. */
function DayAddModal({ open, date, habits, cats, onClose, onAddExisting, onNewHabit }: { open: boolean; date: Date; habits: Habit[]; cats: HabitCategory[]; onClose: () => void; onAddExisting: (id: string, wd: number) => void; onNewHabit: (wd: number) => void }) {
  const wd = date.getDay();
  const candidates = habits.filter((h) => !h.days.includes(wd));
  return (
    <PickerModal open={open} onClose={onClose} label={`${UZ_DAYS_LONG[wd]} kunlariga`}>
      <div className="space-y-3">
        <button type="button" onClick={() => { onClose(); onNewHabit(wd); }} className="flex min-h-[60px] w-full items-center gap-3 rounded-[20px] bg-accent px-3.5 text-left text-accent-ink">
          <span className="grid size-9 place-items-center rounded-full bg-accent-ink/15"><Plus className="size-5" strokeWidth={2.4} /></span>
          <span>
            <span className="block text-[15px] font-semibold">Yangi odat</span>
            <span className="block text-[12.5px] opacity-70">Har {UZ_DAYS_LONG[wd].toLowerCase()} takrorlanadi</span>
          </span>
        </button>
        {candidates.length === 0 && habits.length > 0 && <p className="px-1 text-center text-[13px] text-faint">Barcha odatlaringiz {UZ_DAYS_LONG[wd].toLowerCase()} kunlari ham bor.</p>}
        {candidates.length > 0 && (
          <>
            <p className="px-1 pt-1 text-[13px] font-semibold text-muted">Mavjud odatlarni qo&apos;shish</p>
            <div className={groupCls}>
              {candidates.map((h) => (
                <button key={h.id} type="button" onClick={() => { onAddExisting(h.id, wd); onClose(); }} className="flex min-h-[56px] w-full items-center gap-3 px-3.5 text-left active:bg-hover">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-subtle text-muted"><CategoryIcon k={cats.find((c) => c.id === h.categoryId)?.icon ?? "folder"} className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{h.title}</span>
                    <span className="block text-[12.5px] text-faint">{scheduleLabel(h.days)}</span>
                  </span>
                  <Plus className="size-4 shrink-0 text-faint" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </PickerModal>
  );
}

/* ════════════════ ODATLAR ════════════════ */

function HabitsTab({ cats, habits, archived, logs, onOpen, onAdd, onAddCat, onEditCat, onDeleteCat, onRestore, onDelete }: {
  cats: HabitCategory[]; habits: Habit[]; archived: Habit[]; logs: Logs; onOpen: (id: string) => void; onAdd: (cat?: string | null) => void; onAddCat: () => void; onEditCat: (id: string) => void; onDeleteCat: (id: string) => void; onRestore: (id: string) => void; onDelete: (id: string) => void;
}) {
  const [sel, setSel] = useState("all");
  const [menu, setMenu] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const cur = sel === "all" || cats.some((c) => c.id === sel) ? sel : "all";
  const items = cur === "all" ? habits : habits.filter((h) => h.categoryId === cur);
  const showIcon = cur === "all";
  const menuCat = cats.find((c) => c.id === menu);
  const tabCls = (on: boolean) => cn("flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13.5px] font-semibold transition-colors", on ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface text-muted");

  return (
    <div className="pt-2.5">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <button type="button" onClick={() => setSel("all")} className={tabCls(cur === "all")}>
          Barchasi <span className={cn("tabular-nums", cur === "all" ? "opacity-70" : "text-faint")}>{habits.length}</span>
        </button>
        {cats.map((c) => {
          const on = cur === c.id;
          return (
            <button key={c.id} type="button" onClick={() => (on ? setMenu(c.id) : setSel(c.id))} aria-label={on ? `${c.label} — amallar` : c.label} className={cn(tabCls(on), "pl-3", on && "pr-3")}>
              <CategoryIcon k={c.icon} className="size-4" /> {c.label}
              <span className={cn("tabular-nums", on ? "opacity-70" : "text-faint")}>{habits.filter((h) => h.categoryId === c.id).length}</span>
              {on && <ChevronDown className="-ml-0.5 size-3.5 opacity-70" strokeWidth={2.6} />}
            </button>
          );
        })}
        <button type="button" onClick={onAddCat} aria-label="Toifa qo'shish" className="flex h-10 shrink-0 items-center gap-1 rounded-full border border-dashed border-border-strong px-3 text-[13.5px] font-semibold text-muted active:bg-hover">
          <Plus className="size-4" /> {cats.length === 0 && "Toifa qo'shish"}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="mt-3">
          <EmptyCard icon={Repeat} title="Hali odat yo'q" text="Kichik, har kungi odatdan boshlang — masalan, suv ichish." action={
            <button type="button" onClick={() => onAdd(cur === "all" ? undefined : cur)} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-accent px-5 text-[14px] font-semibold text-accent-ink"><Plus className="size-4" strokeWidth={2.6} /> Odat qo&apos;shish</button>
          } />
        </div>
      ) : (
        <>
          <div className={cn(groupCls, "mt-3")}>
            {items.map((h) => {
              const st = streakOf(h, logs).cur;
              return (
                <button key={h.id} type="button" onClick={() => onOpen(h.id)} className="flex min-h-[66px] w-full items-center gap-3 px-3.5 py-3 text-left active:bg-hover">
                  {showIcon && <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-subtle text-muted"><CategoryIcon k={cats.find((c) => c.id === h.categoryId)?.icon ?? "folder"} className="size-[18px]" /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15.5px] font-semibold tracking-[-0.01em]">{h.title}</span>
                    <span className="mt-1 flex items-center gap-2">
                      <WeekLetters days={h.days} />
                      {h.time && <span className="text-[12px] tabular-nums text-faint">· {h.time}</span>}
                    </span>
                  </span>
                  {st > 0 && <span className="flex shrink-0 items-center gap-1 rounded-full bg-subtle px-2.5 py-1 text-[12.5px] font-semibold tabular-nums"><Flame className="size-3.5" />{st}</span>}
                  <ChevronRight className="size-4 shrink-0 text-faint" />
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => onAdd(cur === "all" ? undefined : cur)} className="mt-3 flex h-[52px] w-full items-center justify-center gap-1.5 rounded-[22px] border border-dashed border-border text-[14px] font-semibold text-muted active:bg-hover">
            <Plus className="size-4" /> Odat qo&apos;shish
          </button>
        </>
      )}

      {archived.length > 0 && (
        <section className="mt-5">
          <div className="flex"><CollapseHead icon={Archive} label="Arxivlangan" count={archived.length} open={showArchive} onToggle={() => setShowArchive((v) => !v)} /></div>
          <Expand open={showArchive}>
            <div className={cn(groupCls, "mt-2")}>
              {archived.map((h) => (
                <div key={h.id} className="flex min-h-[60px] items-center gap-1.5 px-3.5">
                  <button type="button" onClick={() => onDelete(h.id)} aria-label="O'chirish" className="-ml-1.5 grid size-10 shrink-0 place-items-center rounded-full text-faint active:bg-danger-soft active:text-danger"><X className="size-4" /></button>
                  <button type="button" onClick={() => onOpen(h.id)} className="min-w-0 flex-1 py-2.5 text-left">
                    <span className="block truncate text-[15px] font-semibold text-muted">{h.title}</span>
                    <span className="block text-[12.5px] text-faint">{scheduleLabel(h.days)}</span>
                  </button>
                  <button type="button" onClick={() => onRestore(h.id)} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-subtle px-3.5 text-[13px] font-semibold"><Undo2 className="size-3.5" /> Qaytarish</button>
                </div>
              ))}
            </div>
          </Expand>
        </section>
      )}

      <PickerModal open={!!menuCat} onClose={() => setMenu(null)} label={menuCat?.label ?? ""}>
        {menuCat && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-[20px] bg-subtle/60 px-3.5 py-3">
              <span className="grid size-10 place-items-center rounded-[14px] bg-surface"><CategoryIcon k={menuCat.icon} className="size-5" /></span>
              <span className="text-[13.5px] text-muted">{habits.filter((h) => h.categoryId === menuCat.id).length} ta odat</span>
            </div>
            <div className={groupCls}>
              <MenuRow icon={Pencil} label="Nomi va ikonasini o'zgartirish" onClick={() => { onEditCat(menuCat.id); setMenu(null); }} trailing={<ChevronRight className="size-4 text-faint" />} />
              <MenuRow icon={Trash2} label="Toifani o'chirish" danger onClick={() => { onDeleteCat(menuCat.id); setMenu(null); }} />
            </div>
          </div>
        )}
      </PickerModal>
    </div>
  );
}

function WeekLetters({ days }: { days: number[] }) {
  return (
    <span className="flex items-center gap-1">
      {WEEK_FROM_MON.map((d) => <span key={d} className={cn("text-[10.5px] font-semibold leading-none", days.includes(d) ? "text-muted" : "text-faint/40")}>{UZ_DAYS_SHORT[d]}</span>)}
    </span>
  );
}

/* ════════════════ Umumiy bo'laklar ════════════════ */

function DaysPicker({ days, onChange }: { days: number[]; onChange: (d: number[]) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEK_FROM_MON.map((idx) => {
        const on = days.includes(idx);
        return (
          <button key={idx} type="button" aria-pressed={on} onMouseDown={(e) => e.preventDefault()} onClick={() => onChange(on ? days.filter((x) => x !== idx) : [...days, idx])} className={cn("h-10 rounded-xl text-[13px] font-bold transition-colors", on ? "bg-accent text-accent-ink" : "bg-subtle text-faint")}>
            {UZ_DAYS_SHORT[idx]}
          </button>
        );
      })}
    </div>
  );
}

function AgendaToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-border bg-surface p-3.5 text-left">
      <span>
        <span className="block text-[15px] font-semibold">Agendada ko&apos;rinsin</span>
        <span className="mt-0.5 block text-[12.5px] text-faint">Yoqilsa, bu odat Agenda ro&apos;yxatida ham chiqadi.</span>
      </span>
      <span className={cn("relative h-[28px] w-[46px] shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-border-strong")}>
        <motion.span animate={{ x: checked ? 18 : 0 }} transition={{ type: "spring", stiffness: 600, damping: 36 }} className="absolute left-[3px] top-[3px] size-[22px] rounded-full bg-background shadow-sm" />
      </span>
    </button>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (k: IconKey) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {ICON_CHOICES.map((k) => (
        <button key={k} type="button" onClick={() => onChange(k)} aria-label={k} className={cn("grid aspect-square place-items-center rounded-[12px] transition-colors", value === k ? "bg-accent text-accent-ink" : "bg-subtle/70 text-muted")}>
          <CategoryIcon k={k} className="size-[18px]" />
        </button>
      ))}
    </div>
  );
}

/** Toifa tanlash + shu yerda yangi toifa yaratish. */
function CatPicker({ cats, value, onChange, onCreate, title }: { cats: HabitCategory[]; value: string | null | undefined; onChange: (id: string | null) => void; onCreate: (label: string, icon: IconKey) => string; title: string }) {
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState<IconKey>("star");
  const chip = (on: boolean) => cn("inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition-colors", on ? "bg-accent text-accent-ink" : "bg-subtle text-muted");
  return (
    <MonoBlock icon={Folder} label={title}>
      <div className="flex flex-wrap gap-1.5">
        {cats.map((c) => <button key={c.id} type="button" onClick={() => { onChange(c.id); setCreating(false); }} className={chip(value === c.id && !creating)}><CategoryIcon k={c.icon} className="size-4" /> {c.label}</button>)}
        <button type="button" onClick={() => { onChange(null); setCreating(false); }} className={chip(value === null && !creating)}>Toifasiz</button>
        <button type="button" onClick={() => setCreating((v) => !v)} className={cn(chip(false), creating && "bg-foreground/10 text-foreground")}><Plus className="size-4" /> Yangi</button>
      </div>
      <Expand open={creating}>
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Yangi toifa nomi" className="h-11 w-full rounded-[14px] bg-subtle/60 px-3.5 text-[16px] outline-none placeholder:text-faint" />
          <div className="max-h-[188px] overflow-y-auto [scrollbar-width:none]"><IconPicker value={icon} onChange={setIcon} /></div>
          <button type="button" disabled={!label.trim()} onClick={() => { onChange(onCreate(label.trim(), icon)); setCreating(false); setLabel(""); }} className="h-11 w-full rounded-[16px] bg-accent text-[14.5px] font-semibold text-accent-ink disabled:opacity-30">Toifa qo&apos;shish</button>
        </div>
      </Expand>
    </MonoBlock>
  );
}

/* ─── Yangi odat ─── */
function AddHabitBody({ cats, plans, initialCategory, initialDays, onClose, onAdd, onCreateCategory }: { cats: HabitCategory[]; plans: Plan[]; initialCategory?: string | null; initialDays?: number[]; onClose: () => void; onAdd: (inp: CreateHabitInput) => void; onCreateCategory: (label: string, icon: IconKey) => string }) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null | undefined>(initialCategory);
  const [days, setDays] = useState<number[]>(initialDays?.length ? [...initialDays] : [...ALL_DAYS]);
  const [time, setTime] = useState("");
  const [agenda, setAgenda] = useState(true);
  const [catsOpen, setCatsOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const chosen = categoryId !== undefined;
  const daily = days.length >= 7;
  const catLabel = categoryId === null ? "Toifasiz" : cats.find((c) => c.id === categoryId)?.label;
  const valid = chosen && !!title.trim() && days.length > 0;
  function submit() {
    if (!valid) return;
    onAdd({ title: title.trim(), categoryId: categoryId ?? null, days: [...days].sort((a, b) => a - b), time: time || undefined, showInAgenda: agenda });
  }
  return (
    <>
      <MonoHeader label="Yangi odat" value={title} onChange={setTitle} placeholder="Masalan: Suv ichish" onEnter={submit} onClose={onClose} />
      <MonoBlock icon={Repeat} label="Qaysi kunlari" aside={<button type="button" onClick={() => setDays(daily ? [] : [...ALL_DAYS])} className={cn("h-7 rounded-full px-2 font-semibold", daily ? "text-foreground" : "text-faint")}>Har kuni</button>}>
        <DaysPicker days={days} onChange={setDays} />
      </MonoBlock>
      <div className="grid grid-cols-2 gap-2">
        <MonoTile icon={Clock} label="Eslatma" value={time || undefined} filled={!!time} onClick={() => setTimeOpen(true)} />
        <MonoTile icon={Folder} label="Toifa" value={catLabel} filled={chosen} onClick={() => setCatsOpen((v) => !v)} />
      </div>
      {(catsOpen || !chosen) && (
        <CatPicker cats={cats} value={categoryId} title={chosen ? "Toifa" : "Avval toifa tanlang"} onChange={(id) => { setCategoryId(id); setCatsOpen(false); }} onCreate={onCreateCategory} />
      )}
      <AgendaToggle checked={agenda} onChange={setAgenda} />
      <MonoSave disabled={!valid} onClick={submit} />
      <PickerModal open={timeOpen} onClose={() => setTimeOpen(false)} label="Eslatma vaqti">
        <TimePicker large value={time} occupiedSlots={busySlots(plans, days)} onChange={(v) => { setTime(v); setTimeOpen(false); }} onClear={() => { setTime(""); setTimeOpen(false); }} />
      </PickerModal>
    </>
  );
}

/* ─── Odat tafsiloti ─── */
function HabitDetailBody({ habit, cats, plans, logs, onClose, onToggle, onSave, onArchive, onRestore, onDelete, onCreateCategory }: {
  habit: Habit; cats: HabitCategory[]; plans: Plan[]; logs: Logs; onClose: () => void; onToggle: (d: Date) => void; onSave: (p: Partial<Habit>) => void; onArchive: () => void; onRestore: () => void; onDelete: () => void; onCreateCategory: (label: string, icon: IconKey) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(habit.title);
  const [categoryId, setCategoryId] = useState<string | null>(habit.categoryId);
  const [days, setDays] = useState<number[]>(habit.days);
  const [time, setTime] = useState(habit.time ?? "");
  const [agenda, setAgenda] = useState(habit.showInAgenda);
  const [timeOpen, setTimeOpen] = useState(false);
  const cat = cats.find((c) => c.id === habit.categoryId);
  const { cur, best } = streakOf(habit, logs);
  const rate = rateOf(habit, logs, 30);
  const week = weekOf(0);
  const todayDone = doneOn(logs, habit, TODAY);
  const archived = !!habit.archivedAt;
  const sorted = (d: number[]) => [...d].sort((a, b) => a - b).join(",");
  const dirty = title.trim() !== habit.title || categoryId !== habit.categoryId || time !== (habit.time ?? "") || agenda !== habit.showInAgenda || sorted(days) !== sorted(habit.days);
  const daily = days.length >= 7;

  function reset() { setTitle(habit.title); setCategoryId(habit.categoryId); setDays(habit.days); setTime(habit.time ?? ""); setAgenda(habit.showInAgenda); }
  function save() {
    if (!title.trim() || days.length === 0 || !dirty) return;
    onSave({ title: title.trim(), categoryId, days: [...days].sort((a, b) => a - b), time: time || undefined, showInAgenda: agenda });
    setEditing(false);
  }

  return (
    <>
      <SheetHeadCard
        leading={<span className="grid size-11 shrink-0 place-items-center rounded-[15px] bg-subtle"><CategoryIcon k={cat?.icon ?? "folder"} className="size-5" /></span>}
        kicker={<>{cat?.label ?? "Toifasiz"} · {scheduleLabel(habit.days)}{habit.time ? ` · ${habit.time}` : ""}</>}
        title={habit.title}
        onClose={onClose}
      >
        {archived && <p className="mt-3 flex items-center gap-1.5 rounded-full bg-subtle px-3 py-1.5 text-[12.5px] font-semibold text-muted"><Archive className="size-3.5" /> Arxivlangan — jadvalda ko&apos;rinmaydi</p>}
      </SheetHeadCard>

      {/* Bu hafta: kunni bosib belgilash */}
      <MonoBlock icon={Check} label="Bu hafta" aside={<span className="tabular-nums opacity-60">{week.filter((d) => doneOn(logs, habit, d)).length}/{week.filter((d) => isScheduled(habit, d)).length}</span>}>
        <div className="grid grid-cols-7 gap-1">
          {week.map((d) => {
            const fut = d.getTime() > TODAY.getTime();
            const sch = isScheduled(habit, d);
            const dn = doneOn(logs, habit, d);
            const isToday = iso(d) === TODAY_ISO;
            return (
              <button key={iso(d)} type="button" disabled={fut || archived} onClick={() => onToggle(d)} aria-label={`${UZ_DAYS_LONG[d.getDay()]} — ${dn ? "bajarilgan" : "belgilash"}`} className="flex flex-col items-center gap-1 py-1 disabled:opacity-35">
                <span className={cn("text-[11px] font-semibold", isToday ? "text-foreground" : "text-faint")}>{UZ_DAYS_SHORT[d.getDay()]}</span>
                <span className={cn(
                  "grid size-9 place-items-center rounded-full text-[13px] font-semibold tabular-nums transition-colors",
                  dn ? "bg-accent text-accent-ink" : sch ? "border-2 border-border-strong" : "border border-dashed border-border text-faint/60",
                  isToday && !dn && "border-foreground/60"
                )}>
                  {dn ? <Check className="size-4" strokeWidth={3} /> : d.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </MonoBlock>

      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Flame, label: "Seriya", value: `${cur} kun` },
          { icon: Medal, label: "Eng uzun", value: `${best} kun` },
          { icon: Activity, label: "30 kunda", value: `${rate}%` },
        ].map((s) => (
          <div key={s.label} className="flex min-h-[74px] flex-col justify-between rounded-[20px] border border-border bg-surface p-3">
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted"><s.icon className="size-4" /> {s.label}</span>
            <span className="text-[17px] font-bold tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>

      {!archived && <MonoActions done={todayDone} onToggleDone={() => onToggle(TODAY)} editing={editing} onToggleEdit={() => { reset(); setEditing((v) => !v); }} onDelete={onDelete} />}

      <MonoExpand open={editing}>
        <div className="rounded-[22px] border border-border bg-surface p-3">
          <p className="mb-1 text-[11.5px] font-semibold opacity-75">Nomi</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Odat nomi" className="w-full bg-transparent text-[17px] font-semibold outline-none placeholder:text-faint" />
        </div>
        <CatPicker cats={cats} value={categoryId} title="Toifa" onChange={setCategoryId} onCreate={onCreateCategory} />
        <MonoBlock icon={Repeat} label="Qaysi kunlari" aside={<button type="button" onClick={() => setDays(daily ? [] : [...ALL_DAYS])} className={cn("h-7 rounded-full px-2 font-semibold", daily ? "text-foreground" : "text-faint")}>Har kuni</button>}>
          <DaysPicker days={days} onChange={setDays} />
        </MonoBlock>
        <div className="grid grid-cols-2 gap-2">
          <MonoTile icon={Clock} label="Eslatma" value={time || undefined} filled={!!time} onClick={() => setTimeOpen(true)} />
          <MonoTile icon={Repeat} label="Jadval" value={scheduleLabel(days)} filled={days.length > 0} onClick={() => setDays(daily ? [1, 2, 3, 4, 5] : [...ALL_DAYS])} />
        </div>
        <AgendaToggle checked={agenda} onChange={setAgenda} />
        <MonoSave disabled={!title.trim() || days.length === 0 || !dirty} onClick={save}>Saqlash</MonoSave>
      </MonoExpand>

      {archived ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onRestore} className="flex h-[52px] items-center justify-center gap-2 rounded-[22px] bg-accent text-[15px] font-semibold text-accent-ink"><Undo2 className="size-[18px]" /> Qaytarish</button>
          <button type="button" onClick={onDelete} className="flex h-[52px] items-center justify-center gap-2 rounded-[22px] border border-border bg-surface text-[15px] font-semibold text-danger"><Trash2 className="size-[18px]" /> O&apos;chirish</button>
        </div>
      ) : (
        <button type="button" onClick={onArchive} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[22px] border border-border bg-surface text-[15px] font-semibold text-muted"><Archive className="size-[18px]" /> Arxivlash</button>
      )}

      <PickerModal open={timeOpen} onClose={() => setTimeOpen(false)} label="Eslatma vaqti">
        <TimePicker large value={time} occupiedSlots={busySlots(plans, days, habit.id)} onChange={(v) => { setTime(v); setTimeOpen(false); }} onClear={() => { setTime(""); setTimeOpen(false); }} />
      </PickerModal>
    </>
  );
}

/* ─── Toifa formasi ─── */
function CatFormBody({ cat, onClose, onSave }: { cat?: HabitCategory; onClose: () => void; onSave: (label: string, icon: IconKey) => void }) {
  const [label, setLabel] = useState(cat?.label ?? "");
  const [icon, setIcon] = useState<IconKey>((cat?.icon as IconKey) ?? "star");
  return (
    <>
      <MonoHeader label={cat ? "Toifani tahrirlash" : "Yangi toifa"} value={label} onChange={setLabel} placeholder="Masalan: Salomatlik" onEnter={() => label.trim() && onSave(label.trim(), icon)} onClose={onClose} />
      <MonoBlock icon={Sparkles} label="Ikona" aside={<span className="flex items-center gap-1.5 opacity-60"><CategoryIcon k={icon} className="size-4" /> {label.trim() || "Toifa"}</span>}>
        <IconPicker value={icon} onChange={setIcon} />
      </MonoBlock>
      <MonoSave disabled={!label.trim()} onClick={() => onSave(label.trim(), icon)}>{cat ? "Saqlash" : "Qo'shish"}</MonoSave>
    </>
  );
}
