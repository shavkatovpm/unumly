"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import type { Plan, PlanPriority } from "@/lib/types";
import type { CreatePlanInput } from "@/lib/plans-store";
import { cn } from "@/lib/utils";
import {
  isSameDay,
  startOfWeek,
  toDateInputValue,
} from "@/lib/dates";
import { PriorityPicker } from "@/components/app/widgets/priority-picker";
import { TaskDetail } from "@/components/app/widgets/task-detail";
import { ConfirmDialog } from "@/components/app/widgets/confirm-dialog";

const WEEKDAY_FULL = ["dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba", "yakshanba"];

function priorityClasses(p: PlanPriority | undefined, done: boolean) {
  if (done) {
    return {
      border: "border-border-strong",
      bg: "bg-subtle/80 hover:bg-subtle",
    };
  }
  if (p === "HIGH") {
    return {
      border: "border-priority-high",
      bg: "bg-priority-high-soft hover:bg-priority-high-soft",
    };
  }
  if (p === "MEDIUM") {
    return {
      border: "border-priority-medium",
      bg: "bg-priority-medium-soft hover:bg-priority-medium-soft",
    };
  }
  if (p === "LOW") {
    return {
      border: "border-priority-low",
      bg: "bg-priority-low-soft hover:bg-priority-low-soft",
    };
  }
  return {
    border: "border-border-strong",
    bg: "bg-subtle/60 hover:bg-subtle",
  };
}

const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_HEIGHT = 56;
const SNAP = 15;
const TOTAL_HOURS = END_HOUR - START_HOUR + 1;
const MAX_MIN = TOTAL_HOURS * 60;

const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

type Editing = {
  dayIdx: number;
  hour: number;
  minute: number;
  duration: number; // minutes
};

type Drag = {
  dayIdx: number;
  anchorMin: number;  // minutes from START_HOUR at mousedown
  currentMin: number; // minutes from START_HOUR currently
  moved: boolean;
};

