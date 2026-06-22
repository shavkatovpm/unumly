"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar as CalendarIcon, Check, Clock, Pencil, Plus, Repeat, Tag, X } from "lucide-react";
import { useHydrated, usePlans } from "@/lib/plans-store";
import { useRejaCategoryMap } from "@/lib/use-reja-category";
import { useDragReorder } from "@/lib/use-drag-reorder";
import { useBlurInputOnScrollOut } from "@/lib/use-blur-on-scroll-out";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  formatUzDate,
  fromDateInputValue,
  occupiedTimeSlots,
  parseTimeToMinutes,
  startOfDay,
  toDateInputValue,
} from "@/lib/dates";
import { MiniMonth } from "./kalendar/mini-month";
import { TimePickerPopover } from "./widgets/time-picker-popover";
import { TaskDetail } from "./widgets/task-detail";
import { useConfirmRemove } from "./widgets/confirm-dialog";
import { ListLoader } from "./widgets/list-loader";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { playOnComplete } from "@/lib/sounds";

const UZ_WEEKDAYS = [
  "yakshanba", "dushanba", "seshanba", "chorshanba",
  "payshanba", "juma", "shanba",
];

const PRIORITY_DOT: Record<NonNullable<Plan["priority"]>, string> = {
  HIGH:   "bg-priority-high",
  MEDIUM: "bg-priority-medium",
  LOW:    "bg-priority-low",
};

const DONE_DELAY_MS = 700;

function AgendaRow({
  plan,
  onToggle,
  onRemove,
  onOpen,
  isNew = false,
  rejaCategory,
}: {
  plan: Plan;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onOpen: (id: string) => void;
  isNew?: boolean;
  rejaCategory?: { label: string; color: string };
}) {
  const done = plan.status === "DONE";
  const [pendingDone, setPendingDone] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

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
      onToggle(plan.id);
      return;
    }
    if (pendingDone) {
      setPendingDone(false);
      return;
    }
    playOnComplete();
    setPendingDone(true);
    timerRef.current = window.setTimeout(() => {
      onToggle(plan.id);
      timerRef.current = null;
    }, DONE_DELAY_MS);
  }

  const visualDone = done || pendingDone;
  const priorityDot = plan.priority ? PRIORITY_DOT[plan.priority] : "bg-faint/40";

  return (
    <motion.li
      layout
      transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
      onClick={() => onOpen(plan.id)}
      className={cn(
        "group flex cursor-pointer items-center gap-3 overflow-hidden border-b border-border/70 px-3 last:border-b-0 hover:bg-hover/60",
        visualDone && "bg-subtle/30",
        isNew && "task-pop",
        !pendingDone && "max-h-[78px] py-3 sm:max-h-[64px] sm:py-2"
      )}
      style={pendingDone ? {
        maxHeight: 0,
        opacity: 0,
        paddingTop: 0,
        paddingBottom: 0,
        transition:
          "max-height 400ms 200ms cubic-bezier(0.16,1,0.3,1), opacity 350ms 200ms ease-out, padding 400ms 200ms cubic-bezier(0.16,1,0.3,1)",
      } : {
        transition:
          "max-height 400ms 200ms cubic-bezier(0.16,1,0.3,1), opacity 350ms 200ms ease-out, padding 400ms 200ms cubic-bezier(0.16,1,0.3,1), background-color 200ms ease-out",
      }}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          priorityDot,
          visualDone && "opacity-40"
        )}
      />

      {plan.time ? (
        <span
          className={cn(
            "flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums",
            visualDone ? "text-faint" : "bg-subtle text-foreground"
          )}
        >
          <Clock className="size-2.5" />
          {plan.time}
        </span>
      ) : (
        <span className="w-[58px] shrink-0 text-center font-mono text-[10.5px] text-faint">
          vaqtsiz
        </span>
      )}

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[17px] sm:text-[13.5px]",
          visualDone && "text-faint line-through"
        )}
      >
        {plan.title}
      </span>

      {rejaCategory && (
        <span
          className="inline-flex shrink-0 items-center gap-1 opacity-50"
          title={`Reja: ${rejaCategory.label}`}
          aria-label={`Reja: ${rejaCategory.label}`}
        >
          <span
            className="hidden max-w-[80px] truncate text-[11px] font-medium sm:inline"
            style={{ color: rejaCategory.color }}
          >
            {rejaCategory.label}
          </span>
          <Tag className="size-3.5" style={{ color: rejaCategory.color }} />
        </span>
      )}
      {plan.habitId && <Repeat className="size-3.5 shrink-0 text-faint" aria-label="Odat" />}

      <button
        type="button"
        onClick={handleToggle}
        aria-label="Holatni o'zgartirish"
        className="group/check -my-2 -mr-3 flex shrink-0 cursor-pointer items-center py-2 pl-3 pr-3 transition-colors hover:bg-hover/40"
      >
        <span
          className={cn(
            "grid size-[21px] place-items-center rounded-md border transition-all duration-200",
            visualDone
              ? "border-accent bg-accent check-fill"
              : "border-border-strong group-hover/check:border-accent"
          )}
        >
          {visualDone && (
            <Check className="size-[14px] text-background check-pop" strokeWidth={5} />
          )}
        </span>
      </button>
    </motion.li>
  );
}

