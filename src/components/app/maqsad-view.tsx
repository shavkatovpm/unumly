"use client";

/**
 * "Maqsad" bo'limi — 4 ta davr: Hafta, Oy, 3 oy, Yil. Maqsad yoki uning ichidagi
 * qadam bir pog'ona pastga o'tkaziladi: Yil → 3 oy → Oy → Hafta → Bugun.
 * Qadamlar ixtiyoriy va faqat maqsad oynasi ichida qo'shiladi.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsDown, ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileAdd } from "@/lib/mobile-add";
import { ensureVisibleOnFocus } from "@/lib/ensure-visible";
import { horizonGoalsApi as api, useHorizonGoals, usePeriodGoals } from "@/lib/horizon-goals-store";
import {
  HORIZONS,
  MOVE_LABELS,
  horizonMeta,
  moveTargetPeriod,
  periodName,
  periodRange,
  periodStartOf,
  shiftPeriod,
  shortDate,
  todayIso,
} from "@/lib/horizon-goals";
import type { GoalHorizon, HorizonGoal, HorizonGoalStep } from "@/lib/types";
import { Dialog } from "./widgets/dialog";
import { MonoActions, MonoBlock, MonoExpand, MonoHeader, MonoSave, MonoSheet, useIsMobile } from "./widgets/mono-sheet";
import { ConfirmDialog } from "./widgets/confirm-dialog";
import { ListLoader } from "./widgets/list-loader";

const SPRING = { type: "spring", stiffness: 420, damping: 36 } as const;

/* Davrlar orasida barmoq bilan o'tish — Moliya tablari bilan bir xil. */
const SWIPE_THRESHOLD = 56;
const SWIPE_VARIANTS = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: "0%", opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};


const PROMPTS: Record<GoalHorizon, { question: string; placeholder: string }> = {
  WEEK: { question: "Bu hafta nimaga erishmoqchisiz?", placeholder: "Masalan: Landing sahifani tugatish" },
  MONTH: { question: "Bu oy qanday natija bo'lsin?", placeholder: "Masalan: Ilk 10 ta mijozni topish" },
  QUARTER: { question: "3 oyda nimaga erishasiz?", placeholder: "Masalan: Mahsulotni bozorga chiqarish" },
  YEAR: { question: "Bu yil qanday bo'lsin?", placeholder: "Masalan: Oyiga 50 mln daromad" },
};

const stepProgress = (g: HorizonGoal) => ({ done: g.steps.filter((s) => s.done).length, total: g.steps.length });

