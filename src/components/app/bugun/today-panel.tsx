"use client";

/* Bugun tepasidagi tablar: Analitika · Maqsad · Reja · Agenda. Qaysilari
   chiqishi Boshqaruv → "Bugun paneli"da sozlanadi. */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, CalendarPlus, Check, ChevronDown, ChevronRight, ChevronUp, ClipboardList, ListChecks, Target, type LucideIcon } from "lucide-react";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PANEL_TABS, useTodayPanel, type PanelTab } from "@/lib/today-panel";
import { horizonGoalsApi, useHorizonGoals, usePeriodGoals } from "@/lib/horizon-goals-store";
import { periodStartOf } from "@/lib/horizon-goals";
import { useIdeas } from "@/lib/ideas-store";
import { useCategories } from "@/lib/categories-store";
import { useHabits } from "@/lib/habits-store";
import { CATEGORY_PALETTE } from "@/lib/category-palette";
import { fromDateInputValue, formatUzDate } from "@/lib/dates";
import { TaskAnalyticsMobile } from "../widgets/task-analytics";
import { Tick } from "./mobile-ui";

const SPRING = { type: "spring", stiffness: 460, damping: 38 } as const;
const ICONS: Record<PanelTab, LucideIcon> = { analitika: BarChart3, maqsad: Target, reja: ClipboardList, agenda: ListChecks };

export function TodayPanel({ plans, today, todayIso, onToggle, onOpen }: {
  plans: Plan[];
  today: Date;
  todayIso: string;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const { visible } = useTodayPanel();
  const [open, setOpen] = useState<PanelTab | null>(null);
  const [dir, setDir] = useState(0);
  // O'chirilgan tab ochiq qolmasin.
  const current = open && visible.includes(open) ? open : null;
  if (visible.length === 0) return null;

  function pick(id: PanelTab) {
    if (current === id) return setOpen(null);
    setDir(current ? (visible.indexOf(id) > visible.indexOf(current) ? 1 : -1) : 0);
    setOpen(id);
  }

  return (
    <div className="mt-2.5 overflow-hidden rounded-[20px] border border-border bg-surface">
      <div role="tablist" aria-label="Bugun paneli" className="flex gap-1 p-1">
        {visible.map((id) => {
          const t = PANEL_TABS.find((x) => x.id === id)!;
          const Icon = ICONS[id];
          const on = current === id;
          return (
            <button key={id} type="button" role="tab" aria-selected={on} onClick={() => pick(id)} className={cn("relative flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[15px] text-[13px] font-semibold transition-colors", on ? "text-accent-ink" : "text-muted active:bg-hover")}>
              {on && <motion.span layoutId="today-panel-tab" transition={SPRING} className="absolute inset-0 rounded-[15px] bg-accent" />}
              <Icon className="relative size-4 shrink-0" />
              <span className="relative truncate">{t.label}</span>
            </button>
          );
        })}
      </div>
      <AnimatePresence initial={false}>
        {current && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="border-t border-border">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={current} initial={{ opacity: 0, x: dir * 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -24 }} transition={{ duration: 0.16 }}>
                  {current === "analitika" ? (
                    <TaskAnalyticsMobile plans={plans} today={today} />
                  ) : current === "maqsad" ? (
                    <GoalsTab todayIso={todayIso} />
                  ) : current === "reja" ? (
                    <IdeasTab todayIso={todayIso} />
                  ) : (
                    <AgendaTab plans={plans} todayIso={todayIso} onToggle={onToggle} onOpen={onOpen} />
                  )}
                </motion.div>
              </AnimatePresence>
              <button type="button" onClick={() => setOpen(null)} aria-label="Yig'ish" className="flex h-9 w-full items-center justify-center text-faint active:bg-hover">
                <ChevronUp className="size-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mt-1 flex h-10 w-full items-center justify-center gap-1 text-[13px] font-semibold text-muted">
      {children} <ChevronRight className="size-4" />
    </Link>
  );
}

function ToTodayButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-subtle px-3 text-[12.5px] font-semibold">
      <CalendarPlus className="size-3.5" />Bugunga
    </button>
  );
}

