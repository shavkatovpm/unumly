"use client";

/* Bugun va Agenda mobil ko'rinishi uchun umumiy bo'laklar: ixcham sarlavha,
   dumaloq belgi, halqa, yig'iladigan bo'lim, task belgilari. */

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import { ChevronDown, ListChecks, Repeat, Tag, Target } from "lucide-react";
import type { Plan } from "@/lib/types";
import { playOnComplete } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import { DoneMark } from "../widgets/done-mark";

export const PRIORITY_COLOR: Record<NonNullable<Plan["priority"]>, string> = {
  HIGH: "var(--priority-high)",
  MEDIUM: "var(--priority-medium)",
  LOW: "var(--priority-low)",
};

/** 22px sarlavha + yonida sana; o'ngda kichik qiymat. */
export function MobileHeader({ title, sub, aside }: { title: string; sub?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-1 md:hidden">
      <div className="flex min-w-0 items-baseline gap-2">
        <h1 className="shrink-0 text-[22px] font-bold leading-tight tracking-[-0.025em]">{title}</h1>
        {sub && <p className="truncate text-[13px] text-muted">{sub}</p>}
      </div>
      {aside && <div className="shrink-0 text-[13px] font-medium tabular-nums text-faint">{aside}</div>}
    </div>
  );
}

/** Dumaloq belgi — qatorning o'ng tomonida. Bosish qatorni ochmaydi. */
export function Tick({ on, onClick, size = 26, label }: { on: boolean; onClick: () => void; size?: number; label?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={label ?? (on ? "Bekor qilish" : "Bajarildi")}
      className="-m-2 grid shrink-0 place-items-center p-2"
    >
      <DoneMark on={on} size={size} />
    </button>
  );
}

export function Ring({ value, size = 28, stroke = 3, children }: { value: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--subtle)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--foreground)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      {children}
    </span>
  );
}

export function PriorityDot({ p, dim }: { p?: Plan["priority"]; dim?: boolean }) {
  return <span aria-hidden className={cn("size-2 shrink-0 rounded-full", dim && "opacity-40")} style={{ background: p ? PRIORITY_COLOR[p] : "var(--border-strong)" }} />;
}

/** Ichki vazifalar soni · Reja toifasi · Odat · Maqsad. */
export function TaskBadges({ plan, reja }: { plan: Plan; reja?: { label: string; color: string } }) {
  const subs = plan.subtasks ?? [];
  const isGoal = !!(plan.goalStepId || plan.horizonStepId || plan.horizonGoalId);
  return (
    <>
      {subs.length > 0 && <span className="flex items-center gap-1"><ListChecks className="size-3.5" />{subs.filter((s) => s.done).length}/{subs.length}</span>}
      {reja && <span className="flex items-center gap-1" style={{ color: reja.color }}><Tag className="size-3.5" />{reja.label}</span>}
      {plan.habitId && <span className="flex items-center gap-1"><Repeat className="size-3.5" />Odat</span>}
      {isGoal && <span className="flex items-center gap-1"><Target className="size-3.5" />Maqsad</span>}
    </>
  );
}

export function hasBadges(plan: Plan, reja?: unknown) {
  return (plan.subtasks?.length ?? 0) > 0 || !!reja || !!plan.habitId || !!(plan.goalStepId || plan.horizonStepId || plan.horizonGoalId);
}

const DONE_DELAY_MS = 650;

/** Belgilanganda avval belgi ko'rinadi (ovoz bilan), keyin holat o'zgaradi. */
export function usePendingDone(done: boolean, onToggle: () => void) {
  const [pending, setPending] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  function toggle() {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    if (done) return onToggle();
    if (pending) return setPending(false);
    playOnComplete();
    setPending(true);
    timer.current = window.setTimeout(() => { timer.current = null; setPending(false); onToggle(); }, DONE_DELAY_MS);
  }
  return { visual: done || pending, toggle };
}

/** Ro'yxatga kirish/chiqish animatsiyasi. Prujina va `layout` yo'q: qator avval
 *  so'nadi, keyin joyi bir tekis yig'iladi — pastdagilar shu bilan birga silliq
 *  ko'tariladi (sakrash bo'lmaydi). */
const SMOOTH = [0.32, 0.72, 0, 1] as const;
export const ROW_MOTION = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto", x: 0, transition: { height: { duration: 0.32, ease: SMOOTH }, opacity: { duration: 0.24, delay: 0.08 } } },
  exit: { opacity: 0, x: 24, height: 0, transition: { opacity: { duration: 0.18 }, x: { duration: 0.22, ease: SMOOTH }, height: { duration: 0.32, ease: SMOOTH, delay: 0.12 } } },
  style: { overflow: "hidden" },
} as const;