export function MaqsadView() {
  const { goals, ready } = useHorizonGoals();
  const [today] = useState(todayIso);
  const [horizon, setHorizon] = useState<GoalHorizon>("WEEK");
  const [dir, setDir] = useState(0); // swipe animatsiya yo'nalishi
  const [touchSwipe, setTouchSwipe] = useState(false);
  useEffect(() => {
    setTouchSwipe(window.matchMedia("(pointer: coarse)").matches);
  }, []);
  // Har bir tabning o'z tanlangan davri.
  const [periods, setPeriods] = useState<Record<GoalHorizon, string>>(() => ({
    WEEK: periodStartOf("WEEK", today),
    MONTH: periodStartOf("MONTH", today),
    QUARTER: periodStartOf("QUARTER", today),
    YEAR: periodStartOf("YEAR", today),
  }));
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<{ goal?: HorizonGoal } | null>(null);
  const [removing, setRemoving] = useState<HorizonGoal | null>(null);

  const period = periods[horizon];
  const openGoal = goals.find((g) => g.id === openId);
  const list = usePeriodGoals(goals, horizon, period);
  const active = list.filter((g) => !g.done);
  const completed = list.filter((g) => g.done);
  const doneCount = completed.length;

  useMobileAdd(() => setForm({}));

  function shift(delta: number) {
    setPeriods((p) => ({ ...p, [horizon]: shiftPeriod(horizon, period, delta) }));
  }
  function selectHorizon(next: GoalHorizon) {
    const order = HORIZONS.map((h) => h.id);
    const delta = order.indexOf(next) - order.indexOf(horizon);
    setDir(Math.sign(delta));
    setHorizon(next);
  }
  function swipe(delta: number) {
    const next = HORIZONS[HORIZONS.findIndex((h) => h.id === horizon) + delta];
    if (next) selectHorizon(next.id);
  }

  return (
    // main tepasida Telegram zonasi uchun bo'shliq bor — sahifa shuni ayirmasa,
    // pastki qismi ekrandan chiqib nav ostida qoladi.
    <div className="flex flex-col overflow-hidden" style={{ height: "calc(var(--tg-vh, 100vh) - var(--tg-safe-top, 0px))" }}>
      <header className="z-10 shrink-0 bg-background">
        <div className="hidden h-12 items-center px-4 md:flex md:px-6">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] sm:text-[13px]">Maqsad</h1>
        </div>
        <div className="px-4 pb-3 pt-3 md:hidden">
          <h1 className="text-[28px] font-bold tracking-[-0.03em]">Maqsad</h1>
          <div className="mt-3"><PeriodTiles value={horizon} onChange={selectHorizon} /></div>
        </div>
        <div className="mx-auto hidden w-full max-w-2xl px-4 pb-3 md:block md:px-6">
          <div role="tablist" aria-label="Maqsad davri" className="grid grid-cols-4 rounded-xl bg-subtle p-1">
            {HORIZONS.map((h) => {
              const on = h.id === horizon;
              return (
                <button
                  key={h.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => selectHorizon(h.id)}
                  className={cn("relative h-9 rounded-lg text-[13.5px] font-semibold transition-colors", on ? "text-black" : "text-faint")}
                >
                  {on && <motion.span layoutId="maqsad-horizon" transition={SPRING} className="absolute inset-0 rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]" />}
                  <span className="relative">{h.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Pastda suzuvchi nav uchun joy — kontent uning ostida qolmasin */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={horizon}
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
              if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -500) swipe(1);
              else if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 500) swipe(-1);
            }}
            className="absolute inset-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
          >
        <div className="mx-auto w-full max-w-2xl px-4 pb-32 md:px-6 md:pb-12">
          <div className="flex items-center gap-2 pb-3">
            <button type="button" onClick={() => shift(-1)} aria-label="Oldingi davr" className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-hover">
              <ChevronLeft className="size-5" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-[16px] font-semibold tracking-[-0.01em]">{periodName(horizon, period, today)}</p>
              <p className="truncate text-[12.5px] text-faint">{periodRange(horizon, period)}</p>
            </div>
            <button type="button" onClick={() => shift(1)} aria-label="Keyingi davr" className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-hover">
              <ChevronRight className="size-5" />
            </button>
          </div>

          {!ready && list.length === 0 ? (
            <ListLoader label="Maqsadlar yuklanmoqda…" />
          ) : active.length === 0 ? (
            <EmptyState horizon={horizon} onAdd={() => setForm({})} />
          ) : (
            <>
              <div className="mb-2 mt-2 hidden items-baseline justify-between px-1 md:flex">
                <p className="text-[13px] font-semibold">{horizonMeta(horizon).adjective} maqsadlar</p>
                <p className="text-[12.5px] tabular-nums text-faint">{doneCount}/{list.length} bajarildi</p>
              </div>
              <div className="hidden space-y-2 md:block">
                {active.map((g) => (
                  <GoalCard key={g.id} goal={g} goals={goals} today={today} onOpen={() => setOpenId(g.id)} />
                ))}
              </div>
              <div className="overflow-hidden rounded-[22px] border border-border bg-surface md:hidden">
                {active.map((g) => (
                  <GoalRow key={g.id} goal={g} goals={goals} today={today} onOpen={() => setOpenId(g.id)} />
                ))}
              </div>
              <button type="button" onClick={() => setForm({})} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3.5 text-[13.5px] font-medium text-muted transition-colors hover:bg-hover">
                <Plus className="size-4" /> Maqsad qo&apos;shish
              </button>
            </>
          )}
          <DoneGoals goals={completed} all={goals} today={today} onOpen={setOpenId} />
        </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {form && (
        <GoalForm
          key={form.goal?.id ?? "new"}
          horizon={horizon}
          goal={form.goal}
          periodStart={period}
          today={today}
          onCreatedIn={selectHorizon}
          onClose={() => setForm(null)}
        />
      )}
      {openGoal && (
        <GoalDetail
          goal={openGoal}
          goals={goals}
          today={today}
          onClose={() => setOpenId(null)}
          onEdit={() => { setOpenId(null); setForm({ goal: openGoal }); }}
          onRemove={() => { setOpenId(null); setRemoving(openGoal); }}
        />
      )}
      <ConfirmDialog
        open={!!removing}
        title="Maqsadni o'chirasizmi?"
        description="Qadamlari ham o'chadi. Bugunga qo'shilgan tasklar o'z joyida qoladi."
        confirmLabel="O'chirish"
        destructive
        onConfirm={() => { if (removing) api.remove(removing.id); setRemoving(null); }}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}

/* Mobil davr tanlovi: faqat nomlar, tanlangani to'liq rangda. */
function PeriodTiles({ value, onChange }: { value: GoalHorizon; onChange: (h: GoalHorizon) => void }) {
  return (
    <div role="radiogroup" aria-label="Davr" className="grid grid-cols-4 gap-2">
      {HORIZONS.map((h) => {
        const on = h.id === value;
        return (
          <button
            key={h.id}
            type="button"
            role="radio"
            aria-checked={on}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange(h.id)}
            className={cn("h-12 rounded-[18px] border text-[15px] font-semibold transition-colors", on ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface text-muted")}
          >
            {h.label}
          </button>
        );
      })}
    </div>
  );
}

/* Qadamlar soni bo'yicha bo'lakli ko'rsatkich. */
function StepsBar({ steps }: { steps: HorizonGoalStep[] }) {
  return (
    <span className="flex gap-1">
      {steps.map((s) => <span key={s.id} className={cn("h-1 flex-1 rounded-full transition-colors", s.done ? "bg-foreground" : "bg-subtle")} />)}
    </span>
  );
}

/* Pastga o'tkazish: maqsad/qadam shu davrga o'tkazilganmi — tugma o'rniga holat. */
function MoveButton({ horizon, moved, onMove }: { horizon: GoalHorizon; moved: string | null; onMove: () => void }) {
  const labels = MOVE_LABELS[horizon];
  if (moved) return <span className="flex shrink-0 items-center gap-1 text-[12px] text-faint"><Check className="size-3" strokeWidth={3} />{moved}</span>;
  return (
    <button type="button" onClick={onMove} className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-hover hover:text-foreground">
      {labels.action}
    </button>
  );
}

function movedLabel(horizon: GoalHorizon, scheduledFor: string | undefined, today: string, hasChild: boolean): string | null {
  if (horizon !== "WEEK") return hasChild ? MOVE_LABELS[horizon].moved : null;
  if (!scheduledFor) return null;
  return scheduledFor === today ? MOVE_LABELS.WEEK.moved : shortDate(scheduledFor);
}

function goalMoved(goal: HorizonGoal, goals: HorizonGoal[], today: string) {
  const target = moveTargetPeriod(goal.horizon, goal.periodStart, today);
  const hasChild = goals.some((c) => c.parentId === goal.id && c.periodStart === target);
  return movedLabel(goal.horizon, goal.scheduledFor, today, hasChild);
}

function stepMoved(step: HorizonGoalStep, goal: HorizonGoal, goals: HorizonGoal[], today: string) {
  const target = moveTargetPeriod(goal.horizon, goal.periodStart, today);
  const hasChild = goals.some((c) => c.sourceStepId === step.id && c.periodStart === target);
  return movedLabel(goal.horizon, step.scheduledFor, today, hasChild);
}

function EmptyState({ horizon, onAdd }: { horizon: GoalHorizon; onAdd: () => void }) {
  const p = PROMPTS[horizon];
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-[18px] font-semibold tracking-[-0.01em]">{p.question}</p>
      <button type="button" onClick={onAdd} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-accent-ink transition-transform active:scale-[0.97]">
        <Plus className="size-4" strokeWidth={2.6} /> Maqsad yozish
      </button>
    </div>
  );
}

function GoalCard({ goal, goals, today, onOpen }: { goal: HorizonGoal; goals: HorizonGoal[]; today: string; onOpen: () => void }) {
  const { done, total } = stepProgress(goal);
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center gap-3 p-3.5">
        <GoalCheck goal={goal} />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className={cn("block text-[15.5px] font-medium leading-snug", goal.done && "text-faint line-through decoration-faint/60")}>{goal.title}</span>
          {total > 0 && <span className="mt-0.5 block text-[12px] text-faint">{done}/{total} qadam</span>}
        </button>
        {!goal.done && <MoveButton horizon={goal.horizon} moved={goalMoved(goal, goals, today)} onMove={() => api.moveGoal(goal, today)} />}
      </div>
      {total > 0 && <ProgressBar done={done} total={total} className="mx-3.5 mb-3.5" />}
    </article>
  );
}

