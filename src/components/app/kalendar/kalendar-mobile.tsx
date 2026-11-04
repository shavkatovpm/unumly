"use client";

/* Kalendar — mobil ko'rinish. Asosiy rejim — Oy (panjara + tanlangan kun
   ro'yxati); Kun (vaqt chizig'i), Hafta (kunlar bo'yicha ro'yxat) va Yil ham bor.
   Desktop ko'rinishi KalendarView'da o'zgarmagan. */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Eraser, Plus } from "lucide-react";
import type { Plan, PlanPriority, PlanScope } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMobileAdd } from "@/lib/mobile-add";
import { getCalendarGrid, isSameDay, parseTimeToMinutes, startOfDay, startOfMonth, startOfWeek, toDateInputValue } from "@/lib/dates";
import { Collapsed, PRIORITY_COLOR, ROW_MOTION, Tick, usePendingDone } from "../bugun/mobile-ui";
import { TaskAddSheet } from "../widgets/task-add-sheet";
import { TaskDetail } from "../widgets/task-detail";
import { ConfirmDialog } from "../widgets/confirm-dialog";

const MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
const WD = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const wdOf = (d: Date) => WD[(d.getDay() + 6) % 7];
const HOUR = 56;
const SPRING = { type: "spring", stiffness: 460, damping: 38 } as const;

type Mode = "kun" | "hafta" | "oy" | "yil";
type CreateInput = { title: string; scope: PlanScope; scheduledFor: string; time?: string; priority?: PlanPriority; duration?: number };

const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return startOfDay(x); };
const byTime = (a: Plan, b: Plan) => (a.time ?? "99").localeCompare(b.time ?? "99");
const dayLabel = (d: Date, today: Date) => (isSameDay(d, today) ? "Bugun" : `${wdOf(d)}, ${d.getDate()}-${MONTHS[d.getMonth()].toLowerCase()}`);

