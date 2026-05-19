"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Clock,
  Coffee,
  Pencil,
  Plus,
  Sun,
  Sunrise,
  Sunset,
  X,
} from "lucide-react";
import { usePlans } from "@/lib/plans-store";
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
import { TimePickerPopover } from "./widgets/time-picker-popover";
import { TaskDetail } from "./widgets/task-detail";
import { useConfirmRemove } from "./widgets/confirm-dialog";

export function BugunView() {
  const { plans, create, update, toggleStatus, remove } = usePlans();
  const { askRemove, confirmEl } = useConfirmRemove(plans, remove);
  const today = useMemo(() => startOfDay(), []);
  const todayIso = useMemo(() => toDateInputValue(today), [today]);

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const todays = useMemo(
    () =>
      plans
        .filter((p) => p.scope === "DAILY" && p.scheduledFor === todayIso)
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
          return b.createdAt.localeCompare(a.createdAt);
        }),
    [plans, todayIso]
  );

  const total = todays.length;
  const done = todays.filter((p) => p.status === "DONE").length;
  const active = todays.filter((p) => p.status !== "DONE");
  const completed = todays.filter((p) => p.status === "DONE");
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  function bucketOf(p: Plan): "morning" | "noon" | "evening" | "anytime" {
    if (!p.time) return "anytime";
    const h = Number(p.time.split(":")[0]);
    if (h < 12) return "morning";
    if (h < 17) return "noon";
    return "evening";
  }

  const blocks: {
    key: "morning" | "noon" | "evening" | "anytime";
    label: string;
    icon: React.ReactNode;
    items: Plan[];
  }[] = [
    { key: "morning", label: "Ertalab",   icon: <Sunrise className="size-3.5" />, items: active.filter((p) => bucketOf(p) === "morning") },
    { key: "noon",    label: "Kunduzi",   icon: <Sun className="size-3.5" />,     items: active.filter((p) => bucketOf(p) === "noon") },
    { key: "evening", label: "Kechqurun", icon: <Sunset className="size-3.5" />,  items: active.filter((p) => bucketOf(p) === "evening") },
    { key: "anytime", label: "Vaqtsiz",   icon: <Coffee className="size-3.5" />,  items: active.filter((p) => bucketOf(p) === "anytime") },
  ];

  // Add task form state
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [showTime, setShowTime] = useState(false);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [mobileSheet, setMobileSheet] = useState(false);
  const detailPlan = detailId ? plans.find((p) => p.id === detailId) ?? null : null;
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const timeBtnRef = useRef<HTMLButtonElement>(null);
  const mobileTimeBtnRef = useRef<HTMLButtonElement>(null);
  const animationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (mobileSheet) {
      // Focus title input as soon as the sheet renders (no delay so iOS
      // accepts the keyboard request inside the user-gesture window)
      mobileInputRef.current?.focus({ preventScroll: false });
    }
  }, [mobileSheet]);

  function openDetailForCurrent() {
    const t = title.trim() || "Yangi reja";
    const newId = create({
      title: t,
      scope: "DAILY",
      scheduledFor: todayIso,
      time: time || undefined,
    });
    setTitle("");
    setTime("");
    setMobileSheet(false);
    setShowTime(false);
    // Open the detail dialog for further editing (priority, notes, duration, ...)
    setDetailId(newId);
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
    <div className="flex h-screen flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex h-12 items-center justify-between gap-2 border-b border-border px-4 md:px-6">
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
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:py-8 md:pb-8">
        {/* Greeting block — bitta tortburchak ichida, bir qatorda */}
        <div className="rise-in flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 sm:px-5 sm:py-3.5">
          <h2 className="min-w-0 truncate text-[16px] font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-[18px]">
            {total === 0 ? "Birinchi rejangizni yozing" : "Bugungi rejalar"}
          </h2>
          {total > 0 && (
            <div className="flex shrink-0 items-center gap-2.5">
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
            </div>
          )}
        </div>

        {/* Add task — desktop only (mobile uses FAB at bottom-right) */}
        <form
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
              title="Batafsil sozlash (priority, izoh, davom...)"
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-faint transition-colors hover:bg-hover hover:text-foreground"
            >
              <Pencil className="size-3" />
              batafsil
            </button>
            <button
              ref={timeBtnRef}
              type="button"
              onClick={() => setShowTime((v) => !v)}
              className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] transition-colors",
                isTimePast
                  ? "bg-danger-soft text-danger"
                  : showTime
                  ? "bg-accent-soft text-accent-ink"
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

        {/* Tasks list */}
        <div
          className="rise-in mt-6"
          style={{ animationDelay: "120ms" }}
        >
          {total === 0 ? (
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
                    return (
                      <section
                        key={b.key}
                        className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]"
                      >
                        <header className="flex items-center justify-between border-b border-border bg-subtle/30 px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className="grid size-5 place-items-center rounded text-faint">
                              {b.icon}
                            </span>
                            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">
                              {b.label}
                            </p>
                          </div>
                          <p className="font-mono text-[10.5px] tabular-nums text-faint">
                            {b.items.length}
                          </p>
                        </header>
                        <ul className="divide-y divide-border/70">
                          {b.items.map((p) => (
                            <TaskRow
                              key={p.id}
                              plan={p}
                              onToggle={toggleStatus}
                              onRemove={askRemove}
                              onOpen={setDetailId}
                              isNew={p.id === justCreatedId}
                            />
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              )}

              {completed.length > 0 && (
                <section className="mt-3 overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
                  <button
                    type="button"
                    onClick={() => setShowCompleted((v) => !v)}
                    className={cn(
                      "flex w-full items-center justify-between bg-subtle/30 px-3 py-1.5 transition-colors hover:bg-subtle/60",
                      showCompleted && "border-b border-border"
                    )}
                    aria-expanded={showCompleted}
                    aria-controls="bugun-completed-list"
                  >
                    <div className="flex items-center gap-1.5">
                      <ChevronDown
                        className={cn(
                          "size-3 text-faint transition-transform duration-300",
                          !showCompleted && "-rotate-90"
                        )}
                      />
                      <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">
                        Bajarilgan
                      </p>
                    </div>
                    <p className="font-mono text-[10.5px] tabular-nums text-faint">
                      {completed.length}
                    </p>
                  </button>
                  <div
                    id="bugun-completed-list"
                    className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{ gridTemplateRows: showCompleted ? "1fr" : "0fr" }}
                  >
                    <ul className="divide-y divide-border/70 overflow-hidden">
                      {completed.map((p) => (
                        <div key={p.id} className="fade-in">
                          <TaskRow
                            plan={p}
                            onToggle={toggleStatus}
                            onRemove={askRemove}
                            onOpen={setDetailId}
                          />
                        </div>
                      ))}
                    </ul>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <TaskDetail
        plan={detailPlan}
        plans={plans}
        open={!!detailPlan}
        onClose={() => setDetailId(null)}
        onUpdate={update}
        onRemove={askRemove}
      />

      {/* Mobile FAB — bottom-right circular "+" button */}
      <button
        type="button"
        onClick={() => setMobileSheet(true)}
        aria-label="Yangi reja qo'shish"
        className={cn(
          "fixed right-4 z-30 grid size-14 place-items-center rounded-full bg-foreground text-background shadow-[0_10px_30px_-5px_rgba(0,0,0,0.35)] transition-all duration-200 hover:scale-105 active:scale-95 md:hidden",
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
                    className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:border-border-strong hover:text-foreground"
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
                      : "bg-foreground text-background hover:opacity-90"
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