/* Mobil: butun qator faqat maqsad ichiga kiradi, amallar oynada. */
function GoalRow({ goal, goals, today, onOpen }: { goal: HorizonGoal; goals: HorizonGoal[]; today: string; onOpen: () => void }) {
  const { done, total } = stepProgress(goal);
  const moved = goalMoved(goal, goals, today);
  return (
    <button type="button" onClick={onOpen} className="flex min-h-[68px] w-full items-center gap-3 border-t border-border px-3.5 py-3 text-left first:border-t-0">
      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2", goal.done ? "border-accent bg-accent text-accent-ink" : "border-border-strong")}>
        {goal.done && <Check className="size-3.5" strokeWidth={3.5} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[15.5px] font-semibold leading-snug", goal.done && "text-faint line-through decoration-faint/60")}>{goal.title}</span>
        {total > 0 && <span className="mt-1.5 block"><StepsBar steps={goal.steps} /></span>}
        {total > 0 && <span className="mt-1 block text-[12px] text-faint">{done}/{total} qadam</span>}
        {!goal.done && moved && <span className="mt-1 flex items-center gap-1 text-[12px] text-faint"><Check className="size-3" strokeWidth={3} />{moved}</span>}
      </span>
      <ChevronRight className="size-4 shrink-0 text-faint" />
    </button>
  );
}

/* Bugun'dagi "Bajarilmagan" bo'limi kabi: bajarilgan maqsadlar yopiq holda pastda. */
function DoneGoals({ goals, all, today, onOpen }: { goals: HorizonGoal[]; all: HorizonGoal[]; today: string; onOpen: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  if (goals.length === 0) return null;
  return (
    <section className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-[18px] border border-border bg-subtle/30 px-4 py-3 text-left transition-colors hover:bg-subtle/60 md:rounded-lg md:px-3 md:py-2"
      >
        <span className="flex items-center gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-faint md:text-[10.5px] md:font-medium">Bajarilgan</span>
          <span className="font-mono text-[12px] tabular-nums text-faint md:text-[10.5px]">{goals.length}</span>
        </span>
        <ChevronDown className={cn("size-4 text-faint transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 hidden space-y-2 md:block">
              {goals.map((g) => <GoalCard key={g.id} goal={g} goals={all} today={today} onOpen={() => onOpen(g.id)} />)}
            </div>
            <div className="mt-2 overflow-hidden rounded-[22px] border border-border bg-surface md:hidden">
              {goals.map((g) => <GoalRow key={g.id} goal={g} goals={all} today={today} onOpen={() => onOpen(g.id)} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function GoalCheck({ goal }: { goal: HorizonGoal }) {
  return (
    <button
      type="button"
      onClick={() => api.setDone(goal.id, !goal.done)}
      aria-label={goal.done ? "Bajarilmagan deb belgilash" : "Bajarildi"}
      className={cn("mt-px grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors", goal.done ? "border-accent bg-accent text-accent-ink" : "border-border-strong")}
    >
      {goal.done && <Check className="size-3.5" strokeWidth={3.5} />}
    </button>
  );
}

function ProgressBar({ done, total, className }: { done: number; total: number; className?: string }) {
  return (
    <div className={cn("h-1 overflow-hidden rounded-full bg-subtle", className)}>
      <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${Math.round((done / total) * 100)}%` }} transition={{ duration: 0.3 }} />
    </div>
  );
}

/* Maqsad ichi — qadamlar faqat shu yerda boshqariladi. */
type GoalDetailProps = {
  goal: HorizonGoal;
  goals: HorizonGoal[];
  today: string;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
};

function GoalDetail(props: GoalDetailProps) {
  const mobile = useIsMobile();
  return mobile ? <GoalDetailMobile {...props} /> : <GoalDetailDesktop {...props} />;
}

/* Mobil: Bajarildi · Tahrirlash · O'chirish, tahrirlash shu oynada ochiladi. */
function GoalDetailMobile({ goal, goals, today, onClose, onRemove }: GoalDetailProps) {
  const { done, total } = stepProgress(goal);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(goal.title);

  function toggleEdit() {
    setTitle(goal.title);
    setEditing((v) => !v);
  }
  function saveTitle() {
    const t = title.trim();
    if (t && t !== goal.title) api.rename(goal.id, t);
    setEditing(false);
  }

  return (
    <MonoSheet open onClose={onClose} label={goal.title} dismissable={!editing}>
      <div className="rounded-[24px] border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-muted">{horizonMeta(goal.horizon).adjective} · {periodRange(goal.horizon, goal.periodStart)}</p>
            <p className={cn("mt-0.5 text-[21px] font-bold leading-tight tracking-[-0.02em]", goal.done && "text-faint line-through decoration-faint/60")}>{goal.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Yopish" className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle text-foreground">
            <X className="size-4" strokeWidth={2.4} />
          </button>
        </div>
        {total > 0 && <span className="mt-3 block"><StepsBar steps={goal.steps} /></span>}
        {!goal.done && (
          <div className="mt-3">
            {goalMoved(goal, goals, today) ? (
              <MoveButton horizon={goal.horizon} moved={goalMoved(goal, goals, today)} onMove={() => {}} />
            ) : (
              <button type="button" onClick={() => api.moveGoal(goal, today)} className="flex h-9 items-center gap-1.5 rounded-full bg-subtle px-3.5 text-[13px] font-semibold">
                <ChevronsDown className="size-4" />
                <span>{`${MOVE_LABELS[goal.horizon].action} o'tkazish`}</span>
              </button>
            )}
          </div>
        )}
      </div>
      <MonoActions done={goal.done} onToggleDone={() => api.setDone(goal.id, !goal.done)} editing={editing} onToggleEdit={toggleEdit} onDelete={onRemove} />
      <MonoExpand open={editing}>
        <div className="rounded-[22px] border border-border bg-surface p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); }} enterKeyHint="done" placeholder="Maqsad nomi" className="w-full bg-transparent text-[17px] font-semibold outline-none placeholder:text-faint" />
        </div>
        <MonoSave disabled={!title.trim()} onClick={saveTitle}>Saqlash</MonoSave>
      </MonoExpand>
      <MonoBlock icon={ListChecks} label="Nima qilish kerak?" aside={total > 0 ? <span className="tabular-nums opacity-60">{done}/{total}</span> : undefined}>
        {goal.steps.map((s) => <StepRowMobile key={s.id} step={s} goal={goal} goals={goals} today={today} />)}
        <AddStep goalId={goal.id} />
      </MonoBlock>
    </MonoSheet>
  );
}

function GoalDetailDesktop({ goal, goals, today, onClose, onEdit, onRemove }: GoalDetailProps) {
  const { done, total } = stepProgress(goal);
  return (
    <Dialog open onClose={onClose} mobilePlacement="top" className="w-full max-w-md">
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 p-4 pb-3">
          <div className="flex items-start gap-3">
            <GoalCheck goal={goal} />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-muted">{horizonMeta(goal.horizon).adjective} maqsad</p>
              <p className={cn("text-[17px] font-semibold leading-snug tracking-[-0.01em]", goal.done && "text-faint line-through decoration-faint/60")}>{goal.title}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Yopish" className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle text-foreground">
              <X className="size-4" strokeWidth={2.4} />
            </button>
          </div>
          {total > 0 && <ProgressBar done={done} total={total} className="mt-3" />}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 [-webkit-overflow-scrolling:touch]">
          <div className="mb-1 flex items-baseline justify-between">
            <p className="text-[13px] font-semibold">Nima qilish kerak?</p>
            {total > 0 && <p className="text-[12px] tabular-nums text-faint">{done}/{total}</p>}
          </div>
          {goal.steps.map((s) => <StepRow key={s.id} step={s} goal={goal} goals={goals} today={today} />)}
          <AddStep goalId={goal.id} />
        </div>

        <footer className="flex shrink-0 justify-end gap-1 border-t border-border px-3 py-2">
          <button type="button" onClick={onEdit} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-hover">
            <Pencil className="size-3.5" /> Tahrirlash
          </button>
          <button type="button" onClick={onRemove} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-danger transition-colors hover:bg-danger-soft">
            <Trash2 className="size-3.5" /> O&apos;chirish
          </button>
        </footer>
      </div>
    </Dialog>
  );
}

/* Mobil qadam: o'chirish chapda, belgilash o'ngda. */
function StepRowMobile({ step, goal, goals, today }: { step: HorizonGoalStep; goal: HorizonGoal; goals: HorizonGoal[]; today: string }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(step.title);
  const moved = stepMoved(step, goal, goals, today);

  function commit() {
    setEditing(false);
    const next = title.trim();
    if (next && next !== step.title) api.renameStep(step.id, next);
    else setTitle(step.title);
  }

  return (
    <div className="flex min-h-11 items-center gap-1.5">
      <button type="button" onClick={() => api.removeStep(step.id)} aria-label="Qadamni o'chirish" className="-ml-1.5 grid size-8 shrink-0 place-items-center rounded-full text-faint">
        <X className="size-4" />
      </button>
      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={ensureVisibleOnFocus}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          enterKeyHint="done"
          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
        />
      ) : (
        <button type="button" onClick={() => setEditing(true)} className={cn("min-w-0 flex-1 truncate text-left text-[15px]", step.done && "text-faint line-through decoration-faint/60")}>
          {step.title}
        </button>
      )}
      {!step.done && !editing && (moved
        ? <span className="flex shrink-0 items-center gap-1 text-[12px] text-faint"><Check className="size-3" strokeWidth={3} />{moved}</span>
        : <button type="button" onClick={() => api.moveStep(step, goal, today)} aria-label={MOVE_LABELS[goal.horizon].action} className="grid size-8 shrink-0 place-items-center rounded-full text-muted"><ChevronsDown className="size-4" /></button>)}
      <button
        type="button"
        onClick={() => api.setStepDone(step.id, !step.done)}
        aria-label={step.done ? "Bajarilmagan deb belgilash" : "Bajarildi"}
        className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors", step.done ? "border-accent bg-accent text-accent-ink" : "border-border-strong")}
      >
        {step.done && <Check className="size-3.5" strokeWidth={3.5} />}
      </button>
    </div>
  );
}

function StepRow({ step, goal, goals, today }: { step: HorizonGoalStep; goal: HorizonGoal; goals: HorizonGoal[]; today: string }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(step.title);

  function commit() {
    setEditing(false);
    const next = title.trim();
    if (next && next !== step.title) api.renameStep(step.id, next);
    else setTitle(step.title);
  }

  return (
    <div className="flex min-h-10 items-center gap-2.5">
      <button
        type="button"
        onClick={() => api.setStepDone(step.id, !step.done)}
        aria-label={step.done ? "Bajarilmagan deb belgilash" : "Bajarildi"}
        className={cn("grid size-5 shrink-0 place-items-center rounded-md border transition-colors", step.done ? "border-accent bg-accent text-accent-ink" : "border-border-strong")}
      >
        {step.done && <Check className="size-3" strokeWidth={4} />}
      </button>
      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={ensureVisibleOnFocus}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          enterKeyHint="done"
          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none sm:text-[14px]"
        />
      ) : (
        <button type="button" onClick={() => setEditing(true)} className={cn("min-w-0 flex-1 truncate text-left text-[14px]", step.done && "text-faint line-through decoration-faint/60")}>
          {step.title}
        </button>
      )}
      {!step.done && !editing && (
        <MoveButton horizon={goal.horizon} moved={stepMoved(step, goal, goals, today)} onMove={() => api.moveStep(step, goal, today)} />
      )}
      {!editing && (
        <button type="button" onClick={() => api.removeStep(step.id)} aria-label="Qadamni o'chirish" className="grid size-7 shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-hover hover:text-foreground">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/* Enter'dan keyin fokus qoladi — qadamlarni ketma-ket yozish uchun. */
function AddStep({ goalId }: { goalId: string }) {
  const [title, setTitle] = useState("");
  function add() {
    if (!title.trim()) return;
    api.addStep(goalId, title);
    setTitle("");
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex min-h-10 items-center gap-2.5">
      <Plus className="size-5 shrink-0 text-faint" strokeWidth={1.8} />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={ensureVisibleOnFocus}
        enterKeyHint="send"
        placeholder="Qadam qo'shish"
        className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint sm:text-[14px]"
      />
      {title.trim() && (
        <button type="submit" className="shrink-0 rounded-full bg-accent px-3 py-1 text-[12px] font-semibold text-accent-ink">Qo&apos;shish</button>
      )}
    </form>
  );
}

type GoalFormProps = {
  horizon: GoalHorizon;
  periodStart: string;
  today: string;
  goal?: HorizonGoal;
  onCreatedIn: (h: GoalHorizon) => void;
  onClose: () => void;
};

function GoalForm(props: GoalFormProps) {
  const mobile = useIsMobile();
  return mobile ? <GoalFormMobile {...props} /> : <GoalFormDesktop {...props} />;
}

/* Mobil: davr katakchalarda, tanlangan davr nomi ostida. */
function GoalFormMobile({ horizon, periodStart, today, goal, onCreatedIn, onClose }: GoalFormProps) {
  const [title, setTitle] = useState(goal?.title ?? "");
  const [picked, setPicked] = useState(horizon);

  function save() {
    const t = title.trim();
    if (!t) return;
    if (goal) {
      api.rename(goal.id, t);
    } else {
      // Ochiq tabda tanlangan davr, boshqa darajada — joriy davr.
      api.create({ horizon: picked, periodStart: picked === horizon ? periodStart : periodStartOf(picked, today), title: t });
      onCreatedIn(picked);
    }
    onClose();
  }

  return (
    <MonoSheet open onClose={onClose} label={goal ? "Maqsadni tahrirlash" : "Yangi maqsad"}>
      <MonoHeader label={goal ? "Tahrirlash" : "Yangi maqsad"} value={title} onChange={setTitle} placeholder={PROMPTS[picked].question} onEnter={save} onClose={onClose} />
      {!goal && (
        <>
          <PeriodTiles value={picked} onChange={setPicked} />
          <p className="px-2 text-center text-[13px] text-muted">
            {periodName(picked, picked === horizon ? periodStart : periodStartOf(picked, today), today)} · {periodRange(picked, picked === horizon ? periodStart : periodStartOf(picked, today))}
          </p>
        </>
      )}
      <MonoSave disabled={!title.trim()} onClick={save}>{goal ? "Saqlash" : undefined}</MonoSave>
    </MonoSheet>
  );
}

function GoalFormDesktop({ horizon, periodStart, goal, onClose }: GoalFormProps) {
  const [title, setTitle] = useState(goal?.title ?? "");
  const prompt = PROMPTS[horizon];

  function save() {
    const t = title.trim();
    if (!t) return;
    if (goal) api.rename(goal.id, t);
    else api.create({ horizon, periodStart, title: t });
    onClose();
  }

  return (
    <Dialog open onClose={onClose} mobilePlacement="top" className="w-full max-w-md">
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-muted">{horizonMeta(horizon).adjective} maqsad</p>
            <p className="text-[17px] font-semibold tracking-[-0.01em]">{goal ? "Tahrirlash" : prompt.question}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Yopish" className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle text-foreground">
            <X className="size-4" strokeWidth={2.4} />
          </button>
        </div>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={prompt.placeholder}
          enterKeyHint="done"
          className="w-full rounded-xl border border-border bg-subtle/40 px-3.5 py-3 text-[16px] outline-none placeholder:text-faint focus:border-foreground/30"
        />
        <button type="submit" disabled={!title.trim()} className="w-full rounded-xl bg-accent py-3 text-[15px] font-semibold text-accent-ink transition-opacity disabled:opacity-40">
          {goal ? "Saqlash" : "Qo'shish"}
        </button>
      </form>
    </Dialog>
  );
}