/* Shu haftaning maqsadlari: bugunga o'tkazish va belgilash. */
function GoalsTab({ todayIso }: { todayIso: string }) {
  const { goals, ready } = useHorizonGoals();
  const list = usePeriodGoals(goals, "WEEK", periodStartOf("WEEK", todayIso));
  const done = list.filter((g) => g.done).length;
  return (
    <div className="px-3.5 pb-1 pt-3">
      <div className="flex items-baseline justify-between px-0.5">
        <p className="text-[13px] font-semibold text-muted">Shu hafta</p>
        {list.length > 0 && <p className="text-[12.5px] tabular-nums text-faint">{done}/{list.length} bajarildi</p>}
      </div>
      {ready && list.length === 0 && <p className="py-5 text-center text-[13.5px] text-faint">Bu hafta uchun maqsad yo&apos;q</p>}
      <div className="mt-1.5">
        {list.map((g) => {
          const sd = g.steps.filter((s) => s.done).length;
          const moved = g.scheduledFor === todayIso;
          return (
            <div key={g.id} className="flex min-h-[54px] items-center gap-3 border-b border-border/70 last:border-b-0">
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-[15px] font-semibold", g.done && "text-faint line-through decoration-faint/60")}>{g.title}</span>
                {g.steps.length > 0 && (
                  <span className="mt-1 flex items-center gap-2">
                    <span className="block h-1 flex-1 overflow-hidden rounded-full bg-subtle"><span className="block h-full rounded-full bg-foreground" style={{ width: `${(sd / g.steps.length) * 100}%` }} /></span>
                    <span className="text-[11.5px] tabular-nums text-faint">{sd}/{g.steps.length}</span>
                  </span>
                )}
              </span>
              {!g.done && (moved
                ? <span className="flex shrink-0 items-center gap-1 text-[12px] text-faint"><Check className="size-3" strokeWidth={3} />Bugunda</span>
                : <ToTodayButton onClick={() => horizonGoalsApi.moveGoal(g, todayIso)} />)}
              <Tick on={g.done} onClick={() => horizonGoalsApi.setDone(g.id, !g.done)} size={24} />
            </div>
          );
        })}
      </div>
      <MoreLink href="/maqsad">Barcha maqsadlar</MoreLink>
    </div>
  );
}

