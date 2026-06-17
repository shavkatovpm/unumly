"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  Check,
  Clock,
  FileText,
  Flag,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type { Category, Idea, PlanPriority } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  formatUzDate,
  fromDateInputValue,
  occupiedTimeSlots,
  startOfDay,
  toDateInputValue,
} from "@/lib/dates";
import { CATEGORY_PALETTE } from "@/lib/category-palette";
import { Dialog } from "./dialog";
import { TimePickerPopover } from "./time-picker-popover";
import { DatePickerPopover } from "./date-picker-popover";

const PRIORITIES: { value: PlanPriority; label: string; dot: string }[] = [
  { value: "HIGH",   label: "Yuqori", dot: "bg-priority-high" },
  { value: "MEDIUM", label: "O'rta",  dot: "bg-priority-medium" },
  { value: "LOW",    label: "Past",   dot: "bg-priority-low" },
];

const DURATIONS = [15, 30, 45, 60, 90, 120];

export function IdeaDetail({
  idea,
  categories,
  ideas,
  open,
  onClose,
  onUpdate,
  onRemove,
  onToggleDone,
}: {
  idea: Idea | null;
  categories: Category[];
  ideas?: Idea[];
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Idea>) => void;
  onRemove: (id: string) => void;
  onToggleDone: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [priority, setPriority] = useState<PlanPriority | undefined>(undefined);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const timeBtnRef = useRef<HTMLButtonElement>(null);
  const dateBtnRef = useRef<HTMLButtonElement>(null);

  const today = useMemo(() => startOfDay(), []);
  const todayIso = useMemo(() => toDateInputValue(today), [today]);

  useEffect(() => {
    if (!idea) return;
    setTitle(idea.title);
    setNotes(idea.notes ?? "");
    setCategoryId(idea.categoryId);
    setScheduledFor(idea.scheduledFor ?? "");
    setTime(idea.time ?? "");
    setDuration(idea.duration);
    setPriority(idea.priority);
  }, [idea]);

  if (!idea) return null;

  const selectedDate = scheduledFor ? fromDateInputValue(scheduledFor) : today;
  const isDateInPast = scheduledFor !== "" && scheduledFor < todayIso;
  const isToday = scheduledFor === todayIso;

  let isTimePast = false;
  if (isToday && time && /^\d{2}:\d{2}$/.test(time)) {
    const n = new Date();
    const [h, m] = time.split(":").map(Number);
    const slot = h * 60 + m;
    const nowMin = n.getHours() * 60 + n.getMinutes();
    isTimePast = slot < nowMin;
  }
  const blockSave = isDateInPast || isTimePast;

  function save() {
    if (blockSave) return;
    onUpdate(idea!.id, {
      title: title.trim() || idea!.title,
      notes: notes.trim() || undefined,
      categoryId,
      scheduledFor: scheduledFor || undefined,
      time: scheduledFor ? (time || undefined) : undefined,
      duration: scheduledFor ? duration : undefined,
      priority,
    });
    onClose();
  }

  function clearSchedule() {
    setScheduledFor("");
    setTime("");
    setDuration(undefined);
  }

  function handleDelete() {
    onRemove(idea!.id);
    onClose();
  }

  const activeCat = categories.find((c) => c.id === categoryId);

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
            Reja tafsilotlari
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleDone(idea.id)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors",
                idea.done
                  ? "bg-accent-soft text-accent-ink hover:bg-accent-soft/80"
                  : "text-faint hover:bg-hover hover:text-foreground"
              )}
            >
              <Check className="size-3" strokeWidth={3} />
              {idea.done ? "Bajarildi" : "Bajarilmagan"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Yopish"
              className="grid size-7 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
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
              <FileText className="size-3" /> Izoh
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

          {/* Category */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
              <Tag className="size-3" /> Toifa
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => {
                const isA = categoryId === c.id;
                const color = CATEGORY_PALETTE[c.color].oklch;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11.5px] transition-colors",
                      isA ? "border-accent bg-accent text-accent-ink" : "border-border text-muted hover:border-border-strong hover:text-foreground"
                    )}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: isA ? "rgba(255,255,255,0.7)" : color }}
                    />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-3" /> Sana
              </span>
              <div className="flex items-center gap-2">
                {isDateInPast && (
                  <span className="font-mono text-[10px] normal-case tracking-normal text-danger">
                    o&apos;tgan
                  </span>
                )}
                {scheduledFor && (
                  <button
                    type="button"
                    onClick={clearSchedule}
                    className="font-mono text-[10px] normal-case tracking-normal text-faint hover:text-danger"
                  >
                    tozalash
                  </button>
                )}
              </div>
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
                  : "border-border bg-background text-foreground hover:border-border-strong",
                !scheduledFor && "text-faint"
              )}
            >
              <span>{scheduledFor ? formatUzDate(selectedDate) : "Sanasiz"}</span>
              <CalendarIcon className="size-3.5 text-faint" />
            </button>
          </div>

          {/* Time + Duration */}
          {scheduledFor && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 flex items-center justify-between text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3" /> Vaqt
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
                <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
                  Davomiyligi
                </label>
                <div className="flex flex-wrap gap-1">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(duration === d ? undefined : d)}
                      className={cn(
                        "rounded-md border px-2 py-1 font-mono text-[11px] tabular-nums transition-colors",
                        duration === d
                          ? "border-accent bg-accent text-accent-ink"
                          : "border-border text-muted hover:bg-hover hover:text-foreground"
                      )}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
              <Flag className="size-3" /> Muhimlik
            </label>
            <div className="flex gap-1.5">
              {PRIORITIES.map((p) => {
                const isA = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(isA ? undefined : p.value)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[12px] font-medium transition-all",
                      isA
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
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-faint transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-3" /> O&apos;chirish
          </button>
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
                  ? "O'tgan sanaga saqlab bo'lmaydi"
                  : isTimePast
                  ? "O'tgan vaqtga saqlab bo'lmaydi"
                  : undefined
              }
              className={cn(
                "rounded-md px-3 py-1.5 text-[12px] font-medium transition-opacity",
                blockSave
                  ? "cursor-not-allowed bg-foreground/40 text-background"
                  : "bg-accent text-accent-ink hover:opacity-90"
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
          isToday
            ? (() => {
                const n = new Date();
                return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
              })()
            : undefined
        }
        occupiedSlots={
          ideas && scheduledFor
            ? occupiedTimeSlots(
                ideas.map((i) => ({
                  id: i.id,
                  scope: "DAILY",
                  scheduledFor: i.scheduledFor,
                  time: i.time,
                  duration: i.duration,
                })),
                scheduledFor,
                idea.id
              )
            : []
        }
      />

      <DatePickerPopover
        open={showDatePicker}
        triggerRef={dateBtnRef}
        today={today}
        selected={selectedDate}
        plans={[]}
        onSelect={(d) => setScheduledFor(toDateInputValue(d))}
        onClose={() => setShowDatePicker(false)}
      />
    </Dialog>
  );
}
