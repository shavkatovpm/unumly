"use client";

/* Bugun va Agenda mobil ko'rinishi uchun umumiy bo'laklar: ixcham sarlavha,
   dumaloq belgi, halqa, yig'iladigan bo'lim, task belgilari. */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ListChecks, Repeat, Tag, Target } from "lucide-react";
import type { Plan } from "@/lib/types";
import { playOnComplete } from "@/lib/sounds";
import { cn } from "@/lib/utils";

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
      <span
        className={cn("grid place-items-center rounded-full border-2 transition-colors", on ? "border-accent bg-accent text-accent-ink" : "border-border-strong")}
        style={{ width: size, height: size }}
      >
        {on && <Check className="size-3.5" strokeWidth={3.5} />}
      </span>
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

/** Ro'yxatga kirish/chiqish animatsiyasi. */
export const ROW_MOTION = {
  layout: true,
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0, transition: { duration: 0.22 } },
  transition: { type: "spring", stiffness: 460, damping: 38, opacity: { duration: 0.18 } },
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