function labelFor(date: Date, today: Date): string {
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 1) return "Ertaga";
  if (diff > 1 && diff < 7) return UZ_WEEKDAYS[date.getDay()];
  return formatUzDate(date);
}

function shortDateLabel(date: Date, today: Date): string {
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 1) return "Ertaga";
  if (diff > 1 && diff < 7) return UZ_WEEKDAYS[date.getDay()];
  const day = date.getDate();
  const month = date.toLocaleDateString("uz-UZ", { month: "short" });
  return `${day} ${month}`;
}

export function AgendaView() {
  const { plans, create, update, toggleStatus, remove } = usePlans();
  const rejaCatMap = useRejaCategoryMap();
  const hydrated = useHydrated();
  const { askRemove, confirmEl } = useConfirmRemove(plans, remove, {
    description:
      '"{title}" o\'chiriladi va 30 kun davomida "O\'chirilgan" bo\'limida saqlanadi.',
  });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [draftPlan, setDraftPlan] = useState<Plan | null>(null);
  const detailPlan = detailId ? plans.find((p) => p.id === detailId) ?? null : null;

  const today = useMemo(() => startOfDay(), []);
  const todayIso = useMemo(() => toDateInputValue(today), [today]);

  // Form state
  const tomorrow = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }, [today]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>(tomorrow);
  const [time, setTime] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [mobileSheet, setMobileSheet] = useState(false);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const animationTimerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const timeBtnRef = useRef<HTMLButtonElement>(null);
  const mobileTimeBtnRef = useRef<HTMLButtonElement>(null);
  const calendarWrapRef = useRef<HTMLDivElement>(null);
  const mobileCalendarWrapRef = useRef<HTMLDivElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);
  useBlurInputOnScrollOut(mobileSheetRef, mobileSheet);

  useScrollLock(mobileSheet);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) window.clearTimeout(animationTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showCalendar) return;
    function onClick(e: MouseEvent) {
      if (calendarWrapRef.current?.contains(e.target as Node)) return;
      if (mobileCalendarWrapRef.current?.contains(e.target as Node)) return;
      setShowCalendar(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showCalendar]);

  useEffect(() => {
    if (mobileSheet) {
      // Focus immediately so iOS keyboard opens within the user gesture window
      mobileInputRef.current?.focus({ preventScroll: false });
    }
  }, [mobileSheet]);

  function openDetailForCurrent() {
    const t = title.trim();
    if (!t) return;
    const draft: Plan = {
      id: "__draft__",
      title: t,
      scope: "DAILY",
      scheduledFor: toDateInputValue(date),
      time: time || undefined,
      status: "TODO",
      createdAt: new Date().toISOString(),
      order: 0,
    };
    setDraftPlan(draft);
    setTitle("");
    setTime("");
    setShowCalendar(false);
    setShowTime(false);
    setMobileSheet(false);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const newId = create({
      title: t,
      scope: "DAILY",
      scheduledFor: toDateInputValue(date),
      time: time || undefined,
    });
    setJustCreatedId(newId);
    if (animationTimerRef.current) window.clearTimeout(animationTimerRef.current);
    animationTimerRef.current = window.setTimeout(() => setJustCreatedId(null), 500);
    setTitle("");
    setTime("");
    setShowTime(false);
    setShowCalendar(false);
    inputRef.current?.focus();
  }

  const upcoming = useMemo(() => {
    return plans
      .filter(
        (p) =>
          p.scope === "DAILY" &&
          p.scheduledFor > todayIso &&
          p.status !== "DONE"
      )
      .sort((a, b) => {
        if (a.scheduledFor !== b.scheduledFor) {
          return a.scheduledFor.localeCompare(b.scheduledFor);
        }
        if (a.status !== b.status) return a.status === "DONE" ? 1 : -1;
        const at = a.time ? parseTimeToMinutes(a.time) : Number.POSITIVE_INFINITY;
        const bt = b.time ? parseTimeToMinutes(b.time) : Number.POSITIVE_INFINITY;
        if (at !== bt) return at - bt;
        // Untimed (and same-time ties): higher `order` first — supports
        // drag-and-drop reordering within each day's untimed set.
        if (a.order !== b.order) return b.order - a.order;
        return a.createdAt.localeCompare(b.createdAt);
      });
  }, [plans, todayIso]);

  const groups = useMemo(() => {
    const map = new Map<string, Plan[]>();
    for (const p of upcoming) {
      const arr = map.get(p.scheduledFor) ?? [];
      arr.push(p);
      map.set(p.scheduledFor, arr);
    }
    return Array.from(map.entries()).map(([iso, items]) => ({
      iso,
      date: fromDateInputValue(iso),
      items,
    }));
  }, [upcoming]);

  // Drag-and-drop reorder for untimed tasks within each day group.
  // Uses a single hook scoped to the whole component; the move callback
  // figures out the day from the dragged task and reorders that day's set.
  const dragUntimed = useDragReorder(upcoming, (draggedId, beforeId) => {
    const dragged = plans.find((p) => p.id === draggedId);
    const target = beforeId ? plans.find((p) => p.id === beforeId) : null;
    if (!dragged || dragged.time) return;
    if (target && target.scheduledFor !== dragged.scheduledFor) return;

    const dayIso = dragged.scheduledFor;
    const dayUntimed = upcoming.filter(
      (p) => p.scheduledFor === dayIso && !p.time
    );
    const fromIdx = dayUntimed.findIndex((p) => p.id === draggedId);
    const toIdx = beforeId
      ? dayUntimed.findIndex((p) => p.id === beforeId)
      : dayUntimed.length;
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    const list = [...dayUntimed];
    const [moved] = list.splice(fromIdx, 1);
    list.splice(fromIdx < toIdx ? toIdx - 1 : toIdx, 0, moved);
    const max = list.length;
    list.forEach((p, idx) => {
      const next = max - idx;
      if (p.order !== next) update(p.id, { order: next });
    });
  });

  const total = upcoming.length;
  const done = upcoming.filter((p) => p.status === "DONE").length;
  const isPastSelected = toDateInputValue(date) <= todayIso;

  return (
    <div
      data-scroll-lock-on-focus
      className="flex flex-col overflow-y-auto"
      style={{ height: "var(--tg-vh, 100vh)" }}
    >
      {/* Header */}
      <header className="flex h-12 items-center justify-between gap-2 border-b border-border px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] sm:text-[13px]">Agenda</h1>
          <span className="truncate text-[13px] text-faint sm:text-[12px]">Yaqin kunlar</span>
        </div>
        {total > 0 && (
          <p className="shrink-0 font-mono text-[11px] tabular-nums text-faint">
            {done}/{total}
          </p>
        )}
      </header>

      {/* Content */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:py-8 md:pb-8">
        {/* Add task form — desktop only (mobile uses FAB) */}
        <form
          onSubmit={submit}
          className="rise-in hidden overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)] transition-colors focus-within:border-border-strong md:block"
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <Plus className="size-3.5 text-faint" />
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Yangi reja qo'shish..."
              className="flex-1 bg-transparent text-[13.5px] placeholder:text-faint focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setShowCalendar((v) => !v);
                setShowTime(false);
              }}
              className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors",
                showCalendar
                  ? "bg-accent-soft text-accent"
                  : isPastSelected
                  ? "bg-warm/10 text-warm hover:bg-warm/20"
                  : "text-muted hover:bg-hover hover:text-foreground"
              )}
            >
              <CalendarIcon className="size-3" />
              {shortDateLabel(date, today)}
            </button>
            <button
              type="button"
              onClick={openDetailForCurrent}
              disabled={!title.trim()}
              title="Batafsil sozlash (priority, izoh, davom...)"
              className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors",
                !title.trim()
                  ? "cursor-not-allowed text-faint/40"
                  : "text-faint hover:bg-hover hover:text-foreground"
              )}
            >
              <Pencil className="size-3" />
              batafsil
            </button>
            <button
              ref={timeBtnRef}
              type="button"
              onClick={() => {
                setShowTime((v) => !v);
                setShowCalendar(false);
              }}
              className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] transition-colors",
                showTime
                  ? "bg-accent-soft text-accent"
                  : "text-faint hover:bg-hover hover:text-foreground"
              )}
            >
              <Clock className="size-3" />
              {time || "vaqt"}
            </button>
            <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-faint sm:inline">
              ↵
            </kbd>
          </div>

          {showCalendar && (
            <div
              ref={calendarWrapRef}
              className="overflow-hidden border-t border-border bg-subtle/40 p-3"
            >
              <div className="reveal-down">
                <MiniMonth
                  today={today}
                  selected={date}
                  plans={plans}
                  onSelect={(d) => {
                    setDate(d);
                    setShowCalendar(false);
                  }}
                />
                <p className="mt-2 text-center text-[11px] text-faint">
                  Bugundan keyingi kunni tanlang. Bugun uchun{" "}
                  <span className="text-muted">Bugun</span> bo&apos;limidan foydalaning.
                </p>
              </div>
            </div>
          )}
        </form>

        <TimePickerPopover
          open={showTime}
          triggerRef={mobileSheet ? mobileTimeBtnRef : timeBtnRef}
          value={time}
          onChange={(v) => setTime(v)}
          onClear={() => setTime("")}
          onClose={() => setShowTime(false)}
          disableBefore={
            toDateInputValue(date) === todayIso
              ? (() => {
                  const n = new Date();
                  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
                })()
              : undefined
          }
          occupiedSlots={occupiedTimeSlots(plans, toDateInputValue(date))}
        />

        {/* List */}
        <div className="rise-in mt-6" style={{ animationDelay: "60ms" }}>
          {groups.length === 0 && !hydrated ? (
            <ListLoader />
          ) : groups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center sm:py-14">
              <p className="text-[15px] font-medium text-foreground sm:text-[16px]">
                Keyinroq qilinadigan rejalar
              </p>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
                Bugun emas, lekin ertaga, bu hafta yoki keyinroq bajarish
                kerak bo&apos;lgan ishlarni shu yerga yozing.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((g) => {
                const activeItems = g.items.filter((p) => p.status !== "DONE");
                if (activeItems.length === 0) return null;
                return (
                  <section key={g.iso}>
                    <header className="mb-2 flex items-baseline gap-3 px-1">
                      <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
                        {labelFor(g.date, today)}
                      </h3>
                      <span className="text-[11.5px] text-faint">{formatUzDate(g.date)}</span>
                      <span className="ml-auto font-mono text-[10.5px] tabular-nums text-faint">
                        {activeItems.length}
                      </span>
                    </header>

                    <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
                      {activeItems.map((p) => {
                        if (p.time) {
                          return (
                            <AgendaRow
                              key={p.id}
                              plan={p}
                              onToggle={toggleStatus}
                              onRemove={askRemove}
                              onOpen={setDetailId}
                              isNew={p.id === justCreatedId}
                              rejaCategory={rejaCatMap.get(p.id)}
                            />
                          );
                        }
                        return (
                          <div
                            key={p.id}
                            draggable
                            onDragStart={(e) => dragUntimed.start(e, p.id)}
                            onDragOver={(e) => dragUntimed.over(e, p.id)}
                            onDrop={(e) => dragUntimed.drop(e, p.id)}
                            onDragEnd={dragUntimed.end}
                            className={cn(
                              "select-none transition-[opacity,box-shadow] duration-150",
                              dragUntimed.draggingId === p.id && "opacity-40",
                              dragUntimed.overId === p.id &&
                                dragUntimed.draggingId !== p.id &&
                                "shadow-[inset_0_2px_0_var(--foreground)]"
                            )}
                          >
                            <AgendaRow
                              plan={p}
                              onToggle={toggleStatus}
                              onRemove={askRemove}
                              onOpen={setDetailId}
                              isNew={p.id === justCreatedId}
                              rejaCategory={rejaCatMap.get(p.id)}
                            />
                          </div>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <TaskDetail
        plan={detailPlan ?? draftPlan}
        plans={plans}
        open={!!detailPlan || !!draftPlan}
        onClose={() => {
          setDetailId(null);
          setDraftPlan(null);
        }}
        onUpdate={update}
        onRemove={askRemove}
        draft={!!draftPlan && !detailPlan}
        onCreate={(input) => {
          const id = create(input);
          setDraftPlan(null);
          return id;
        }}
      />

      {/* Mobile FAB — bottom-right circular "+" button */}
      <button
        type="button"
        onClick={() => setMobileSheet(true)}
        aria-label="Yangi reja qo'shish"
        className={cn(
          "fixed right-4 z-30 grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_10px_30px_-5px_rgba(0,0,0,0.35)] transition-all duration-200 hover:scale-105 active:scale-95 md:hidden",
          mobileSheet && "pointer-events-none scale-75 opacity-0"
        )}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)" }}
      >
        <Plus className="size-6" strokeWidth={2.5} />
      </button>

      {/* Mobile add-task centered modal */}
      <AnimatePresence>
      {mobileSheet && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              setMobileSheet(false);
              setShowCalendar(false);
              setShowTime(false);
            }}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[3px] md:hidden"
          />
          <div
            className="fixed inset-0 z-50 flex items-start justify-center px-4 md:hidden"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 4rem)" }}
            onClick={() => {
              setMobileSheet(false);
              setShowCalendar(false);
              setShowTime(false);
            }}
          >
            <motion.div
              ref={mobileSheetRef}
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 360 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl"
            >
            <header className="flex items-center justify-between border-b border-border px-5 py-3">
              <p className="text-[15px] font-semibold tracking-[-0.01em]">Yangi reja</p>
              <button
                type="button"
                onClick={() => setMobileSheet(false)}
                aria-label="Yopish"
                className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </header>
            <form
              onSubmit={(e) => {
                submit(e);
                setMobileSheet(false);
              }}
              className="space-y-3 px-5 py-4"
            >
              <input
                ref={mobileInputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Yaqin kunlarga reja..."
                autoFocus
                className="w-full bg-transparent text-[17px] placeholder:text-faint focus:outline-none"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    ref={mobileTimeBtnRef}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setShowCalendar(false);
                      setShowTime((v) => !v);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-[13px] tabular-nums transition-colors",
                      showTime
                        ? "border-border-strong bg-subtle"
                        : "text-muted hover:border-border-strong hover:text-foreground"
                    )}
                  >
                    <Clock className="size-3.5" />
                    {time || "Vaqt"}
                  </button>
                  <button
                    type="button"
                    onClick={openDetailForCurrent}
                    disabled={!title.trim()}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px] transition-colors",
                      !title.trim()
                        ? "cursor-not-allowed text-faint/60"
                        : "text-muted hover:border-border-strong hover:text-foreground"
                    )}
                  >
                    <Pencil className="size-3.5" />
                    Batafsil
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className={cn(
                    "rounded-md px-4 py-2 text-[13.5px] font-medium transition-opacity",
                    !title.trim()
                      ? "cursor-not-allowed bg-foreground/40 text-background"
                      : "bg-accent text-accent-ink hover:opacity-90"
                  )}
                >
                  Qo&apos;shish
                </button>
              </div>

              {showCalendar && (
                <div
                  ref={mobileCalendarWrapRef}
                  className="overflow-hidden rounded-md border border-border bg-subtle/40 p-3"
                >
                  <div className="reveal-down">
                    <MiniMonth
                      today={today}
                      selected={date}
                      plans={plans}
                      onSelect={(d) => {
                        setDate(d);
                        setShowCalendar(false);
                      }}
                    />
                    <p className="mt-2 text-center text-[11px] text-faint">
                      Bugundan keyingi kunni tanlang.
                    </p>
                  </div>
                </div>
              )}
            </form>
            </motion.div>
          </div>
        </>
      )}
      </AnimatePresence>

      {confirmEl}
    </div>
  );
}
