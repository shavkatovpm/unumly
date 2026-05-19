"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Clock,
  Coffee,
  Plus,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import { usePlans } from "@/lib/plans-store";
import {
  formatUzDate,
  greeting,
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
  const detailPlan = detailId ? plans.find((p) => p.id === detailId) ?? null : null;
  const inputRef = useRef<HTMLInputElement>(null);
  const timeBtnRef = useRef<HTMLButtonElement>(null);
  const animationTimerRef = useRef<number | null>(null);

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
      <header className="flex h-12 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-[13px] font-semibold tracking-[-0.01em]">Bugun</h1>
          <span className="text-[12px] text-faint">{formatUzDate(today)}</span>
        </div>
        <p className="font-mono text-[11px] tabular-nums text-faint">
          {now
            ? now.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
            : "—"}
        </p>
      </header>

      {/* Content */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        {/* Greeting block */}
        <div className="rise-in grid grid-cols-[1fr_auto] items-center gap-4">
          <div className="min-w-0">
            <h2 className="text-[28px] font-semibold tracking-[-0.025em] text-foreground">
              {now ? greeting(now) : "Xayrli kun"}
            </h2>
            <p className="mt-1.5 text-[13.5px] text-muted">
              {total === 0
                ? "Bo'sh varaq. Birinchi rejangizni yozing."
                : done === total
                ? `Hammasi bajarildi — ${total} ta reja. Kunni yopish vaqti.`
                : `${done} / ${total} bajarildi · ${active.length} ta qoldi`}
            </p>
          </div>

          {total > 0 && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-mono text-[20px] font-semibold tabular-nums leading-none">
                  {pct}%
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                  {done}/{total}
                </p>
              </div>
              <div className="relative grid size-12 place-items-center">
                <svg viewBox="0 0 36 36" className="-rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="var(--subtle)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3"
                    strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
                    strokeLinecap="round"
                    className="transition-[stroke-dasharray] duration-500 ease-out"
                  />
                </svg>
                {pct === 100 && (
                  <Check
                    className="absolute size-4 text-accent check-pop"
                    strokeWidth={3}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add task */}
        <form
          onSubmit={submit}
          className="rise-in mt-8 overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)] transition-colors focus-within:border-border-strong"
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
          triggerRef={timeBtnRef}
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
                Ro&apos;yxat bo&apos;sh. Yuqoridagi maydonga birinchi rejangizni yozing.
              </p>
              <p className="mt-1 text-[11px] text-faint">
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
      {confirmEl}
    </div>
  );
}
