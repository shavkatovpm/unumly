"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Plan } from "@/lib/types";
import { toDateInputValue } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PickerModal } from "./picker-modal";

/* ════════════════════════════════════════════════════════════
   Task bajarish analitikasi — "Bajarildi / Qoldi" diagrammasi.
   Markazdan yuqoriga bajarilgan (theme accent), pastga qolgan (qizil).
   Davr toggle (hafta/oy/3 oy/muayyan oy). Hammasi client'da.
   ════════════════════════════════════════════════════════════ */

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const MONTHS_SHORT = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyn",
  "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek",
];
const WEEKDAYS = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"]; // getDay(): 0=Yakshanba

type RangeType = "week" | "month" | "3month" | "specific";
type Stat = { done: number; onTime: number; late: number; total: number; pct: number };
type Bar = {
  key: string;
  label: string;
  tipDate: string;
  done: number;
  onTime: number;
  late: number;
  total: number;
  pct: number;
};

/** Task kech bajarilganmi: DONE + bajarilgan kuni rejalashtirilgan kundan keyin. */
function isLate(p: Plan): boolean {
  if (p.status !== "DONE" || !p.completedAt) return false;
  return toDateInputValue(new Date(p.completedAt)) > p.scheduledFor;
}

function periodStat(plans: Plan[], startIso: string, endIso: string): Stat {
  let onTime = 0;
  let late = 0;
  let total = 0;
  for (const p of plans) {
    if (p.scope !== "DAILY") continue;
    if (p.scheduledFor < startIso || p.scheduledFor > endIso) continue;
    total++;
    if (p.status === "DONE") {
      if (isLate(p)) late++;
      else onTime++;
    }
  }
  const done = onTime + late;
  return { done, onTime, late, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

function shiftDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const TOGGLE: { key: RangeType; label: string }[] = [
  { key: "week", label: "Hafta" },
  { key: "month", label: "Oy" },
  { key: "3month", label: "3 oy" },
];

/** Analitika hisob-kitobi — desktop va mobil ko'rinishlar uchun umumiy. */
function useTaskAnalytics(plans: Plan[], today: Date, onRangeLabelChange?: (label: string) => void) {
  const [rangeType, setRangeType] = useState<RangeType>("week");
  const [specificYM, setSpecificYM] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  );

  // Eng eski kunlik vazifa sanasi — yil chegaralari va "3 oy" qulfi uchun.
  const earliest = useMemo(() => {
    let min: string | null = null;
    for (const p of plans) {
      if (p.scope !== "DAILY") continue;
      if (min === null || p.scheduledFor < min) min = p.scheduledFor;
    }
    return min;
  }, [plans]);

  // 3 oylik tahlil faqat 30 kundan eski ma'lumot bo'lsa ma'no beradi.
  const threeMonthAvailable = useMemo(() => {
    const cutoff = toDateInputValue(shiftDays(today, -30));
    return earliest !== null && earliest < cutoff;
  }, [earliest, today]);

  const maxYear = today.getFullYear();
  const minYear = earliest ? Math.min(Number(earliest.slice(0, 4)), maxYear) : maxYear;

  // 3 oy qulfli bo'lsa va u tanlangan bo'lsa — haftaga qaytamiz.
  const effectiveRange: RangeType = rangeType === "3month" && !threeMonthAvailable ? "week" : rangeType;

  // Tanlangan davr nomi (sarlavhada "Haftalik analitika" kabi ko'rsatish uchun).
  const headerLabel =
    effectiveRange === "week"
      ? "Haftalik analitika"
      : effectiveRange === "month"
      ? "Oylik analitika"
      : effectiveRange === "3month"
      ? "3 oylik analitika"
      : `${MONTHS[Number(specificYM.split("-")[1]) - 1]} analitikasi`;
  useEffect(() => {
    onRangeLabelChange?.(headerLabel);
  }, [headerLabel, onRangeLabelChange]);

  const { bars, axis, overall, prev, rangeLabel, perDay, maxTotal } = useMemo(() => {
    let start: Date;
    let end: Date;
    let label: string;
    if (effectiveRange === "week") {
      start = shiftDays(today, -6);
      end = today;
      label = "Oxirgi 7 kun";
    } else if (effectiveRange === "month") {
      start = shiftDays(today, -29);
      end = today;
      label = "Oxirgi 30 kun";
    } else if (effectiveRange === "3month") {
      start = shiftDays(today, -89);
      end = today;
      label = "Oxirgi 3 oy";
    } else {
      const [y, m] = specificYM.split("-").map(Number);
      start = new Date(y, m - 1, 1);
      const isCurrent = y === today.getFullYear() && m - 1 === today.getMonth();
      end = isCurrent ? today : new Date(y, m, 0);
      label = `${MONTHS[m - 1]} ${y}`;
    }

    const startIso = toDateInputValue(start);
    const endIso = toDateInputValue(end);
    const rangeDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

    const daily: { date: Date; stat: Stat }[] = [];
    for (let i = 0; i < rangeDays; i++) {
      const d = shiftDays(start, i);
      daily.push({ date: d, stat: periodStat(plans, toDateInputValue(d), toDateInputValue(d)) });
    }

    const grouped = rangeDays > 45;
    const perBarLabel = !grouped && daily.length <= 10;
    const out: Bar[] = [];
    const fmt = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

    if (grouped) {
      for (let i = 0; i < daily.length; i += 7) {
        const chunk = daily.slice(i, i + 7);
        let onTime = 0;
        let late = 0;
        let total = 0;
        for (const c of chunk) {
          onTime += c.stat.onTime;
          late += c.stat.late;
          total += c.stat.total;
        }
        const done = onTime + late;
        const a = chunk[0].date;
        const b = chunk[chunk.length - 1].date;
        out.push({
          key: toDateInputValue(a),
          label: "",
          tipDate: `${fmt(a)} – ${fmt(b)}`,
          done,
          onTime,
          late,
          total,
          pct: total ? Math.round((done / total) * 100) : 0,
        });
      }
    } else {
      daily.forEach((c) => {
        out.push({
          key: toDateInputValue(c.date),
          label: perBarLabel ? WEEKDAYS[c.date.getDay()] : "",
          tipDate: `${c.date.getDate()} ${MONTHS[c.date.getMonth()]}, ${WEEKDAYS[c.date.getDay()]}`,
          done: c.stat.done,
          onTime: c.stat.onTime,
          late: c.stat.late,
          total: c.stat.total,
          pct: c.stat.pct,
        });
      });
    }

    const mid = shiftDays(start, Math.floor((rangeDays - 1) / 2));
    const axis = perBarLabel ? null : [fmt(start), fmt(mid), fmt(end)];

    const prevEnd = shiftDays(start, -1);
    const prevStart = shiftDays(prevEnd, -(rangeDays - 1));
    const prevStat = periodStat(plans, toDateInputValue(prevStart), toDateInputValue(prevEnd));

    const activeDays = daily.filter((d) => d.stat.total > 0);

    return {
      bars: out,
      axis,
      overall: periodStat(plans, startIso, endIso),
      prev: prevStat,
      rangeLabel: label,
      maxTotal: Math.max(1, ...out.map((b) => b.total)),
      perDay: {
        best: activeDays.reduce((m, d) => Math.max(m, d.stat.pct), 0),
        full: activeDays.filter((d) => d.stat.pct === 100).length,
        active: activeDays.length,
      },
    };
  }, [plans, today, effectiveRange, specificYM]);

  return {
    rangeType, setRangeType, specificYM, setSpecificYM, threeMonthAvailable, minYear, maxYear, effectiveRange,
    bars, axis, overall, prev, rangeLabel, perDay, maxTotal,
    delta: overall.pct - prev.pct,
    hasData: overall.total > 0,
  };
}

export function TaskAnalytics({
  plans,
  today,
  onRangeLabelChange,
}: {
  plans: Plan[];
  today: Date;
  onRangeLabelChange?: (label: string) => void;
}) {
  const {
    rangeType, setRangeType, specificYM, setSpecificYM, threeMonthAvailable, minYear, maxYear, effectiveRange,
    bars, axis, overall, prev, rangeLabel, perDay, maxTotal, delta, hasData,
  } = useTaskAnalytics(plans, today, onRangeLabelChange);

  // "3 oy" qulfi bosilganda chiqadigan sabab tooltip'i.
  const [lockTip, setLockTip] = useState(false);
  const lockTimer = useRef<number | null>(null);
  function showLockTip() {
    setLockTip(true);
    if (lockTimer.current) window.clearTimeout(lockTimer.current);
    lockTimer.current = window.setTimeout(() => setLockTip(false), 3000);
  }

  return (
    <div className="space-y-4 px-4 py-5 sm:px-5">
      {/* Davr toggle + muayyan oy */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
          {TOGGLE.map((t) => {
            const locked = t.key === "3month" && !threeMonthAvailable;
            if (locked) {
              return (
                <div key={t.key} className="relative">
                  <button
                    type="button"
                    onClick={showLockTip}
                    className="flex cursor-not-allowed items-center gap-1 rounded px-2.5 py-1 text-[12px] font-medium text-faint/60"
                  >
                    <Lock className="size-3" />
                    {t.label}
                  </button>
                  <AnimatePresence>
                    {lockTip && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.16 }}
                        className="absolute left-0 top-full z-20 mt-1.5 w-44 rounded-md border border-border bg-foreground px-2.5 py-1.5 text-[10.5px] leading-snug text-background shadow-lg"
                      >
                        Hali 3 oylik ma&apos;lumot yo&apos;q — bir muncha vaqt foydalanganingizdan
                        so&apos;ng ochiladi.
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setRangeType(t.key)}
                className={cn(
                  "rounded px-2.5 py-1 text-[12px] font-medium transition-colors",
                  rangeType === t.key ? "bg-accent text-accent-ink" : "text-muted hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <MonthPicker
          activeYM={rangeType === "specific" ? specificYM : null}
          minYear={minYear}
          maxYear={maxYear}
          today={today}
          onSelect={(ym) => {
            setSpecificYM(ym);
            setRangeType("specific");
          }}
        />
      </div>

      {/* Sarlavha + umumiy foiz + trend */}
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">{rangeLabel}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p
              className="font-mono text-[30px] font-semibold tabular-nums leading-none"
              style={{ color: hasData ? "var(--accent)" : "var(--faint)" }}
            >
              {overall.pct}
              <span className="text-[16px]">%</span>
            </p>
            {hasData && prev.total > 0 && <TrendBadge delta={delta} />}
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-[13px] font-semibold tabular-nums leading-none">
            {overall.done}/{overall.total}
          </p>
          <p className="mt-1 text-[11px] text-faint">bajarildi</p>
        </div>
      </div>

      {/* Grafik: Bajarildi / Qoldi — davr o'zgarganda silliq almashadi */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${effectiveRange}:${specificYM}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {!hasData ? (
            <div className="grid h-36 place-items-center rounded-xl border border-border bg-surface text-[12px] text-faint">
              Bu davrda ma&apos;lumot yo&apos;q
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
              <SplitChart bars={bars} axis={axis} maxTotal={maxTotal} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Ixcham ko'rsatkichlar */}
      <div className="grid grid-cols-3 gap-2">
        <StatChip label="Eng yaxshi kun" value={`${perDay.best}%`} />
        <StatChip label="To'liq kunlar" value={String(perDay.full)} />
        <StatChip label="Kech bajarildi" value={String(overall.late)} />
      </div>
    </div>
  );
}

/* ════════════ Oy tanlash (custom dropdown) ════════════ */
function MonthPicker({
  activeYM,
  minYear,
  maxYear,
  today,
  onSelect,
}: {
  activeYM: string | null;
  minYear: number;
  maxYear: number;
  today: Date;
  onSelect: (ym: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(activeYM ? Number(activeYM.split("-")[0]) : maxYear);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const label = activeYM
    ? `${MONTHS_SHORT[Number(activeYM.split("-")[1]) - 1]} ${activeYM.split("-")[0]}`
    : "Oy tanlash";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-md border bg-surface px-2.5 py-1.5 text-[12px] transition-colors",
          activeYM ? "border-accent text-foreground" : "border-border text-muted hover:text-foreground"
        )}
      >
        <CalendarDays className="size-3.5 shrink-0" />
        <span>{label}</span>
        <ChevronDown className={cn("size-3.5 shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-30 mt-1.5 w-56 origin-top-right rounded-lg border border-border bg-surface p-2.5 shadow-xl"
          >
            {/* Yil — alohida stepper */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                disabled={year <= minYear}
                onClick={() => setYear((y) => Math.max(minYear, y - 1))}
                className="grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="font-mono text-[14px] font-semibold tabular-nums">{year}</span>
              <button
                type="button"
                disabled={year >= maxYear}
                onClick={() => setYear((y) => Math.min(maxYear, y + 1))}
                className="grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            {/* Oylar — yilsiz */}
            <div className="grid grid-cols-3 gap-1">
              {MONTHS_SHORT.map((m, i) => {
                const ym = `${year}-${String(i + 1).padStart(2, "0")}`;
                const future = year === today.getFullYear() && i > today.getMonth();
                const selected = activeYM === ym;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={future}
                    onClick={() => {
                      onSelect(ym);
                      setOpen(false);
                    }}
                    className={cn(
                      "rounded-md py-1.5 text-[12px] font-medium transition-colors",
                      selected
                        ? "bg-accent text-accent-ink"
                        : future
                        ? "cursor-not-allowed text-faint/40"
                        : "text-muted hover:bg-hover hover:text-foreground"
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════ Bajarildi / Qoldi (diverging) ════════════ */
function SplitChart({ bars, axis, maxTotal }: { bars: Bar[]; axis: string[] | null; maxTotal: number }) {
  return (
    <div>
      <div className="relative h-32">
        <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
        <div className="absolute inset-0 flex items-stretch gap-[3px]">
          {bars.map((b) => {
            const onTimeH = (b.onTime / maxTotal) * 50;
            const lateH = (b.late / maxTotal) * 50;
            const undoneH = ((b.total - b.done) / maxTotal) * 50;
            return (
              <div key={b.key} className="relative flex-1">
                {/* O'z vaqtida — markazdan yuqoriga */}
                <div
                  className="absolute bottom-1/2 w-full rounded-t-[3px] transition-[height] duration-500 ease-out"
                  style={{ height: `${onTimeH}%`, background: "var(--accent)" }}
                />
                {/* Kech bajarilgan — markazdan pastga, sariq */}
                <div
                  className={cn(
                    "absolute top-1/2 w-full transition-[height] duration-500 ease-out",
                    b.total - b.done === 0 && "rounded-b-[3px]"
                  )}
                  style={{ height: `${lateH}%`, background: "var(--warning)" }}
                />
                {/* Qolgan — sariq ostida, qizil */}
                <div
                  className="absolute w-full rounded-b-[3px] transition-[height] duration-500 ease-out"
                  style={{ height: `${undoneH}%`, top: `calc(50% + ${lateH}%)`, background: "var(--danger)", opacity: 0.55 }}
                />
              </div>
            );
          })}
        </div>
        <HoverLayer bars={bars} />
      </div>
      <AxisRow bars={bars} axis={axis} />
      <Legend
        items={[
          { color: "var(--accent)", label: "O'z vaqtida ↑" },
          { color: "var(--warning)", label: "Kech ↓" },
          { color: "var(--danger)", label: "Qolgan ↓" },
        ]}
      />
    </div>
  );
}

/* ════════════ Hover, o'q, legend ════════════ */
function HoverLayer({ bars }: { bars: Bar[] }) {
  const [h, setH] = useState<number | null>(null);
  const n = bars.length;
  const b = h != null ? bars[h] : null;
  return (
    <div className="absolute inset-0" onMouseLeave={() => setH(null)}>
      {b && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-foreground px-2 py-1 text-[10.5px] font-medium text-background shadow-lg"
          style={{ left: `${Math.min(88, Math.max(12, ((h! + 0.5) / n) * 100))}%` }}
        >
          <span className="block">{b.tipDate}</span>
          <span className="block tabular-nums text-background/70">
            {b.total === 0
              ? "vazifa yo'q"
              : `${b.done}/${b.total} bajarildi · ${b.pct}%${b.late ? ` (kech: ${b.late})` : ""}`}
          </span>
        </div>
      )}
      <div className="absolute inset-0 flex">
        {bars.map((bar, i) => (
          <div key={bar.key} className="flex-1" onMouseEnter={() => setH(i)} />
        ))}
      </div>
    </div>
  );
}

function AxisRow({ bars, axis }: { bars: Bar[]; axis: string[] | null }) {
  const perBar = bars.some((b) => b.label);
  if (perBar) {
    return (
      <div className="mt-1.5 flex gap-[3px]">
        {bars.map((b) => (
          <span key={b.key} className="flex-1 text-center text-[9.5px] text-faint">
            {b.label}
          </span>
        ))}
      </div>
    );
  }
  if (axis) {
    return (
      <div className="mt-1.5 flex justify-between text-[9.5px] text-faint">
        {axis.map((a, i) => (
          <span key={i}>{a}</span>
        ))}
      </div>
    );
  }
  return null;
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-[10.5px] text-muted">
          <span className="size-2.5 rounded-[3px]" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ════════════ Kichik bo'laklar ════════════ */
function TrendBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="flex items-center gap-0.5 text-[11px] font-medium text-faint">
        <Minus className="size-3" />0%
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className="flex items-center gap-0.5 text-[11px] font-medium tabular-nums"
      style={{ color: up ? "var(--accent)" : "var(--danger)" }}
    >
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? "+" : ""}
      {delta}%
    </span>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-2.5 py-2 text-center">
      <p className="font-mono text-[17px] font-semibold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-[10.5px] leading-tight text-faint">{label}</p>
    </div>
  );
}

/* ════════════ Mobil ko'rinish (Bugun kartasi ichida) ════════════ */
export function TaskAnalyticsMobile({
  plans,
  today,
  onRangeLabelChange,
}: {
  plans: Plan[];
  today: Date;
  onRangeLabelChange?: (label: string) => void;
}) {
  const {
    rangeType, setRangeType, specificYM, setSpecificYM, threeMonthAvailable, minYear, maxYear, effectiveRange,
    bars, axis, overall, prev, rangeLabel, perDay, maxTotal, delta, hasData,
  } = useTaskAnalytics(plans, today, onRangeLabelChange);
  const [monthOpen, setMonthOpen] = useState(false);
  // Mobilda hover yo'q — ustun bosilganda tafsilot chiqadi.
  const [tip, setTip] = useState<number | null>(null);
  const [lockTip, setLockTip] = useState(false);
  const lockTimer = useRef<number | null>(null);
  useEffect(() => () => { if (lockTimer.current) window.clearTimeout(lockTimer.current); }, []);
  function showLockTip() {
    setLockTip(true);
    if (lockTimer.current) window.clearTimeout(lockTimer.current);
    lockTimer.current = window.setTimeout(() => setLockTip(false), 3000);
  }
  const tipBar = tip !== null ? bars[tip] : null;
  const tile = "flex h-11 items-center justify-center gap-1 rounded-[16px] border text-[14px] font-semibold transition-colors";

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-4 gap-2">
        {TOGGLE.map((t) => {
          const locked = t.key === "3month" && !threeMonthAvailable;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => (locked ? showLockTip() : (setRangeType(t.key), setTip(null)))}
              className={cn(tile, rangeType === t.key && !locked ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface text-muted", locked && "border-dashed text-faint")}
            >
              {locked && <Lock className="size-3.5" />}
              {t.label}
            </button>
          );
        })}
        <button type="button" onClick={() => setMonthOpen(true)} className={cn(tile, rangeType === "specific" ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface text-muted")}>
          <CalendarDays className="size-4" />
          {rangeType === "specific" ? MONTHS_SHORT[Number(specificYM.split("-")[1]) - 1] : "Tanlash"}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {lockTip && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden px-1 text-[12.5px] leading-snug text-faint">
            Hali 3 oylik ma&apos;lumot yo&apos;q — bir muncha vaqt foydalanganingizdan so&apos;ng ochiladi.
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[12.5px] font-semibold text-muted">{rangeLabel}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className={cn("text-[34px] font-bold leading-none tracking-[-0.03em] tabular-nums", !hasData && "text-faint")}>
              {overall.pct}<span className="text-[18px]">%</span>
            </p>
            {hasData && prev.total > 0 && (
              <span className={cn("flex items-center gap-0.5 text-[12.5px] font-semibold tabular-nums", delta < 0 ? "text-danger" : delta > 0 ? "text-foreground" : "text-faint")}>
                {delta > 0 ? <TrendingUp className="size-3.5" /> : delta < 0 ? <TrendingDown className="size-3.5" /> : <Minus className="size-3.5" />}
                {delta > 0 ? "+" : ""}{delta}%
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[16px] font-bold tabular-nums">{overall.done}/{overall.total}</p>
          <p className="text-[12px] text-faint">bajarildi</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${effectiveRange}:${specificYM}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {!hasData ? (
            <div className="grid h-36 place-items-center rounded-[20px] border border-border text-[13px] text-faint">Bu davrda ma&apos;lumot yo&apos;q</div>
          ) : (
            <div className="rounded-[20px] border border-border bg-background p-3">
              <div className="mb-2 h-9 text-center">
                {tipBar ? (
                  <>
                    <p className="text-[12.5px] font-semibold">{tipBar.tipDate}</p>
                    <p className="text-[11.5px] tabular-nums text-muted">
                      {tipBar.total === 0 ? "vazifa yo'q" : `${tipBar.done}/${tipBar.total} bajarildi · ${tipBar.pct}%${tipBar.late ? ` · kech: ${tipBar.late}` : ""}`}
                    </p>
                  </>
                ) : (
                  <p className="pt-2.5 text-[12px] text-faint">Ustunni bosing — kun tafsiloti chiqadi</p>
                )}
              </div>
              <div className="relative h-32">
                <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                <div className="absolute inset-0 flex gap-[3px]">
                  {bars.map((b, i) => (
                    <button key={b.key} type="button" aria-label={b.tipDate} onClick={() => setTip(tip === i ? null : i)} className={cn("relative flex-1 rounded-[4px] transition-colors", tip === i && "bg-subtle")}>
                      <span className="absolute bottom-1/2 left-0 right-0 rounded-t-[3px] bg-foreground transition-[height] duration-500 ease-out" style={{ height: `${(b.onTime / maxTotal) * 50}%` }} />
                      <span className="absolute left-0 right-0 top-1/2 bg-muted/60 transition-[height] duration-500 ease-out" style={{ height: `${(b.late / maxTotal) * 50}%` }} />
                      <span className="absolute left-0 right-0 rounded-b-[3px] bg-danger/55 transition-[height] duration-500 ease-out" style={{ top: `calc(50% + ${(b.late / maxTotal) * 50}%)`, height: `${((b.total - b.done) / maxTotal) * 50}%` }} />
                    </button>
                  ))}
                </div>
              </div>
              {axis ? (
                <div className="mt-1.5 flex justify-between text-[10.5px] text-faint">{axis.map((a, i) => <span key={i}>{a}</span>)}</div>
              ) : (
                <div className="mt-1.5 flex gap-[3px]">{bars.map((b) => <span key={b.key} className="flex-1 text-center text-[10.5px] text-faint">{b.label}</span>)}</div>
              )}
              <div className="mt-2.5 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-foreground" />O&apos;z vaqtida ↑</span>
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-muted/60" />Kech ↓</span>
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-danger/55" />Qolgan ↓</span>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-2">
        {[
          { v: `${perDay.best}%`, l: "Eng yaxshi kun" },
          { v: String(perDay.full), l: "To'liq kunlar" },
          { v: String(overall.late), l: "Kech bajarildi" },
        ].map((x) => (
          <div key={x.l} className="rounded-[18px] border border-border bg-background px-2 py-3 text-center">
            <p className="text-[18px] font-bold tabular-nums leading-none">{x.v}</p>
            <p className="mt-1.5 text-[11.5px] leading-tight text-faint">{x.l}</p>
          </div>
        ))}
      </div>

      <PickerModal open={monthOpen} onClose={() => setMonthOpen(false)} label="Oy tanlash">
        <MonthGrid
          today={today}
          activeYM={rangeType === "specific" ? specificYM : null}
          minYear={minYear}
          maxYear={maxYear}
          onPick={(ym) => {
            setSpecificYM(ym);
            setRangeType("specific");
            setTip(null);
            setMonthOpen(false);
          }}
        />
      </PickerModal>
    </div>
  );
}

function MonthGrid({ today, activeYM, minYear, maxYear, onPick }: { today: Date; activeYM: string | null; minYear: number; maxYear: number; onPick: (ym: string) => void }) {
  const [year, setYear] = useState(activeYM ? Number(activeYM.split("-")[0]) : maxYear);
  const step = "grid size-10 place-items-center rounded-full bg-subtle disabled:opacity-30";
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" disabled={year <= minYear} onClick={() => setYear(year - 1)} aria-label="Oldingi yil" className={step}><ChevronLeft className="size-5" /></button>
        <span className="text-[17px] font-bold tabular-nums">{year}</span>
        <button type="button" disabled={year >= maxYear} onClick={() => setYear(year + 1)} aria-label="Keyingi yil" className={step}><ChevronRight className="size-5" /></button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {MONTHS.map((m, i) => {
          const ym = `${year}-${String(i + 1).padStart(2, "0")}`;
          const future = year === today.getFullYear() && i > today.getMonth();
          return (
            <button key={m} type="button" disabled={future} onClick={() => onPick(ym)} className={cn("h-12 rounded-[16px] text-[14.5px] font-semibold transition-colors", activeYM === ym ? "bg-accent text-accent-ink" : future ? "text-faint/40" : "bg-subtle/70")}>
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}
