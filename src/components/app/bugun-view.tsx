"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  Coffee,
  Pencil,
  Plus,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  X,
} from "lucide-react";
import { useHydrated, useMissedPlans, usePlans } from "@/lib/plans-store";
import { MissedSection } from "./widgets/missed-section";
import { useDebts } from "@/lib/debts-store";
import { debtRemindersForToday } from "@/lib/debt-reminders";
import { DebtReminderRow } from "./widgets/debt-reminder-row";
import { useRejaCategoryMap } from "@/lib/use-reja-category";
import { useDragReorder } from "@/lib/use-drag-reorder";
import {
  formatUzDate,
  occupiedTimeSlots,
  parseTimeToMinutes,
  startOfDay,
  toDateInputValue,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/types";
import { TaskRow } from "./widgets/task-row";
import { TaskAnalytics } from "./widgets/task-analytics";
import { TimePickerPopover } from "./widgets/time-picker-popover";
import { TaskDetail } from "./widgets/task-detail";
import { useConfirmRemove } from "./widgets/confirm-dialog";
import { ListLoader } from "./widgets/list-loader";
import { useScrollLock } from "@/lib/use-scroll-lock";

export function BugunView() {
  const { plans, create, update, toggleStatus, remove, deferToToday, setCancelled } = usePlans();
  const missed = useMissedPlans();
  const rejaCatMap = useRejaCategoryMap();
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsLabel, setAnalyticsLabel] = useState("Haftalik analitika");
  const hydrated = useHydrated();

  const { askRemove, confirmEl } = useConfirmRemove(plans, remove, {
    description:
      '"{title}" o\'chiriladi va 30 kun davomida "O\'chirilgan" bo\'limida saqlanadi.',
  });
  const today = useMemo(() => startOfDay(), []);
  const todayIso = useMemo(() => toDateInputValue(today), [today]);

  // Qarz muddati eslatmalari — Bugun'da ko'rinadi (hal qilinsa yo'qoladi).
  const { debts, setSettled: settleDebt, snoozeDebt } = useDebts();
  const debtReminders = useMemo(
    () => debtRemindersForToday(debts, todayIso),
    [debts, todayIso]
  );

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Faqat bugungi rejalar. O'tib ketgan bajarilmaganlar bu yerda emas —
  // ular pastdagi yopiq "Bajarilmagan" bo'limida (effectiveStatus = MISSED),
  // 7 kundan oshganlari esa /arxiv sahifasida.
  const todays = useMemo(
    () =>
      plans
        .filter(
          (p) =>
            p.scope === "DAILY" &&
            p.scheduledFor === todayIso &&
            p.status !== "CANCELLED"
        )
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "DONE" ? 1 : -1;
          const aHas = !!a.time;
          const bHas = !!b.time;
          if (aHas !== bHas) return aHas ? -1 : 1;
          if (aHas && bHas) {
            const at = parseTimeToMinutes(a.time!);
            const bt = parseTimeToMinutes(b.time!);
            if (at !== bt) return at - bt;
          }
          // Untimed (and timed ties): higher `order` first — supports
          // drag-and-drop reordering in the Vaqtsiz section.
          if (a.order !== b.order) return b.order - a.order;
          return b.createdAt.localeCompare(a.createdAt);
        }),
    [plans, todayIso]
  );

  const total = todays.length;
  const done = todays.filter((p) => p.status === "DONE").length;
  const active = todays.filter((p) => p.status !== "DONE");
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Card sarlavhasi — analitika ochiq bo'lsa tanlangan davr nomiga o'zgaradi.
  const cardTitle = !hydrated
    ? "Bugungi rejalar"
    : total === 0
    ? "Birinchi rejangizni yozing"
    : analyticsOpen
    ? analyticsLabel
    : "Bugungi rejalar";

  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : null;

  function bucketOf(p: Plan): "overdue" | "midnight" | "morning" | "noon" | "evening" | "anytime" {
    // Kechikkan = bugungi, vaqti belgilangan, davomiyligi ham tugagan ish.
    // Vaqti kelganda emas, balki davomiyligi ham o'tgach qizil bo'ladi
    // (1 soatlik task faqat 1 soat o'tgach kechikkan hisoblanadi). Kun
    // oxirigacha shu yerda — hozirgidek qizil holatda — turaveradi.
    if (p.time && nowMin !== null) {
      if (parseTimeToMinutes(p.time) + (p.duration ?? 0) < nowMin) return "overdue";
    }
    if (!p.time) return "anytime";
    const h = Number(p.time.split(":")[0]);
    if (h < 5)  return "midnight";   // 00:00 – 04:59
    if (h < 12) return "morning";    // 05:00 – 11:59
    if (h < 18) return "noon";       // 12:00 – 17:59
    return "evening";                // 18:00 – 23:59
  }

  const blocks: {
    key: "overdue" | "midnight" | "morning" | "noon" | "evening" | "anytime";
    label: string;
    icon: React.ReactNode;
    items: Plan[];
    danger?: boolean;
  }[] = [
    { key: "overdue",  label: "Kechikkan",     icon: <AlertCircle className="size-3.5" />, items: active.filter((p) => bucketOf(p) === "overdue"), danger: true },
    { key: "midnight", label: "Yarim kechasi", icon: <Moon className="size-3.5" />,    items: active.filter((p) => bucketOf(p) === "midnight") },
    { key: "morning",  label: "Ertalab",       icon: <Sunrise className="size-3.5" />, items: active.filter((p) => bucketOf(p) === "morning") },
    { key: "noon",     label: "Kunduzi",       icon: <Sun className="size-3.5" />,     items: active.filter((p) => bucketOf(p) === "noon") },
    { key: "evening",  label: "Kechqurun",     icon: <Sunset className="size-3.5" />,  items: active.filter((p) => bucketOf(p) === "evening") },
    { key: "anytime",  label: "Vaqtsiz",       icon: <Coffee className="size-3.5" />,  items: active.filter((p) => bucketOf(p) === "anytime") },
  ];

  // Untimed drag-reorder: assign descending orders so the dragged item lands
  // above the drop target (highest order = first).
  const untimedItems = useMemo(
    () => active.filter((p) => bucketOf(p) === "anytime"),
    [active] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const dragUntimed = useDragReorder(untimedItems, (draggedId, beforeId) => {
    const list = [...untimedItems];
    const fromIdx = list.findIndex((p) => p.id === draggedId);
    const toIdx = beforeId
      ? list.findIndex((p) => p.id === beforeId)
      : list.length;
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(fromIdx < toIdx ? toIdx - 1 : toIdx, 0, moved);
    // Assign descending orders so the first element has the highest value
    const max = list.length;
    list.forEach((p, idx) => {
      const next = max - idx;
      if (p.order !== next) update(p.id, { order: next });
    });
  });

  // Add task form state
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [showTime, setShowTime] = useState(false);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [mobileSheet, setMobileSheet] = useState(false);
  const [draftPlan, setDraftPlan] = useState<Plan | null>(null);
  const detailPlan = detailId ? plans.find((p) => p.id === detailId) ?? null : null;
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const timeBtnRef = useRef<HTMLButtonElement>(null);
  const mobileTimeBtnRef = useRef<HTMLButtonElement>(null);
  const animationTimerRef = useRef<number | null>(null);

  useScrollLock(mobileSheet);

  useEffect(() => {
    if (mobileSheet) {
      // Focus title input as soon as the sheet renders (no delay so iOS
      // accepts the keyboard request inside the user-gesture window)
      mobileInputRef.current?.focus({ preventScroll: false });
    }
  }, [mobileSheet]);

  function openDetailForCurrent() {
    const t = title.trim();
    if (!t) return;
    // Draft — Saqlash bosilmaguncha store'ga yozilmaydi
    const draft: Plan = {
      id: "__draft__",
      title: t,
      deferCount: 0,
      scope: "DAILY",
      scheduledFor: todayIso,
      time: time || undefined,
      status: "TODO",
      createdAt: new Date().toISOString(),
      order: 0,
    };
    setDraftPlan(draft);
    setTitle("");
    setTime("");
    setMobileSheet(false);
    setShowTime(false);
  }

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) window.clearTimeout(animationTimerRef.current);
    };
  }, []);

  const isTimePast =
    !!time && /^\d{2}:\d{2}$/.test(time) && now
      ? (() => {
          const [h, m] = time.split(":").map(Number);
          const slotMin = h * 60 + m;
          const nowMin = now.getHours() * 60 + now.getMinutes();
          return slotMin < nowMin;
        })()
      : false;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    if (isTimePast) return;
    const newId = create({
      title: t,
      scope: "DAILY",
      scheduledFor: todayIso,
      time: time || undefined,
    });
    setJustCreatedId(newId);
    if (animationTimerRef.current) window.clearTimeout(animationTimerRef.current);
    animationTimerRef.current = window.setTimeout(() => setJustCreatedId(null), 500);
    setTitle("");
    setTime("");
    setShowTime(false);
    inputRef.current?.focus();
  }

  return (
    <div
      data-scroll-lock-on-focus
      className="flex flex-col overflow-y-auto [scrollbar-gutter:stable]"
      style={{ height: "var(--tg-vh, 100vh)" }}
    >
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] sm:text-[13px]">Bugun</h1>
          <span className="truncate text-[13px] text-faint sm:text-[12px]">{formatUzDate(today)}</span>
        </div>
        <p className="shrink-0 font-mono text-[11px] tabular-nums text-faint">
          {now
            ? now.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
            : "—"}
        </p>
      </header>

      {/* Content */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:py-8 md:pb-8 lg:max-w-3xl xl:max-w-4xl">
        {/* Greeting block — foiz halqasi bosilganda analitika ochiladi */}
        <div className="rise-in overflow-hidden rounded-lg border border-border bg-surface">
          <div
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5",
              total > 0 && "cursor-pointer select-none transition-colors hover:bg-hover/40"
            )}
            onClick={total > 0 ? () => setAnalyticsOpen((v) => !v) : undefined}
            role={total > 0 ? "button" : undefined}
            tabIndex={total > 0 ? 0 : undefined}
            aria-expanded={total > 0 ? analyticsOpen : undefined}
            onKeyDown={
              total > 0
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setAnalyticsOpen((v) => !v);
                    }
                  }
                : undefined
            }
          >
            <div className="min-w-0 flex-1 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.h2
                  key={cardTitle}
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -7 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="truncate text-[16px] font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-[18px]"
                >
                  {cardTitle}
                </motion.h2>
              </AnimatePresence>
            </div>
            {total > 0 && (
              <div data-coach="analytics" className="flex shrink-0 items-center gap-2">
                <div className="leading-none text-right">
                  <p className="font-mono text-[16px] font-semibold tabular-nums leading-none sm:text-[18px]">
                    {pct}%
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                    {done}/{total}
                  </p>
                </div>
                <div className="relative grid size-10 place-items-center">
                  <svg viewBox="0 0 36 36" className="-rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="var(--subtle)" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="3"
                      strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
                      strokeLinecap="round"
                      className="transition-[stroke-dasharray] duration-500 ease-out"
                    />
                  </svg>
                  {pct === 100 && (
                    <Check className="absolute size-4 text-accent check-pop" strokeWidth={5} />
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    "size-4 text-faint transition-transform duration-300",
                    analyticsOpen && "rotate-180"
                  )}
                />
              </div>
            )}
          </div>

          <AnimatePresence initial={false}>
            {analyticsOpen && total > 0 && (
              <motion.div
                key="analytics"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden border-t border-border bg-subtle/30"
              >
                <TaskAnalytics plans={plans} today={today} onRangeLabelChange={setAnalyticsLabel} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Add task — desktop only (mobile uses FAB at bottom-right) */}
        <form
          data-coach="add"
          onSubmit={submit}
          className="rise-in mt-8 hidden overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)] transition-colors focus-within:border-border-strong md:block"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <Plus className="size-3.5 text-faint" />
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bugun nima qilmoqchisiz?"
              className="flex-1 bg-transparent text-[13.5px] placeholder:text-faint focus:outline-none"
            />
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
              data-coach="time"
              type="button"
              onClick={() => setShowTime((v) => !v)}
              className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] transition-colors",
                isTimePast
                  ? "bg-danger-soft text-danger"
                  : showTime
                  ? "bg-accent-soft text-accent"
                  : "text-faint hover:bg-hover hover:text-foreground"
              )}
              title={isTimePast ? "O'tib ketgan vaqt" : undefined}
            >
              <Clock className="size-3" />
              {time || "vaqt"}
            </button>
            <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-faint sm:inline">
              ↵
            </kbd>
          </div>
        </form>

        <TimePickerPopover
          open={showTime}
          triggerRef={mobileSheet ? mobileTimeBtnRef : timeBtnRef}
          value={time}
          onChange={(v) => setTime(v)}
          onClear={() => setTime("")}
          onClose={() => setShowTime(false)}
          disableBefore={
            now
              ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
              : undefined
          }
          occupiedSlots={occupiedTimeSlots(plans, todayIso)}
        />

        {/* Qarz muddati eslatmalari */}
        {debtReminders.length > 0 && (
          <div className="rise-in mt-6 space-y-2" style={{ animationDelay: "80ms" }}>
            {debtReminders.map((r) => (
              <DebtReminderRow
                key={r.debt.id}
                reminder={r}
                today={todayIso}
                onSettle={() => settleDebt(r.debt.id, true)}
                onSnooze={(untilIso) => snoozeDebt(r.debt.id, untilIso)}
              />
            ))}
          </div>
        )}

        {/* Tasks list */}
        <div
          className="rise-in mt-6"
          style={{ animationDelay: "120ms" }}
        >
          {total === 0 && !hydrated ? (
            <ListLoader />
          ) : total === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
              <p className="text-[13.5px] text-muted">
                Ro&apos;yxat bo&apos;sh.{" "}
                <span className="hidden md:inline">
                  Yuqoridagi maydonga birinchi rejangizni yozing.
                </span>
                <span className="md:hidden">
                  Pastdagi <span className="font-mono">+</span> tugmasi orqali birinchi rejangizni qo&apos;shing.
                </span>
              </p>
              <p className="mt-1 hidden text-[11px] text-faint md:block">
                Vaqt qo&apos;shish uchun ⏱ tugmasini bosing.
              </p>
            </div>
          ) : (
            <>
              {active.length > 0 && (
                <div className="space-y-3">
                  {blocks.map((b) => {
                    if (b.items.length === 0) return null;
                    const isAnytime = b.key === "anytime";
                    const isOverdue = b.key === "overdue";
                    return (
                      <section
                        key={b.key}
                        className={cn(
                          "overflow-hidden rounded-lg border bg-surface shadow-[0_1px_0_var(--border)]",
                          isOverdue ? "border-danger/40" : "border-border"
                        )}
                      >
                        <header
                          className={cn(
                            "flex items-center justify-between border-b px-3 py-1.5",
                            isOverdue
                              ? "border-danger/30 bg-danger-soft"
                              : "border-border bg-subtle/30"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "grid size-5 place-items-center rounded",
                                isOverdue ? "text-danger" : "text-faint"
                              )}
                            >
                              {b.icon}
                            </span>
                            <p
                              className={cn(
                                "text-[10.5px] font-medium uppercase tracking-[0.12em]",
                                isOverdue ? "text-danger" : "text-faint"
                              )}
                            >
                              {b.label}
                            </p>
                          </div>
                          <p
                            className={cn(
                              "font-mono text-[10.5px] tabular-nums",
                              isOverdue ? "text-danger" : "text-faint"
                            )}
                          >
                            {b.items.length}
                          </p>
                        </header>
                        <ul className="divide-y divide-border/70">
                          {b.items.map((p) => {
                            // Faol oyna: vaqti kelgan, lekin davomiyligi hali
                            // tugamagan, bajarilmagan bugungi task → ko'k.
                            const isActiveNow =
                              !!p.time &&
                              p.status !== "DONE" &&
                              nowMin !== null &&
                              parseTimeToMinutes(p.time) <= nowMin &&
                              nowMin <= parseTimeToMinutes(p.time) + (p.duration ?? 0);
                            if (!isAnytime) {
                              return (
                                <TaskRow
                                  key={p.id}
                                  plan={p}
                                  onToggle={toggleStatus}
                                  onRemove={askRemove}
                                  onOpen={setDetailId}
                                  isNew={p.id === justCreatedId}
                                  overdue={isOverdue}
                                  active={isActiveNow}
                                  rejaCategory={rejaCatMap.get(p.id)}
                                />
                              );
                            }
                            // Anytime: wrap with drag-reorder handlers
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
                                <TaskRow
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

            </>
          )}

          {/* Muddati o'tgan, 7 kundan kam — yopiq holda, bugungi ro'yxatni
              chalg'itmasin. Bugungi ro'yxat bo'sh bo'lsa ham ko'rinadi. */}
          <MissedSection
            plans={missed}
            onDefer={deferToToday}
            onCancel={setCancelled}
            onToggle={toggleStatus}
            onOpen={setDetailId}
          />
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
        data-coach="add"
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
            onClick={() => setMobileSheet(false)}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[3px] md:hidden"
          />
          <div
            className="fixed inset-0 z-50 flex items-start justify-center px-4 md:hidden"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 4rem)" }}
            onClick={() => setMobileSheet(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 360 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
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
                placeholder="Bugun nima qilmoqchisiz?"
                autoFocus
                className="w-full bg-transparent text-[17px] placeholder:text-faint focus:outline-none"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    ref={mobileTimeBtnRef}
                    type="button"
                    // onMouseDown preventDefault — input fokusini saqlab qoladi
                    // (klaviatura yopilmaydi, viewport o'zgarmaydi, popover sakramaydi)
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowTime((v) => !v)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-[13px] tabular-nums transition-colors",
                      isTimePast
                        ? "border-danger bg-danger-soft text-danger"
                        : showTime
                        ? "border-border-strong bg-subtle"
                        : "text-muted hover:border-border-strong hover:text-foreground"
                    )}
                    title={isTimePast ? "O'tib ketgan vaqt" : undefined}
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
                  disabled={!title.trim() || isTimePast}
                  className={cn(
                    "rounded-md px-4 py-2 text-[13.5px] font-medium transition-opacity",
                    !title.trim() || isTimePast
                      ? "cursor-not-allowed bg-foreground/40 text-background"
                      : "bg-accent text-accent-ink hover:opacity-90"
                  )}
                >
                  Qo&apos;shish
                </button>
              </div>
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