export function HaftaView({
  date,
  today,
  plans,
  onCreate,
  onToggle,
  onRemove,
  onUpdate,
  onRemoveMany,
}: {
  date: Date;
  today: Date;
  plans: Plan[];
  onCreate: (input: CreatePlanInput) => string;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Plan>) => void;
  onRemoveMany?: (ids: string[]) => void;
}) {
  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const [editing, setEditing] = useState<Editing | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [hover, setHover] = useState<{ dayIdx: number; hour: number; minute: number } | null>(null);
  const [hourHover, setHourHover] = useState<{ dayIdx: number; hour: number } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ dayIdx: number; minuteFromStart: number } | null>(null);
  const detailPlan = detailId ? plans.find((p) => p.id === detailId) ?? null : null;
  const [clearDayIdx, setClearDayIdx] = useState<number | null>(null);
  const clearDayInfo = clearDayIdx === null ? null : (() => {
    const day = days[clearDayIdx];
    const iso = toDateInputValue(day);
    const dayItems = plans.filter((p) => p.scope === "DAILY" && p.scheduledFor === iso);
    return {
      label: WEEKDAY_FULL[clearDayIdx],
      count: dayItems.length,
      ids: dayItems.map((p) => p.id),
    };
  })();
  const dragRef = useRef<Drag | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Offset (minutes) from the cursor to the dragged task's top, captured at
  // dragstart. Used by the drop preview so the task's top anchors to the
  // grab point, not to the cursor itself.
  const grabOffsetMinRef = useRef(0);

  // keep ref in sync so the global mouseup handler reads latest drag
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Global mouseup: commit drag (or click) regardless of where cursor releases
  useEffect(() => {
    function up() {
      const d = dragRef.current;
      if (!d) return;

      let hour: number;
      let minute: number;
      let duration: number;
      if (!d.moved) {
        hour = Math.floor(d.anchorMin / 60) + START_HOUR;
        minute = d.anchorMin % 60;
        duration = SNAP;
      } else {
        const startMinTotal = Math.min(d.anchorMin, d.currentMin);
        const endMinTotal = Math.max(d.anchorMin, d.currentMin) + SNAP;
        duration = endMinTotal - startMinTotal;
        hour = Math.floor(startMinTotal / 60) + START_HOUR;
        minute = startMinTotal % 60;
      }

      // Reject creating a task that starts in the past
      const dayIso = toDateInputValue(days[d.dayIdx]);
      if (isPastTime(dayIso, hour * 60 + minute)) {
        setDrag(null);
        return;
      }

      // Reject if the drag range overlaps any existing task. Clamp the duration
      // to the next occupied slot if the user dragged past one — single-click
      // (unmoved) is already filtered by isSlotOccupied in handleSlotMouseDown.
      const startAbsMin = hour * 60 + minute;
      let safeDuration = duration;
      for (const p of plans) {
        if (p.scope !== "DAILY" || p.scheduledFor !== dayIso || !p.time) continue;
        const [ph, pm] = p.time.split(":").map(Number);
        const ts = ph * 60 + pm;
        const te = ts + (p.duration ?? 60);
        if (ts >= startAbsMin && ts < startAbsMin + safeDuration) {
          // Existing task starts inside the drag → shrink our duration to fit
          safeDuration = ts - startAbsMin;
        } else if (te > startAbsMin && ts < startAbsMin) {
          // Drag starts inside an existing task (shouldn't happen because of mousedown
          // guard, but defensive) → abort
          safeDuration = 0;
        }
      }
      if (safeDuration < SNAP) {
        setDrag(null);
        return;
      }

      setEditing({ dayIdx: d.dayIdx, hour, minute, duration: safeDuration });
      setEditingTitle("");
      setDrag(null);
    }
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [days, now, today, plans]);

  function isPastTime(dayIso: string, absMin: number): boolean {
    if (!now) return false;
    const todayIso = toDateInputValue(today);
    if (dayIso < todayIso) return true;
    if (dayIso > todayIso) return false;
    const currentAbsMin = now.getHours() * 60 + now.getMinutes();
    return absMin < currentAbsMin;
  }

  function isHourFullyPast(dayIso: string, hour: number): boolean {
    if (!now) return false;
    const todayIso = toDateInputValue(today);
    if (dayIso < todayIso) return true;
    if (dayIso > todayIso) return false;
    const currentAbsMin = now.getHours() * 60 + now.getMinutes();
    return currentAbsMin >= (hour + 1) * 60;
  }

  function isSlotOccupied(dayIso: string, slotAbsMin: number): boolean {
    const slotEnd = slotAbsMin + SNAP;
    for (const p of plans) {
      if (p.scope !== "DAILY" || p.scheduledFor !== dayIso || !p.time) continue;
      const [ph, pm] = p.time.split(":").map(Number);
      const ts = ph * 60 + pm;
      const te = ts + (p.duration ?? 60);
      if (ts < slotEnd && te > slotAbsMin) return true;
    }
    return false;
  }

  function calcMinuteInCell(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawMin = (y / HOUR_HEIGHT) * 60;
    return Math.max(0, Math.min(45, Math.floor(rawMin / SNAP) * SNAP));
  }

  function totalMin(hour: number, minute: number) {
    return (hour - START_HOUR) * 60 + minute;
  }

  // Save the in-progress task (if any) without opening the detail dialog —
  // used when the user starts a new selection mid-edit.
  function flushPendingEditor() {
    if (!editing) return;
    if (editingTitle.trim()) {
      const day = days[editing.dayIdx];
      const time = `${String(editing.hour).padStart(2, "0")}:${String(editing.minute).padStart(2, "0")}`;
      onCreate({
        title: editingTitle.trim(),
        scope: "DAILY",
        scheduledFor: toDateInputValue(day),
        time,
        duration: editing.duration,

      });
    }
    setEditing(null);
    setEditingTitle("");
  }

  function handleSlotMouseDown(dayIdx: number, hour: number, e: React.MouseEvent<HTMLDivElement>) {
    const minute = calcMinuteInCell(e);
    const dayIso = toDateInputValue(days[dayIdx]);
    if (isPastTime(dayIso, hour * 60 + minute)) return;
    // Skip if slot is occupied by an existing task
    if (isSlotOccupied(dayIso, hour * 60 + minute)) return;
    // If an editor is open, close it (saving any typed title) before starting new select
    flushPendingEditor();
    e.preventDefault(); // avoid selecting text during drag
    const t = totalMin(hour, minute);
    setDrag({ dayIdx, anchorMin: t, currentMin: t, moved: false });
  }

  function largestFreeInHour(dayIso: string, hour: number): { start: number; duration: number } {
    const hourStartAbs = hour * 60;
    const hourEndAbs = hourStartAbs + 60;

    const occupied: Array<[number, number]> = [];

    // Treat past time as occupied so the quick-task zone never appears in the past
    const todayIso = toDateInputValue(today);
    if (dayIso < todayIso) {
      occupied.push([0, 60]);
    } else if (dayIso === todayIso && now) {
      const currentAbsMin = now.getHours() * 60 + now.getMinutes();
      if (currentAbsMin >= hourEndAbs) {
        occupied.push([0, 60]);
      } else if (currentAbsMin > hourStartAbs) {
        occupied.push([0, currentAbsMin - hourStartAbs]);
      }
    }

    for (const p of plans) {
      if (p.scope !== "DAILY" || p.scheduledFor !== dayIso || !p.time) continue;
      const [ph, pm] = p.time.split(":").map(Number);
      const ts = ph * 60 + pm;
      const te = ts + (p.duration ?? 60);
      if (ts >= hourEndAbs || te <= hourStartAbs) continue;
      occupied.push([Math.max(0, ts - hourStartAbs), Math.min(60, te - hourStartAbs)]);
    }
    occupied.sort((a, b) => a[0] - b[0]);

    const merged: Array<[number, number]> = [];
    for (const [s, e] of occupied) {
      if (merged.length > 0 && s <= merged[merged.length - 1][1]) {
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
      } else {
        merged.push([s, e]);
      }
    }

    const free: Array<[number, number]> = [];
    let prev = 0;
    for (const [s, e] of merged) {
      if (prev < s) free.push([prev, s]);
      prev = e;
    }
    if (prev < 60) free.push([prev, 60]);

    let bestStart = 0;
    let bestDur = 0;
    for (const [s, e] of free) {
      const snappedStart = Math.ceil(s / SNAP) * SNAP;
      const snappedEnd = Math.floor(e / SNAP) * SNAP;
      const dur = snappedEnd - snappedStart;
      if (dur > bestDur) {
        bestDur = dur;
        bestStart = snappedStart;
      }
    }
    return { start: bestStart, duration: bestDur };
  }

  function calcDropMinute(e: React.DragEvent<HTMLDivElement>): number {
    // y position relative to the day column (which contains the hour cells starting at top)
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    // Anchor the drop preview to where the user grabbed the task, not to the
    // cursor itself. Subtract the grab offset before snapping to the grid.
    const adjustedMin = (y / HOUR_HEIGHT) * 60 - grabOffsetMinRef.current;
    const snapped = Math.round(adjustedMin / SNAP) * SNAP;
    return Math.max(0, Math.min(MAX_MIN - SNAP, snapped));
  }

  function isDropBlocked(dayIdx: number, minuteFromStart: number, draggedId: string): boolean {
    const draggedPlan = plans.find((p) => p.id === draggedId);
    if (!draggedPlan) return false;
    const duration = draggedPlan.duration ?? 60;
    const dayIso = toDateInputValue(days[dayIdx]);

    const dropStartAbs = START_HOUR * 60 + minuteFromStart;
    const dropEndAbs = dropStartAbs + duration;

    // Block dropping onto past time
    if (isPastTime(dayIso, dropStartAbs)) return true;

    for (const p of plans) {
      if (p.id === draggedId) continue;
      if (p.scope !== "DAILY" || p.scheduledFor !== dayIso || !p.time) continue;
      const [ph, pm] = p.time.split(":").map(Number);
      const ts = ph * 60 + pm;
      const te = ts + (p.duration ?? 60);
      if (ts < dropEndAbs && te > dropStartAbs) return true;
    }
    return false;
  }

  function handleTaskDragStart(e: React.DragEvent<HTMLDivElement>, planId: string) {
    e.dataTransfer.setData("text/plain", planId);
    e.dataTransfer.effectAllowed = "move";
    // Capture grab offset (minutes) so the drop preview anchors to the task's
    // top, not the cursor itself.
    const taskRect = e.currentTarget.getBoundingClientRect();
    const grabY = Math.max(0, e.clientY - taskRect.top);
    grabOffsetMinRef.current = (grabY / HOUR_HEIGHT) * 60;
    setDraggingId(planId);
  }

  function handleTaskDragEnd() {
    grabOffsetMinRef.current = 0;
    setDraggingId(null);
    setDropTarget(null);
  }

  function handleColumnDragOver(e: React.DragEvent<HTMLDivElement>, dayIdx: number) {
    if (!draggingId) return;
    e.preventDefault();
    const minuteFromStart = calcDropMinute(e);
    const blocked = isDropBlocked(dayIdx, minuteFromStart, draggingId);
    e.dataTransfer.dropEffect = blocked ? "none" : "move";
    if (
      !dropTarget ||
      dropTarget.dayIdx !== dayIdx ||
      dropTarget.minuteFromStart !== minuteFromStart
    ) {
      setDropTarget({ dayIdx, minuteFromStart });
    }
  }

  function handleColumnDrop(e: React.DragEvent<HTMLDivElement>, dayIdx: number) {
    e.preventDefault();
    const planId = e.dataTransfer.getData("text/plain") || draggingId;
    setDraggingId(null);
    setDropTarget(null);
    if (!planId) return;
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const minuteFromStart = calcDropMinute(e);
    if (isDropBlocked(dayIdx, minuteFromStart, planId)) return;
    const totalAbsMin = START_HOUR * 60 + minuteFromStart;
    const newHour = Math.floor(totalAbsMin / 60);
    const newMin = totalAbsMin % 60;
    const newTime = `${String(newHour).padStart(2, "0")}:${String(newMin).padStart(2, "0")}`;
    const day = days[dayIdx];
    const newIso = toDateInputValue(day);
    if (plan.scheduledFor === newIso && plan.time === newTime) return;
    onUpdate(plan.id, { scheduledFor: newIso, time: newTime });
  }

  function openHourEditor(dayIdx: number, hour: number) {
    const day = days[dayIdx];
    const dayIso = toDateInputValue(day);
    const { start, duration } = largestFreeInHour(dayIso, hour);
    if (duration < SNAP) return;

    // Save any in-progress editor before opening the new one
    flushPendingEditor();

    setEditing({
      dayIdx,
      hour,
      minute: start,
      duration,
    });
    setEditingTitle("");
    setHourHover(null);
  }

  function handleSlotMove(dayIdx: number, hour: number, e: React.MouseEvent<HTMLDivElement>) {
    const minute = calcMinuteInCell(e);

    // Don't show hover preview on past slots or slots occupied by tasks
    const dayIso = toDateInputValue(days[dayIdx]);
    const slotBlocked =
      isPastTime(dayIso, hour * 60 + minute) ||
      isSlotOccupied(dayIso, hour * 60 + minute);

    if (slotBlocked) {
      if (hover) setHover(null);
    } else if (
      hover?.dayIdx !== dayIdx ||
      hover?.hour !== hour ||
      hover?.minute !== minute
    ) {
      setHover({ dayIdx, hour, minute });
    }

    // drag tracking (only within same day column)
    if (drag && drag.dayIdx === dayIdx) {
      const cur = totalMin(hour, minute);
      if (cur !== drag.currentMin) {
        setDrag({
          ...drag,
          currentMin: cur,
          moved: drag.moved || cur !== drag.anchorMin,
        });
      }
    }
  }

  function commit() {
    if (editing && editingTitle.trim()) {
      const day = days[editing.dayIdx];
      const time = `${String(editing.hour).padStart(2, "0")}:${String(editing.minute).padStart(2, "0")}`;
      onCreate({
        title: editingTitle.trim(),
        scope: "DAILY",
        scheduledFor: toDateInputValue(day),
        time,
        duration: editing.duration,

      });
    }
    setEditing(null);
    setEditingTitle("");
  }

  function cancel() {
    setEditing(null);
    setEditingTitle("");
  }

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => i + START_HOUR);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
      <div className="flex-1 select-none overflow-auto">
        <div className="min-w-[760px] sm:min-w-0">
        {/* Sticky header */}
        <div
          className="sticky top-0 z-30 grid border-b border-border bg-subtle/95 backdrop-blur"
          style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}
        >
          <div />
          {days.map((d, i) => {
            const isToday = isSameDay(d, today);
            const dayIso = toDateInputValue(d);
            const dayHasItems = onRemoveMany
              ? plans.some((p) => p.scope === "DAILY" && p.scheduledFor === dayIso)
              : false;
            return (
              <div
                key={i}
                className="group/dh relative flex items-baseline justify-center gap-1.5 border-l border-border py-2"
              >
                <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  {WEEKDAYS[i]}
                </span>
                <span
                  className={cn(
                    "text-[14px] tabular-nums",
                    isToday
                      ? "grid size-6 place-items-center rounded-full bg-foreground font-semibold text-background"
                      : "font-medium text-foreground"
                  )}
                >
                  {d.getDate()}
                </span>
                {dayHasItems && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setClearDayIdx(i);
                    }}
                    title="Kun rejalarini tozalash"
                    aria-label={`${WEEKDAY_FULL[i]} kunidagi barcha rejalarni o'chirish`}
                    className="absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-faint opacity-25 transition-all hover:bg-danger-soft hover:text-danger hover:opacity-100 group-hover/dh:opacity-60"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="grid pt-3" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          {/* Time axis */}
          <div>
            {hours.map((h) => (
              <div key={h} className="relative border-t border-border" style={{ height: HOUR_HEIGHT }}>
                <span className="absolute right-2 top-0 -translate-y-1/2 bg-surface px-1 font-mono text-[10px] tabular-nums text-faint">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => {
            const dayIso = toDateInputValue(day);
            const dayPlans = plans.filter(
              (p) => p.scope === "DAILY" && p.scheduledFor === dayIso && p.time
            );
            const isToday = isSameDay(day, today);
            const currentTimeY =
              isToday && now
                ? ((now.getHours() - START_HOUR) * 60 + now.getMinutes()) * (HOUR_HEIGHT / 60)
                : -1;

            // Drag in this day column
            const isDraggingHere = drag && drag.dayIdx === dayIdx;
            const dragInThisDay = isDraggingHere && drag.moved;
            const dragStartMin = dragInThisDay ? Math.min(drag.anchorMin, drag.currentMin) : 0;
            const dragEndMin = dragInThisDay ? Math.max(drag.anchorMin, drag.currentMin) + SNAP : 0;
            const dragDuration = dragEndMin - dragStartMin;

            // Range of cells (hours) the drag covers — used to limit subdivision noise
            const dragCoverStart = isDraggingHere ? Math.min(drag.anchorMin, drag.currentMin) : -1;
            const dragCoverEnd = isDraggingHere ? Math.max(drag.anchorMin, drag.currentMin) + SNAP : -1;

            // Past-time region height for this day column
            const todayIso2 = toDateInputValue(today);
            let pastHeightPx = 0;
            const fullDayHeight = MAX_MIN * (HOUR_HEIGHT / 60);
            if (dayIso < todayIso2) {
              pastHeightPx = fullDayHeight;
            } else if (dayIso === todayIso2 && now) {
              const curAbsMin = now.getHours() * 60 + now.getMinutes();
              const startAbsMin = START_HOUR * 60;
              if (curAbsMin > startAbsMin) {
                pastHeightPx = Math.min(fullDayHeight, (curAbsMin - startAbsMin) * (HOUR_HEIGHT / 60));
              }
            }

            return (
              <div
                key={dayIdx}
                className="relative border-l border-border"
                onDragOver={(e) => handleColumnDragOver(e, dayIdx)}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setDropTarget((t) => (t?.dayIdx === dayIdx ? null : t));
                }}
                onDrop={(e) => handleColumnDrop(e, dayIdx)}
              >
                {/* Past-time stripes overlay */}
                {pastHeightPx > 0 && (
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 z-[1] bg-[repeating-linear-gradient(135deg,transparent_0,transparent_5px,var(--border)_5px,var(--border)_6px)] opacity-50"
                    style={{ height: pastHeightPx }}
                  />
                )}
                {hours.map((h) => {
                  const isHovered = hover?.dayIdx === dayIdx && hover?.hour === h;
                  const hoveredMinute = isHovered ? hover.minute : null;
                  const hourStartMin = (h - START_HOUR) * 60;
                  const hourEndMin = hourStartMin + 60;
                  const cellInDrag =
                    isDraggingHere && hourStartMin < dragCoverEnd && hourEndMin > dragCoverStart;
                  const isHourHovered =
                    hourHover?.dayIdx === dayIdx && hourHover?.hour === h && !drag;
                  const showSubdivisions =
                    ((isHovered || isHourHovered) && !drag) || cellInDrag;
                  const free = largestFreeInHour(dayIso, h);
                  const hasFree = free.duration > SNAP;
                  const freeLabel =
                    free.duration >= 60 ? "1s" : `${free.duration}m`;
                  const cellIsHovered = (isHovered || isHourHovered) && !drag;
                  const prevCellHovered =
                    !drag &&
                    ((hover?.dayIdx === dayIdx && hover?.hour === h - 1) ||
                      (hourHover?.dayIdx === dayIdx && hourHover?.hour === h - 1));
                  const dashedTop = cellIsHovered || prevCellHovered;
                  const dashColor =
                    "color-mix(in oklab, var(--accent) 35%, transparent)";
                  return (
                    <div
                      key={h}
                      className="relative flex transition-colors"
                      style={{
                        height: HOUR_HEIGHT,
                        borderTopWidth: 1,
                        borderTopStyle: dashedTop ? "dashed" : "solid",
                        borderTopColor: dashedTop ? dashColor : "var(--border)",
                        backgroundColor: cellIsHovered
                          ? "color-mix(in oklab, var(--accent) 5%, transparent)"
                          : "transparent",
                        zIndex: cellIsHovered ? 2 : undefined,
                      }}
                    >
                      {/* Quick task zone container (left 50%) — sized to actual free slot */}
                      <div className="relative w-1/2 shrink-0">
                        {hasFree && (
                          <div
                            className="absolute inset-x-0 cursor-pointer transition-colors"
                            style={{
                              top: (free.start / 60) * HOUR_HEIGHT,
                              height: (free.duration / 60) * HOUR_HEIGHT,
                              backgroundColor: isHourHovered
                                ? "color-mix(in oklab, var(--accent) 12%, transparent)"
                                : "transparent",
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => openHourEditor(dayIdx, h)}
                            onMouseEnter={() => setHourHover({ dayIdx, hour: h })}
                            onMouseLeave={() => setHourHover(null)}
                            aria-label={`${freeLabel} reja qo'shish`}
                          >
                            {isHourHovered && (
                              <span className="absolute inset-0 grid place-items-center font-mono text-[10px] font-semibold tabular-nums text-accent-ink">
                                {freeLabel}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 15-min zone (right) */}
                      <div
                        className="relative flex-1 cursor-pointer transition-colors"
                        onMouseDown={(e) => handleSlotMouseDown(dayIdx, h, e)}
                        onMouseMove={(e) => handleSlotMove(dayIdx, h, e)}
                        onMouseLeave={() => setHover(null)}
                      >
                        {showSubdivisions && (
                          <>
                            <div
                              className="pointer-events-none absolute inset-x-0"
                              style={{
                                top: HOUR_HEIGHT / 4,
                                height: 0,
                                borderTop: "1px dashed var(--accent)",
                                opacity: 0.35,
                              }}
                            />
                            <div
                              className="pointer-events-none absolute inset-x-0"
                              style={{
                                top: HOUR_HEIGHT / 2,
                                height: 0,
                                borderTop: "1px dashed var(--accent)",
                                opacity: 0.35,
                              }}
                            />
                            <div
                              className="pointer-events-none absolute inset-x-0"
                              style={{
                                top: (3 * HOUR_HEIGHT) / 4,
                                height: 0,
                                borderTop: "1px dashed var(--accent)",
                                opacity: 0.35,
                              }}
                            />
                          </>
                        )}
                        {isHovered && hoveredMinute !== null && !drag && (
                          <>
                            <div
                              className="pointer-events-none absolute inset-x-0"
                              style={{
                                top: (hoveredMinute / 60) * HOUR_HEIGHT,
                                height: HOUR_HEIGHT / 4,
                                backgroundColor:
                                  "color-mix(in oklab, var(--accent) 12%, transparent)",
                              }}
                            />
                            <span
                              className="pointer-events-none absolute left-1 z-10 rounded bg-foreground px-1 py-px font-mono text-[9px] tabular-nums text-background shadow-sm"
                              style={{ top: (hoveredMinute / 60) * HOUR_HEIGHT + 2 }}
                            >
                              {String(h).padStart(2, "0")}:{String(hoveredMinute).padStart(2, "0")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Overlays: tasks, drag preview, editor, current time */}
                <div className="pointer-events-none absolute inset-0">
                  {/* Existing tasks */}
                  {dayPlans.map((p) => {
                    const [h, m] = p.time!.split(":").map(Number);
                    if (h < START_HOUR || h > END_HOUR) return null;
                    const top = ((h - START_HOUR) * 60 + m) * (HOUR_HEIGHT / 60);
                    const dur = p.duration ?? 60;
                    const heightPx = (dur / 60) * HOUR_HEIGHT;
                    const done = p.status === "DONE";
                    const tiny = heightPx < 24;     // 15-min
                    const compact = heightPx < 42;  // < 45-min (single-line)
                    const pc = priorityClasses(p.priority, done);
                    const isDraggingThis = draggingId === p.id;
                    return (
                      <div
                        key={p.id}
                        title={p.title}
                        draggable
                        onDragStart={(e) => handleTaskDragStart(e, p.id)}
                        onDragEnd={handleTaskDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailId(p.id);
                        }}
                        className={cn(
                          "group pointer-events-auto absolute left-1 right-1 cursor-pointer overflow-hidden rounded border border-l-2 transition-all hover:z-20 hover:overflow-visible hover:shadow-md",
                          tiny ? "px-1 py-px" : compact ? "px-1.5 py-0.5" : "px-1.5 py-1",
                          pc.border,
                          pc.bg,
                          done && "opacity-70",
                          isDraggingThis && "opacity-40"
                        )}
                        style={{ top, height: heightPx }}
                      >
                        <div className={cn("flex h-full", compact ? "items-center gap-1" : "items-start gap-1.5")}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggle(p.id);
                            }}
                            aria-label="Holatni o'zgartirish"
                            className={cn(
                              "grid shrink-0 place-items-center rounded-sm border transition-all",
                              tiny ? "size-[10px]" : "size-[12px]",
                              !compact && "mt-0.5",
                              done ? "border-accent bg-accent" : "border-border-strong hover:border-accent"
                            )}
                          >
                            {done && <Check className={cn(tiny ? "size-[7px]" : "size-2", "text-background")} strokeWidth={4} />}
                          </button>
                          <div className="min-w-0 flex-1 leading-tight">
                            <p
                              className={cn(
                                "break-words font-medium",
                                tiny
                                  ? "truncate text-[10px] leading-[1.1]"
                                  : compact
                                  ? "truncate text-[11px] leading-[1.2]"
                                  : "line-clamp-2 text-[11px] leading-[1.25] group-hover:line-clamp-none",
                                done && "line-through"
                              )}
                            >
                              {p.title}
                            </p>
                            {!compact && (
                              <p className={cn("mt-0.5 font-mono text-[9px] tabular-nums", done ? "text-faint" : "text-accent-ink")}>
                                {p.time}
                                {p.duration ? ` · ${p.duration}m` : ""}
                              </p>
                            )}
                          </div>
                          {/* Priority picker — visible on hover (or always if priority set) */}
                          {onUpdate && (
                            <div className={cn(
                              "shrink-0 transition-opacity",
                              !p.priority && "opacity-0 group-hover:opacity-100"
                            )}>
                              <PriorityPicker
                                value={p.priority}
                                onChange={(next) => onUpdate(p.id, { priority: next })}
                                size={tiny ? "xs" : "sm"}
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemove(p.id);
                            }}
                            aria-label="O'chirish"
                            className="shrink-0 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                          >
                            <X className={cn(tiny ? "size-[10px]" : "size-2.5", "text-faint")} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Drop preview during task drag-and-drop */}
                  {draggingId && dropTarget && dropTarget.dayIdx === dayIdx && (() => {
                    const draggedPlan = plans.find((p) => p.id === draggingId);
                    const dur = draggedPlan?.duration ?? 60;
                    const blocked = isDropBlocked(dayIdx, dropTarget.minuteFromStart, draggingId);
                    return (
                      <div
                        className={cn(
                          "pointer-events-none absolute left-1 right-1 z-15 rounded border-2 border-dashed",
                          blocked
                            ? "border-danger bg-danger/10"
                            : "border-accent bg-accent/10"
                        )}
                        style={{
                          top: (dropTarget.minuteFromStart / 60) * HOUR_HEIGHT,
                          height: (dur / 60) * HOUR_HEIGHT,
                        }}
                      >
                        <span
                          className={cn(
                            "absolute left-1 top-1 rounded px-1 py-px font-mono text-[9px] tabular-nums shadow-sm",
                            blocked
                              ? "bg-danger text-white"
                              : "bg-foreground text-background"
                          )}
                        >
                          {blocked
                            ? "Bo'sh emas"
                            : `${String(Math.floor(dropTarget.minuteFromStart / 60) + START_HOUR).padStart(2, "0")}:${String(dropTarget.minuteFromStart % 60).padStart(2, "0")}`}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Drag preview */}
                  {dragInThisDay && (
                    <div
                      className="pointer-events-none absolute left-1 right-1 z-15 overflow-hidden rounded border-l-2 border-accent bg-accent/15 ring-1 ring-accent/30"
                      style={{
                        top: (dragStartMin / 60) * HOUR_HEIGHT,
                        height: (dragDuration / 60) * HOUR_HEIGHT,
                      }}
                    >
                      {/* 15-min internal segment dividers */}
                      {Array.from({ length: Math.max(0, dragDuration / SNAP - 1) }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute inset-x-0 border-t border-dashed border-accent/40"
                          style={{ top: ((i + 1) * SNAP / 60) * HOUR_HEIGHT }}
                        />
                      ))}
                      <span className="absolute right-1 top-1 rounded bg-foreground px-1 py-px font-mono text-[9px] tabular-nums text-background shadow-sm">
                        {Math.floor(dragDuration / 60) > 0 && `${Math.floor(dragDuration / 60)}s `}
                        {dragDuration % 60 > 0 && `${dragDuration % 60}d`}
                      </span>
                      <span className="absolute left-1 top-1 rounded bg-foreground px-1 py-px font-mono text-[9px] tabular-nums text-background shadow-sm">
                        {String(Math.floor(dragStartMin / 60) + START_HOUR).padStart(2, "0")}:
                        {String(dragStartMin % 60).padStart(2, "0")}
                        {" – "}
                        {String(Math.floor((dragStartMin + dragDuration) / 60) + START_HOUR).padStart(2, "0")}:
                        {String((dragStartMin + dragDuration) % 60).padStart(2, "0")}
                      </span>
                    </div>
                  )}

                  {/* Editor */}
                  {editing && editing.dayIdx === dayIdx && (() => {
                    const editH = (editing.duration / 60) * HOUR_HEIGHT;
                    const eTiny = editH < 24;
                    const eCompact = editH < 42;
                    return (
                      <div
                        className={cn(
                          "pointer-events-auto absolute left-1 right-1 z-20 overflow-hidden rounded border-l-2 border-accent bg-accent-soft shadow-md ring-1 ring-accent/30",
                          eTiny ? "px-1 py-px" : "px-1.5 py-0.5"
                        )}
                        style={{
                          top: ((editing.hour - START_HOUR) * 60 + editing.minute) * (HOUR_HEIGHT / 60),
                          height: editH,
                        }}
                      >
                        <div className="flex h-full items-center gap-1">
                          {!eTiny && (
                            <span className="shrink-0 font-mono text-[9px] tabular-nums text-accent-ink">
                              {String(editing.hour).padStart(2, "0")}:{String(editing.minute).padStart(2, "0")}
                              {!eCompact && (
                                <>
                                  {" · "}
                                  {editing.duration >= 60
                                    ? `${Math.floor(editing.duration / 60)}s${editing.duration % 60 ? ` ${editing.duration % 60}d` : ""}`
                                    : `${editing.duration}d`}
                                </>
                              )}
                            </span>
                          )}
                          <input
                            ref={inputRef}
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commit();
                              if (e.key === "Escape") cancel();
                            }}
                            onBlur={commit}
                            placeholder="Nomi…"
                            className={cn(
                              "min-w-0 flex-1 bg-transparent placeholder:text-faint focus:outline-none",
                              eTiny ? "text-[10px] leading-[1.1]" : "text-[11px] leading-[1.2]"
                            )}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Current time line */}
                  {isToday && currentTimeY > 0 && currentTimeY < MAX_MIN * (HOUR_HEIGHT / 60) && (
                    <div
                      className="pointer-events-none absolute -left-1 right-0 z-10"
                      style={{ top: currentTimeY }}
                    >
                      <div className="flex items-center">
                        <div className="size-1.5 rounded-full bg-current-time/70" />
                        <div className="h-px flex-1 bg-current-time/50" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      <TaskDetail
        plan={detailPlan}
        plans={plans}
        open={!!detailPlan}
        onClose={() => setDetailId(null)}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />

      <ConfirmDialog
        open={!!clearDayInfo && clearDayInfo.count > 0}
        title="Kun rejalarini tozalash"
        description={
          clearDayInfo
            ? `${clearDayInfo.label} kunidagi ${clearDayInfo.count} ta reja o'chiriladi. Bu amalni qaytarib bo'lmaydi.`
            : undefined
        }
        confirmLabel="Tozalash"
        cancelLabel="Bekor"
        destructive
        onConfirm={() => {
          if (clearDayInfo && onRemoveMany) onRemoveMany(clearDayInfo.ids);
          setClearDayIdx(null);
        }}
        onClose={() => setClearDayIdx(null)}
      />

    </div>
  );
}
