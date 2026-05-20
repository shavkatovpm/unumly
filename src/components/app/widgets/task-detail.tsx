"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Trash2, Clock, Flag, FileText, Calendar as CalendarIcon } from "lucide-react";
import type { Plan, PlanPriority } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  formatUzDate,
  fromDateInputValue,
  occupiedTimeSlots,
  startOfDay,
  toDateInputValue,
} from "@/lib/dates";
import { Dialog } from "./dialog";
import { TimePickerPopover } from "./time-picker-popover";
import { DatePickerPopover } from "./date-picker-popover";

const PRIORITIES: { value: PlanPriority; label: string; dot: string; ring: string }[] = [
  { value: "HIGH",   label: "Yuqori", dot: "bg-priority-high",   ring: "ring-priority-high" },
  { value: "MEDIUM", label: "O'rta",  dot: "bg-priority-medium", ring: "ring-priority-medium" },
  { value: "LOW",    label: "Past",   dot: "bg-priority-low",    ring: "ring-priority-low" },
];

const DURATIONS = [15, 30, 45, 60, 90, 120];

export function TaskDetail({
  plan,
  plans,
  open,
  onClose,
  onUpdate,
  onRemove,
  draft = false,
  onCreate,
}: {
  plan: Plan | null;
  plans?: Plan[];
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Plan>) => void;
  onRemove: (id: string) => void;
  /** Yangi reja yaratish rejimi — plan store'ga faqat Saqlash bosilganda yoziladi */
  draft?: boolean;
  onCreate?: (input: Omit<Plan, "id" | "createdAt" | "order" | "status">) => string;
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [priority, setPriority] = useState<PlanPriority>("LOW");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const timeBtnRef = useRef<HTMLButtonElement>(null);
  const dateBtnRef = useRef<HTMLButtonElement>(null);

  const today = useMemo(() => startOfDay(), []);
  const selectedDate = useMemo(
    () => (scheduledFor ? fromDateInputValue(scheduledFor) : today),
    [scheduledFor, today]
  );

  useEffect(() => {
    if (!plan) return;
    setTitle(plan.title);
    setNotes(plan.notes ?? "");
    setScheduledFor(plan.scheduledFor ?? "");
    setTime(plan.time ?? "");
    setDuration(plan.duration);
    setPriority(plan.priority ?? "LOW");
  }, [plan]);

  if (!plan) return null;

  const effectiveDateIso = scheduledFor || plan.scheduledFor;
  const isDateInPast = effectiveDateIso < toDateInputValue(today);

  // Max duration allowed without overlapping the next task on the same day
  let maxDuration: number | null = null;
  if (plans && time && /^\d{2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(":").map(Number);
    const startMin = h * 60 + m;
    let nextStart = Infinity;
    for (const p of plans) {
      if (p.id === plan.id) continue;
      if (p.scope !== "DAILY" || p.scheduledFor !== effectiveDateIso || !p.time) continue;
      const [ph, pm] = p.time.split(":").map(Number);
      const ps = ph * 60 + pm;
      if (ps >= startMin && ps < nextStart) nextStart = ps;
    }
    if (nextStart !== Infinity) maxDuration = nextStart - startMin;
  }

  // Is the edited time in the past?
  let isTimePast = false;
  if (time && /^\d{2}:\d{2}$/.test(time)) {
    const nowDate = new Date();
    const todayIso = toDateInputValue(today);
    if (effectiveDateIso < todayIso) {
      isTimePast = true;
    } else if (effectiveDateIso === todayIso) {
      const [h, m] = time.split(":").map(Number);
      const slotMin = h * 60 + m;
      const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();
      isTimePast = slotMin < nowMin;
    }
  }

  const blockSave = isTimePast || isDateInPast;

  function save() {
    if (blockSave) return;
    const safeDuration =
      duration !== undefined && maxDuration !== null && duration > maxDuration
        ? maxDuration > 0
          ? maxDuration
          : undefined
        : duration;
    if (draft && onCreate) {
      // Draft rejimi — yangi reja yaratamiz
      onCreate({
        title: title.trim() || plan!.title || "Yangi reja",
        notes: notes.trim() || undefined,
        scope: plan!.scope,
        scheduledFor: effectiveDateIso,
        time: time || undefined,
        duration: safeDuration,
        priority,
      });
    } else {
      onUpdate(plan!.id, {
        title: title.trim() || plan!.title,
        notes: notes.trim() || undefined,
        scheduledFor: effectiveDateIso,
        time: time || undefined,
        duration: safeDuration,
        priority,
      });
    }
    onClose();
  }

  function handleDelete() {
    onRemove(plan!.id);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} mobilePlacement="top">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            {draft ? "Yangi reja" : "Reja tafsilotlari"}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Reja nomi"
            className="w-full bg-transparent text-[18px] font-semibold tracking-[-0.01em] placeholder:text-faint focus:outline-none"
          />

          {/* Notes */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
              <FileText className="size-3" />
              Izoh
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Qo'shimcha tafsilot..."
              rows={3}
              autoFocus
              className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-2 text-[13px] leading-relaxed placeholder:text-faint focus:border-border-strong focus:outline-none"
            />
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-3" />
                Sana
              </span>
              {isDateInPast && (
                <span className="font-mono text-[10px] normal-case tracking-normal text-danger">
                  o&apos;tgan
                </span>
              )}
            </label>
            <button
              ref={dateBtnRef}
              type="button"
              onClick={() => {
                setShowDatePicker((v) => !v);
                setShowTimePicker(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-[13px] transition-colors",
                isDateInPast
                  ? "border-danger bg-danger-soft text-danger"
                  : showDatePicker
                  ? "border-border-strong bg-subtle text-foreground"
                  : "border-border bg-background text-foreground hover:border-border-strong"
              )}
            >
              <span>{formatUzDate(selectedDate)}</span>
              <CalendarIcon className="size-3.5 text-faint" />
            </button>
          </div>

          {/* Time + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 flex items-center justify-between text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3" />
                  Vaqt
                </span>
                {isTimePast && (
                  <span className="font-mono text-[10px] normal-case tracking-normal text-danger">
                    o&apos;tgan
                  </span>
                )}
              </label>
              <button
                ref={timeBtnRef}
                type="button"
                onClick={() => {
                  setShowTimePicker((v) => !v);
                  setShowDatePicker(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 font-mono text-[13px] tabular-nums transition-colors",
                  isTimePast
                    ? "border-danger bg-danger-soft text-danger"
                    : showTimePicker
                    ? "border-border-strong bg-subtle text-foreground"
                    : "border-border bg-background text-foreground hover:border-border-strong"
                )}
              >
                <span>{time || "—"}</span>
                <Clock className="size-3.5 text-faint" />
              </button>
            </div>
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
                <span>Davomiyligi</span>
                {maxDuration !== null && (
                  <span className="font-mono text-[10px] normal-case tracking-normal text-faint">
                    max {maxDuration}m
                  </span>
                )}
              </label>
              <div className="flex flex-wrap gap-1">
                {DURATIONS.map((d) => {
                  const conflict = maxDuration !== null && d > maxDuration;
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={conflict}
                      onClick={() => setDuration(duration === d ? undefined : d)}
                      title={conflict ? "Keyingi reja bilan to'qnashadi" : undefined}
                      className={cn(
                        "rounded-md border px-2 py-1 font-mono text-[11px] tabular-nums transition-colors",
                        conflict
                          ? "cursor-not-allowed border-border/40 text-faint/50 line-through"
                          : duration === d
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted hover:bg-hover hover:text-foreground"
                      )}
                    >
                      {d}m
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
              <Flag className="size-3" />
              Muhimlik
            </label>
            <div className="flex gap-1.5">
              {PRIORITIES.map((p) => {
                const active = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[12px] font-medium transition-all",
                      active
                        ? "border-foreground bg-subtle text-foreground"
                        : "border-border text-muted hover:bg-hover hover:text-foreground"
                    )}
                  >
                    <span className={cn("size-2 rounded-full", p.dot)} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-border bg-subtle/30 px-4 py-2.5">
          {draft ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-faint transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="size-3" />
              O&apos;chirish
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-[12px] text-muted transition-colors hover:bg-hover hover:text-foreground"
            >
              Bekor
            </button>
            <button
              type="submit"
              disabled={blockSave}
              title={
                isDateInPast
                  ? "O'tib ketgan sanaga saqlab bo'lmaydi"
                  : isTimePast
                  ? "O'tib ketgan vaqtga saqlab bo'lmaydi"
                  : undefined
              }
              className={cn(
                "rounded-md px-3 py-1.5 text-[12px] font-medium transition-opacity",
                blockSave
                  ? "cursor-not-allowed bg-foreground/40 text-background"
                  : "bg-foreground text-background hover:opacity-90"
              )}
            >
              Saqlash
            </button>
          </div>
        </footer>
      </form>

      <TimePickerPopover
        open={showTimePicker}
        triggerRef={timeBtnRef}
        value={time}
        onChange={(v) => setTime(v)}
        onClear={() => setTime("")}
        onClose={() => setShowTimePicker(false)}
        disableBefore={
          effectiveDateIso === toDateInputValue(today)
            ? (() => {
                const n = new Date();
                return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
              })()
            : undefined
        }
        occupiedSlots={
          plans ? occupiedTimeSlots(plans, effectiveDateIso, plan.id) : []
        }
      />

      <DatePickerPopover
        open={showDatePicker}
        triggerRef={dateBtnRef}
        today={today}
        selected={selectedDate}
        plans={plans ?? []}
        onSelect={(d) => setScheduledFor(toDateInputValue(d))}
        onClose={() => setShowDatePicker(false)}
      />
    </Dialog>
  );
}