export function Expand({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Pastdagi yopiq bo'lim (Bajarilgan / Bajarilmagan). */
export function Collapsed({ label, count, hint, className, children }: { label: string; count: number; hint?: string; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={className}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex h-[52px] w-full items-center justify-between rounded-[18px] border border-border bg-subtle/40 px-4 text-left">
        <span className="flex items-center gap-2 text-[14px] font-semibold text-muted">
          {label} <span className="tabular-nums text-faint">{count}</span>
          {hint && <span className="text-[12.5px] font-medium text-faint">· {hint}</span>}
        </span>
        <ChevronDown className={cn("size-5 text-faint transition-transform duration-200", open && "rotate-180")} />
      </button>
      <Expand open={open}><div className="pt-2">{children}</div></Expand>
    </section>
  );
}

export const groupCls = "overflow-hidden rounded-[22px] border border-border bg-surface [&>*+*]:border-t [&>*+*]:border-border";

/* ─── Bajarilganda "pastga ko'chish" ───────────────────────────────────────
   Qator alohida kartochka (MoveCard, layoutId = reja id). Belgilanganda u faol
   ro'yxatdan chiqib, pastdagi DoneList'ga suzib tushadi; qaytarilsa — joyiga
   suzib chiqadi. Atrofdagi bo'limlar (Glide) ham bir xil sur'atda suriladi.
   Hammasi bitta <LayoutGroup> ichida bo'lishi kerak. */

/** iOS'dagidek: tez boshlanib, yumshoq to'xtaydi. Prujina yo'q — sakramaydi. */
export const GLIDE: Transition = { type: "tween", duration: 0.5, ease: [0.32, 0.72, 0, 1] };

export const cardCls = "overflow-hidden rounded-[18px] border border-border bg-surface";

// DoneList ichidagi kartochkalar yopiq bo'limda ko'rinmasin (balandligi 0).
const DoneOpen = createContext<boolean | null>(null);

export function MoveCard({ id, className, children, ...rest }: { id: string; className?: string; children: React.ReactNode } & Omit<React.ComponentProps<typeof motion.div>, "children" | "layoutId">) {
  const open = useContext(DoneOpen);
  const hidden = open === false;
  return (
    <motion.div
      layoutId={id}
      transition={GLIDE}
      animate={{ opacity: hidden ? 0 : 1, scale: hidden ? 0.94 : 1 }}
      style={hidden ? { height: 0, borderWidth: 0 } : undefined}
      className={cn(cardCls, className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Bo'lim yoki blok: ro'yxat o'zgarganda joyiga silliq suriladi. */
export function Glide({ className, children }: { className?: string; children: React.ReactNode }) {
  return <motion.div layout="position" transition={GLIDE} className={className}>{children}</motion.div>;
}

/** Pastdagi "Bajarilgan" ro'yxati. Ochiq/yopiqligi eslab qolinadi (storageKey). */
export function DoneList({ label, count, storageKey, defaultOpen = true, className, children }: {
  label: string; count: number; storageKey: string; defaultOpen?: boolean; className?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    try {
      const v = localStorage.getItem(`unumly:done-open:${storageKey}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- saqlangan holat faqat mount'da o'qiladi
      if (v === "0" || v === "1") setOpen(v === "1");
    } catch { /* */ }
  }, [storageKey]);
  function toggle() {
    setOpen((o) => {
      try { localStorage.setItem(`unumly:done-open:${storageKey}`, o ? "0" : "1"); } catch { /* */ }
      return !o;
    });
  }
  return (
    <>
      {count > 0 && (
        <Glide className={className}>
          <button type="button" onClick={toggle} aria-expanded={open} className="flex h-[52px] w-full items-center justify-between rounded-[18px] border border-border bg-subtle/40 px-4 text-left">
            <span className="flex items-center gap-2 text-[14px] font-semibold text-muted">
              {label}
              <motion.span key={count} initial={{ scale: 1.5 }} animate={{ scale: 1 }} transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }} className="tabular-nums text-faint">{count}</motion.span>
            </span>
            <ChevronDown className={cn("size-5 text-faint transition-transform duration-200", open && "rotate-180")} />
          </button>
        </Glide>
      )}
      <DoneOpen.Provider value={open}>
        <div className={cn("space-y-1.5", open && count > 0 && "mt-2")}>{children}</div>
      </DoneOpen.Provider>
    </>
  );
}

/** Bajarilganlar: oxirgi belgilangan tepada. */
export function byCompletedDesc<T extends { completedAt?: string }>(a: T, b: T) {
  return (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
}