export function KalendarMobile({ plans, onCreate, onUpdate, onToggle, onRemove, onRemoveMany }: {
  plans: Plan[];
  onCreate: (input: CreateInput) => string;
  onUpdate: (id: string, patch: Partial<Plan>) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onRemoveMany: (ids: string[]) => void;
}) {
  const today = useMemo(() => startOfDay(), []);
  const [mode, setMode] = useState<Mode>("oy");
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState(() => startOfMonth(today));
  const [dir, setDir] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Plan | null>(null);
  const [adding, setAdding] = useState(false);
  const [clearDay, setClearDay] = useState<string | null>(null);

  const daily = useMemo(() => plans.filter((p) => p.scope === "DAILY"), [plans]);
  const ofDay = (iso: string) => daily.filter((p) => p.scheduledFor === iso).sort(byTime);
  const selIso = toDateInputValue(selected);

  useMobileAdd(() => setAdding(true));

  function pickDay(d: Date) {
    setSelected(d);
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) setView(startOfMonth(d));
  }
  function shift(n: number) {
    setDir(n);
    if (mode === "oy") setView((v) => new Date(v.getFullYear(), v.getMonth() + n, 1));
    else if (mode === "yil") setView((v) => new Date(v.getFullYear() + n, v.getMonth(), 1));
    else pickDay(addDays(selected, mode === "kun" ? n : n * 7));
  }
  function goToday() {
    setSelected(today);
    setView(startOfMonth(today));
  }
  function newDraft(iso: string, time?: string) {
    setDraft({ id: "__draft__", title: "", deferCount: 0, scope: "DAILY", scheduledFor: iso, time, duration: time ? 60 : undefined, status: "TODO", createdAt: new Date().toISOString(), order: 0 });
  }

  const title =
    mode === "yil" ? `${view.getFullYear()}`
    : mode === "oy" ? `${MONTHS[view.getMonth()]} ${view.getFullYear()}`
    : `${MONTHS[selected.getMonth()]} ${selected.getFullYear()}`;
  const atToday = mode === "oy" || mode === "yil"
    ? view.getMonth() === today.getMonth() && view.getFullYear() === today.getFullYear() && isSameDay(selected, today)
    : isSameDay(selected, today);
  const detailPlan = detailId ? plans.find((p) => p.id === detailId) ?? null : null;
  const clearList = clearDay ? ofDay(clearDay) : [];

  return (
    <div className="h-full overflow-y-auto overscroll-contain pb-32 [-webkit-overflow-scrolling:touch]">
      <div className="flex items-center gap-1 px-4 pt-1">
        <h1 className="min-w-0 flex-1 truncate text-[22px] font-bold leading-tight tracking-[-0.025em]">{title}</h1>
        {!atToday && <button type="button" onClick={goToday} className="h-9 rounded-full bg-subtle px-3.5 text-[13px] font-semibold">Bugun</button>}
        <button type="button" onClick={() => shift(-1)} aria-label="Oldingi" className="grid size-9 place-items-center rounded-full text-muted active:bg-hover"><ChevronLeft className="size-5" /></button>
        <button type="button" onClick={() => shift(1)} aria-label="Keyingi" className="grid size-9 place-items-center rounded-full text-muted active:bg-hover"><ChevronRight className="size-5" /></button>
      </div>

      <div className="px-4">
        <div role="tablist" aria-label="Ko'rinish" className="mt-2 flex rounded-[14px] bg-subtle p-0.5">
          {([["kun", "Kun"], ["hafta", "Hafta"], ["oy", "Oy"], ["yil", "Yil"]] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => { setMode(id); if (id === "oy" || id === "yil") setView(startOfMonth(selected)); }} className={cn("relative h-8 flex-1 rounded-[12px] text-[13px] font-semibold", mode === id ? "text-foreground" : "text-muted")}>
              {mode === id && <motion.span layoutId="kal-mode" transition={SPRING} className="absolute inset-0 rounded-[12px] bg-surface shadow-sm" />}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>

        {mode === "oy" && (
          <>
            <motion.div
              key={view.getTime()}
              initial={{ opacity: 0, x: dir * 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
              drag="x"
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, i) => { if (i.offset.x < -50) shift(1); else if (i.offset.x > 50) shift(-1); }}
              className="mt-2 rounded-[22px] border border-border bg-surface p-2"
            >
              <MonthGrid view={view} selected={selected} today={today} counts={(iso) => ofDay(iso).length} onPick={pickDay} />
            </motion.div>
            <DayList date={selected} today={today} list={ofDay(selIso)} onOpen={setDetailId} onToggle={onToggle} onAdd={() => setAdding(true)} onClear={() => setClearDay(selIso)} />
          </>
        )}

        {mode === "kun" && (
          <>
            <p className="mb-0.5 mt-3 px-1 text-[13px] font-semibold text-muted">{dayLabel(selected, today)}</p>
            <Timeline iso={selIso} isToday={isSameDay(selected, today)} list={ofDay(selIso)} onOpen={setDetailId} onSlot={(t) => newDraft(selIso, t)} />
          </>
        )}

        {mode === "hafta" && (
          Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selected), i)).map((d) => {
            const iso = toDateInputValue(d);
            const list = ofDay(iso);
            return (
              <div key={iso}>
                <div className="mb-1.5 mt-4 flex items-center justify-between px-1">
                  <p className={cn("text-[14px] font-semibold", isSameDay(d, today) && "underline decoration-2 underline-offset-4")}>{dayLabel(d, today)}</p>
                  <span className="flex items-center gap-1">
                    <span className="mr-1 text-[12.5px] tabular-nums text-faint">{list.filter((p) => p.status === "DONE").length}/{list.length}</span>
                    <button type="button" onClick={() => { setSelected(d); setAdding(true); }} aria-label="Shu kunga qo'shish" className="grid size-8 place-items-center rounded-full bg-subtle"><Plus className="size-4" /></button>
                  </span>
                </div>
                {list.length > 0 ? (
                  <div className="overflow-hidden rounded-[20px] border border-border bg-surface [&>*+*]:border-t [&>*+*]:border-border">
                    {list.map((p) => <PlanLine key={p.id} p={p} onOpen={setDetailId} onToggle={onToggle} />)}
                  </div>
                ) : (
                  <p className="rounded-[16px] border border-dashed border-border px-3 py-2.5 text-[13px] text-faint">Reja yo&apos;q</p>
                )}
              </div>
            );
          })
        )}

        {mode === "yil" && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {MONTHS.map((m, i) => {
              const key = `${view.getFullYear()}-${String(i + 1).padStart(2, "0")}`;
              const list = daily.filter((p) => p.scheduledFor.startsWith(key));
              const done = list.filter((p) => p.status === "DONE").length;
              const cur = i === today.getMonth() && view.getFullYear() === today.getFullYear();
              return (
                <button key={m} type="button" onClick={() => { setView(new Date(view.getFullYear(), i, 1)); setMode("oy"); }} className={cn("rounded-[18px] border bg-surface p-3 text-left active:bg-hover", cur ? "border-foreground/40" : "border-border")}>
                  <span className="block text-[14px] font-semibold">{m}</span>
                  <span className="block text-[12px] tabular-nums text-faint">{list.length ? `${done}/${list.length} reja` : "—"}</span>
                  {list.length > 0 && <span className="mt-2 block h-1 overflow-hidden rounded-full bg-subtle"><span className="block h-full rounded-full bg-foreground" style={{ width: `${(done / list.length) * 100}%` }} /></span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <TaskDetail
        plan={detailPlan ?? draft}
        plans={plans}
        open={!!detailPlan || !!draft}
        onClose={() => { setDetailId(null); setDraft(null); }}
        onUpdate={onUpdate}
        onRemove={onRemove}
        draft={!!draft && !detailPlan}
        onCreate={(input) => {
          const id = onCreate(input);
          setDraft(null);
          return id;
        }}
      />
      <TaskAddSheet
        open={adding}
        onClose={() => setAdding(false)}
        plans={plans}
        defaultDate={selected < today ? today : selected}
        placeholder="Yangi reja..."
        onCreate={(input) => { onCreate(input); }}
        onDetail={setDraft}
      />
      <ConfirmDialog
        open={!!clearDay}
        title="Kun tozalansinmi?"
        description={`${clearList.length} ta reja o'chiriladi va 30 kun davomida "O'chirilgan" bo'limida saqlanadi.`}
        confirmLabel="Tozalash"
        destructive
        onConfirm={() => { onRemoveMany(clearList.map((p) => p.id)); setClearDay(null); }}
        onClose={() => setClearDay(null)}
      />
    </div>
  );
}

/* Oy panjarasi: kun raqami, ostida rejalar nuqtalari (3 tagacha). */
function MonthGrid({ view, selected, today, counts, onPick }: { view: Date; selected: Date; today: Date; counts: (iso: string) => number; onPick: (d: Date) => void }) {
  return (
    <div className="grid grid-cols-7">
      {WD.map((w) => <span key={w} className="grid h-7 place-items-center text-[12px] font-medium text-faint">{w}</span>)}
      {getCalendarGrid(view).flat().map((d) => {
        const iso = toDateInputValue(d);
        const inMonth = d.getMonth() === view.getMonth();
        const sel = isSameDay(d, selected);
        const isToday = isSameDay(d, today);
        const n = counts(iso);
        return (
          <button key={iso} type="button" onClick={() => onPick(startOfDay(d))} className="grid h-[54px] place-items-center">
            <span className={cn("relative grid size-10 place-items-center rounded-full text-[15px] tabular-nums transition-colors", sel ? "bg-accent font-semibold text-accent-ink" : isToday ? "font-semibold ring-1 ring-inset ring-foreground/35" : inMonth ? "text-foreground" : "text-faint/50")}>
              {d.getDate()}
              {n > 0 && <DayDots n={n} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* Rejalar soni — nuqtalar doira bo'ylab: pastki o'rtadan boshlab ikki tomonga
   navbatma-navbat yoyiladi (1, 2-o'ng, 3-chap, ...). 16 tadan keyin doira to'ladi. */
const DOT_STEP = 22.5;
const DOT_RADIUS = 23;
function DayDots({ n }: { n: number }) {
  const count = Math.min(n, 16);
  return (
    <span aria-label={`${n} ta reja`} className="pointer-events-none absolute inset-0">
      {Array.from({ length: count }, (_, i) => {
        const k = i === 0 ? 0 : Math.ceil(i / 2) * (i % 2 ? -1 : 1);
        const a = ((90 + k * DOT_STEP) * Math.PI) / 180;
        return (
          <span
            key={i}
            className="absolute size-[5px] rounded-full bg-muted"
            style={{ left: `calc(50% + ${Math.cos(a) * DOT_RADIUS}px - 2.5px)`, top: `calc(50% + ${Math.sin(a) * DOT_RADIUS}px - 2.5px)` }}
          />
        );
      })}
    </span>
  );
}

function PlanLine({ p, onOpen, onToggle }: { p: Plan; onOpen: (id: string) => void; onToggle: (id: string) => void }) {
  // Belgilangach biroz ko'rinib turadi (to'lqin), keyin "Bajarilgan"ga o'tadi.
  const { visual: done, toggle } = usePendingDone(p.status === "DONE", () => onToggle(p.id));
  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(p.id)} className="flex min-h-[58px] cursor-pointer items-center gap-3 px-3.5 py-2 active:bg-hover">
      <span className="w-12 shrink-0 text-[13px] font-semibold tabular-nums text-muted">{p.time ?? "—"}</span>
      <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: p.priority ? PRIORITY_COLOR[p.priority] : "var(--border-strong)" }} />
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[15px] font-semibold", done && "text-faint line-through decoration-faint/60")}>{p.title}</span>
        {p.time && p.duration && <span className="block text-[12px] text-faint">{p.duration} daq.</span>}
      </span>
      <Tick on={done} onClick={toggle} size={24} />
    </div>
  );
}

function DayList({ date, today, list, onOpen, onToggle, onAdd, onClear }: { date: Date; today: Date; list: Plan[]; onOpen: (id: string) => void; onToggle: (id: string) => void; onAdd: () => void; onClear: () => void }) {
  const active = list.filter((p) => p.status !== "DONE");
  const done = list.filter((p) => p.status === "DONE");
  return (
    <>
      <div className="mb-1.5 mt-4 flex items-center justify-between px-1">
        <p className="text-[14px] font-semibold">{dayLabel(date, today)}</p>
        <span className="flex items-center gap-1">
          <span className="text-[12.5px] tabular-nums text-faint">{list.filter((p) => p.status === "DONE").length}/{list.length}</span>
          {list.length > 0 && <button type="button" onClick={onClear} aria-label="Kunni tozalash" className="ml-1 grid size-8 place-items-center rounded-full text-faint active:bg-hover"><Eraser className="size-4" /></button>}
        </span>
      </div>
      {active.length > 0 && (
        <div className="overflow-hidden rounded-[22px] border border-border bg-surface [&>*+*]:border-t [&>*+*]:border-border">
          <AnimatePresence initial={false}>
            {active.map((p) => (
              <motion.div key={p.id} {...ROW_MOTION}>
                <PlanLine p={p} onOpen={onOpen} onToggle={onToggle} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      {list.length > 0 && active.length === 0 && (
        <p className="rounded-[18px] border border-dashed border-border px-4 py-4 text-center text-[13.5px] text-faint">Bu kunning hamma rejalari bajarildi</p>
      )}
      {/* Bajarilganlar — pastda yopiq, belgini olib tashlasa ro'yxatga qaytadi */}
      {done.length > 0 && (
        <Collapsed label="Bajarilgan" count={done.length} className="mt-2">
          <div className="overflow-hidden rounded-[22px] border border-border bg-surface [&>*+*]:border-t [&>*+*]:border-border">
            {done.map((p) => <PlanLine key={p.id} p={p} onOpen={onOpen} onToggle={onToggle} />)}
          </div>
        </Collapsed>
      )}
      <button type="button" onClick={onAdd} className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-[18px] border border-dashed border-border text-[14px] font-medium text-muted">
        <Plus className="size-4" /> {list.length ? "Shu kunga qo'shish" : "Bu kun bo'sh — reja qo'shish"}
      </button>
    </>
  );
}

/* Kun vaqt chizig'i: vaqtsizlar tepada, bloklar soat bo'yicha, bo'sh soat — yangi reja. */
function Timeline({ iso, isToday, list, onOpen, onSlot }: { iso: string; isToday: boolean; list: Plan[]; onOpen: (id: string) => void; onSlot: (time: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [nowMin, setNowMin] = useState(() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); });
  useEffect(() => {
    const t = window.setInterval(() => { const n = new Date(); setNowMin(n.getHours() * 60 + n.getMinutes()); }, 60_000);
    return () => window.clearInterval(t);
  }, []);
  // Ochilganda: bugun bo'lsa hozirgi vaqtdan biroz oldin, aks holda 07:00.
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = Math.max(0, isToday ? nowMin / 60 - 1.5 : 7) * HOUR;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);
  const untimed = list.filter((p) => !p.time);
  const timed = list.filter((p) => p.time);
  return (
    <>
      {untimed.length > 0 && (
        <div className="mt-1 flex max-h-[84px] flex-col gap-1 overflow-y-auto [scrollbar-width:none]">
          {untimed.map((p) => (
            <button key={p.id} type="button" onClick={() => onOpen(p.id)} className={cn("shrink-0 truncate rounded-[10px] bg-subtle px-3 py-1.5 text-left text-[13px] font-medium", p.status === "DONE" && "text-faint line-through")}>{p.title}</button>
          ))}
        </div>
      )}
      <div ref={ref} className="relative mt-2 h-[max(320px,calc(var(--tg-vh,100dvh)-var(--tg-safe-top,0px)-330px))] overflow-y-auto overscroll-contain rounded-[18px] border border-border bg-surface [scrollbar-width:none]">
        <div className="relative flex pt-2">
          <div className="w-12 shrink-0">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="relative" style={{ height: HOUR }}>
                <span className="absolute -top-2 right-2 text-[11px] tabular-nums text-faint">{h ? `${String(h).padStart(2, "0")}:00` : ""}</span>
              </div>
            ))}
          </div>
          <div className="relative flex-1 border-l border-border/70">
            {Array.from({ length: 24 }, (_, h) => (
              <button key={h} type="button" aria-label={`${h}:00 da reja`} onClick={() => onSlot(`${String(h).padStart(2, "0")}:00`)} className="block w-full border-t border-border/60 active:bg-hover" style={{ height: HOUR }} />
            ))}
            {timed.map((p) => {
              const top = (parseTimeToMinutes(p.time!) / 60) * HOUR;
              const h = Math.max(26, ((p.duration ?? 45) / 60) * HOUR - 2);
              const color = p.priority ? PRIORITY_COLOR[p.priority] : "var(--muted)";
              return (
                <button key={p.id} type="button" onClick={() => onOpen(p.id)} className="absolute inset-x-1 overflow-hidden rounded-[10px] px-2 py-1 text-left" style={{ top: top + 1, height: h, background: `color-mix(in oklch, ${color} 16%, var(--surface))`, borderLeft: `3px solid ${color}` }}>
                  <span className={cn("block truncate text-[13px] font-semibold leading-tight", p.status === "DONE" && "text-faint line-through")}>{p.title}</span>
                  {h > 34 && <span className="block text-[11px] tabular-nums text-muted">{p.time}</span>}
                </button>
              );
            })}
            {isToday && (
              <span className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: (nowMin / 60) * HOUR }}>
                <span className="-ml-1 size-2 rounded-full bg-current-time" />
                <span className="h-px flex-1 bg-current-time" />
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