/* Rejalashtirilmagan g'oyalar: toifa bo'yicha, bir bosishda bugunga. */
function IdeasTab({ todayIso }: { todayIso: string }) {
  const { ideas, update } = useIdeas();
  const { categories } = useCategories();
  const [cat, setCat] = useState<string | null>(null);
  const open = ideas.filter((i) => !i.done && !i.scheduledFor);
  const list = open.filter((i) => !cat || i.categoryId === cat);
  const usedCats = categories.filter((c) => open.some((i) => i.categoryId === c.id));
  return (
    <div className="pb-1 pt-3">
      {usedCats.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-3.5 [scrollbar-width:none]">
          {[{ id: null as string | null, label: "Hammasi" }, ...usedCats.map((c) => ({ id: c.id as string | null, label: c.label }))].map((c) => (
            <button key={c.id ?? "all"} type="button" onClick={() => setCat(c.id)} className={cn("h-8 shrink-0 rounded-full px-3 text-[12.5px] font-semibold", cat === c.id ? "bg-accent text-accent-ink" : "bg-subtle text-muted")}>{c.label}</button>
          ))}
        </div>
      )}
      <div className="mt-1 px-3.5">
        {list.length === 0 && <p className="py-5 text-center text-[13.5px] text-faint">Kunga o&apos;tkazilmagan reja yo&apos;q</p>}
        <AnimatePresence initial={false}>
          {list.slice(0, 6).map((i) => {
            const c = categories.find((x) => x.id === i.categoryId);
            return (
              <motion.div key={i.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="flex min-h-[52px] items-center gap-3 overflow-hidden border-b border-border/70 last:border-b-0">
                <span className="size-2 shrink-0 rounded-full" style={{ background: c ? CATEGORY_PALETTE[c.color].oklch : "var(--faint)" }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{i.title}</span>
                  {c && <span className="block text-[12px] text-faint">{c.label}</span>}
                </span>
                <ToTodayButton onClick={() => update(i.id, { scheduledFor: todayIso })} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <MoreLink href="/reja">Barcha rejalar</MoreLink>
    </div>
  );
}

/* Yaqin 3 kunning rejalari — Agenda bilan bir xil qoida. */
function AgendaTab({ plans, todayIso, onToggle, onOpen }: { plans: Plan[]; todayIso: string; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  const { habits, archived } = useHabits();
  const hidden = useMemo(() => new Set([...habits, ...archived].filter((h) => !h.showInAgenda).map((h) => h.id)), [habits, archived]);
  const upcoming = plans
    .filter((p) => p.scope === "DAILY" && p.scheduledFor > todayIso && p.status !== "DONE" && p.status !== "CANCELLED" && !(p.habitId && hidden.has(p.habitId)))
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor) || (a.time ?? "99").localeCompare(b.time ?? "99"));
  const days = [...new Set(upcoming.map((p) => p.scheduledFor))].slice(0, 3);
  const tomorrow = new Date(fromDateInputValue(todayIso).getTime() + 86400000);
  const label = (iso: string) => {
    const d = fromDateInputValue(iso);
    return d.toDateString() === tomorrow.toDateString() ? "Ertaga" : formatUzDate(d);
  };
  return (
    <div className="px-3.5 pb-1 pt-2">
      {days.length === 0 && <p className="py-5 text-center text-[13.5px] text-faint">Yaqin kunlarda reja yo&apos;q</p>}
      {days.map((d) => (
        <div key={d} className="mt-1">
          <p className="px-0.5 pb-0.5 pt-1.5 text-[12.5px] font-semibold text-muted">{label(d)}</p>
          {upcoming.filter((p) => p.scheduledFor === d).slice(0, 4).map((p) => (
            <div key={p.id} role="button" tabIndex={0} onClick={() => onOpen(p.id)} className="flex min-h-[48px] cursor-pointer items-center gap-3 border-b border-border/70 last:border-b-0">
              <span className="w-11 shrink-0 text-[13px] font-semibold tabular-nums text-muted">{p.time ?? "—"}</span>
              <span className="min-w-0 flex-1 truncate text-[15px]">{p.title}</span>
              <Tick on={false} onClick={() => onToggle(p.id)} size={24} />
            </div>
          ))}
        </div>
      ))}
      <MoreLink href="/agenda">Butun Agenda</MoreLink>
    </div>
  );
}

/* Boshqaruv → "Bugun paneli": tablarni yoqish/o'chirish va tartiblash. */
export function TodayPanelSettings() {
  const panel = useTodayPanel();
  return (
    <div>
      <p className="px-1 text-[13.5px] leading-relaxed text-muted">Bugun sahifasining tepasida qaysi tablar chiqishini tanlang. Strelkalar bilan tartibni o&apos;zgartiring.</p>
      <div className="mt-3 overflow-hidden rounded-[20px] border border-border bg-surface [&>*+*]:border-t [&>*+*]:border-border">
        {panel.cfg.order.map((id, idx) => {
          const t = PANEL_TABS.find((x) => x.id === id)!;
          const on = !panel.cfg.off.includes(id);
          return (
            <div key={id} className="flex min-h-[62px] items-center gap-2 px-2">
              <span className="flex shrink-0 flex-col">
                <button type="button" disabled={idx === 0} onClick={() => panel.move(id, -1)} aria-label="Yuqoriga" className="grid h-6 w-8 place-items-center text-muted disabled:opacity-20"><ChevronUp className="size-4" /></button>
                <button type="button" disabled={idx === panel.cfg.order.length - 1} onClick={() => panel.move(id, 1)} aria-label="Pastga" className="grid h-6 w-8 place-items-center text-muted disabled:opacity-20"><ChevronDown className="size-4" /></button>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15.5px] font-semibold">{t.label}</span>
                <span className="block truncate text-[12.5px] text-faint">{t.hint}</span>
              </span>
              <button type="button" role="switch" aria-checked={on} aria-label={t.label} onClick={() => panel.toggle(id)} className="shrink-0 px-1.5 py-2">
                <span className={cn("relative block h-7 w-12 rounded-full border transition-colors", on ? "border-accent bg-accent" : "border-border-strong bg-subtle")}>
                  <motion.span animate={{ x: on ? 21 : 1 }} transition={SPRING} className={cn("absolute top-[1px] block size-6 rounded-full shadow-sm", on ? "bg-accent-ink" : "bg-surface")} />
                </span>
              </button>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={panel.reset} className="mt-2 h-10 w-full text-[13px] font-semibold text-faint">Standart holatga qaytarish</button>
    </div>
  );
}
