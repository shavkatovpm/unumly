"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Clock, Pencil, X } from "lucide-react";
import type { Plan, PlanPriority } from "@/lib/types";
import type { CreatePlanInput } from "@/lib/plans-store";
import { cn } from "@/lib/utils";
import { isSameDay, toDateInputValue } from "@/lib/dates";
import { TaskDetail } from "@/components/app/widgets/task-detail";

function priorityClasses(p: PlanPriority | undefined, done: boolean) {
  if (done) return { border: "border-border-strong", bg: "bg-subtle/80 hover:bg-subtle" };
  if (p === "HIGH")   return { border: "border-priority-high",   bg: "bg-priority-high-soft hover:bg-priority-high-soft" };
  if (p === "MEDIUM") return { border: "border-priority-medium", bg: "bg-priority-medium-soft hover:bg-priority-medium-soft" };
  if (p === "LOW")    return { border: "border-priority-low",    bg: "bg-priority-low-soft hover:bg-priority-low-soft" };
  // No priority — neutral gray
  return { border: "border-border-strong", bg: "bg-subtle/60 hover:bg-subtle" };
}

const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_HEIGHT = 56;
const SNAP = 15;
const TOTAL_HOURS = END_HOUR - START_HOUR + 1;
const MAX_MIN = TOTAL_HOURS * 60;

type Editing = {
  hour: number;
  minute: number;
  duration: number; // minutes
};

type Drag = {
  anchorMin: number;  // minutes from START_HOUR at mousedown
  currentMin: number; // minutes from START_HOUR currently
  moved: boolean;
};

export function DayGrid({
  date,
  plans,
  onCreate,
  onToggle,
  onRemove,
  onUpdate,
}: {
  date: Date;
  plans: Plan[];
  onCreate: (input: CreatePlanInput) => string;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Plan>) => void;
}) {
  const isoDate = toDateInputValue(date);
  const dayPlans = plans.filter(
    (p) => p.scope === "DAILY" && p.scheduledFor === isoDate
  );
  // Only ACTIVE tasks render on the grid / untimed section.
  // Completed tasks are collapsed into a separate "Bajarilgan" dropdown.
  const activePlans = dayPlans.filter((p) => p.status !== "DONE");
  const completedPlans = dayPlans.filter((p) => p.status === "DONE");
  const timed = activePlans.filter((p) => p.time);
  const untimed = activePlans.filter((p) => !p.time);
  const [showCompleted, setShowCompleted] = useState(false);

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const showCurrentTime = !!now && isSameDay(now, date);
  const currentMin = now ? (now.getHours() - START_HOUR) * 60 + now.getMinutes() : -1;
  const currentTimeY = showCurrentTime
    ? (currentMin * HOUR_HEIGHT) / 60
    : -1;

  const [editing, setEditing] = useState<Editing | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [hover, setHover] = useState<{ hour: number; minute: number } | null>(null);
  const [hourHover, setHourHover] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailPlan = detailId ? plans.find((p) => p.id === detailId) ?? null : null;
  const dragRef = useRef<Drag | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Mobile detection — switches the inline editor for a centered modal
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Track keyboard height so the bottom-nav (and other UI) can react.
  // Only active while the mobile modal is open.
  useEffect(() => {
    if (!isMobile || !editing) return;
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    let rafId = 0;
    let stopAt = 0;
    function tick() {
      if (!vv) return;
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--kb-inset", `${inset}px`);
      if (performance.now() < stopAt) rafId = requestAnimationFrame(tick);
    }
    function poll() {
      stopAt = performance.now() + 700;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    }
    poll();
    vv.addEventListener("resize", poll);
    vv.addEventListener("scroll", poll);
    return () => {
      cancelAnimationFrame(rafId);
      vv.removeEventListener("resize", poll);
      vv.removeEventListener("scroll", poll);
      document.documentElement.style.setProperty("--kb-inset", "0px");
    };
  }, [isMobile, editing]);

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

      if (isPastTime(hour * 60 + minute)) {
        setDrag(null);
        return;
      }

      // Reject/shrink if the drag range overlaps any existing task
      const startAbsMin = hour * 60 + minute;
      let safeDuration = duration;
      for (const p of plans) {
        if (p.scope !== "DAILY" || p.scheduledFor !== isoDate || !p.time) continue;
        const [ph, pm] = p.time.split(":").map(Number);
        const ts = ph * 60 + pm;
        const te = ts + (p.duration ?? 60);
        if (ts >= startAbsMin && ts < startAbsMin + safeDuration) {
          safeDuration = ts - startAbsMin;
        } else if (te > startAbsMin && ts < startAbsMin) {
          safeDuration = 0;
        }
      }
      if (safeDuration < SNAP) {
        setDrag(null);
        return;
      }

      setEditing({ hour, minute, duration: safeDuration });
      setEditingTitle("");
      setDrag(null);
    }
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [now, isoDate, plans]);

  function isSlotOccupied(slotAbsMin: number): boolean {
    const slotEnd = slotAbsMin + SNAP;
    for (const p of plans) {
      if (p.scope !== "DAILY" || p.scheduledFor !== isoDate || !p.time) continue;
      const [ph, pm] = p.time.split(":").map(Number);
      const ts = ph * 60 + pm;
      const te = ts + (p.duration ?? 60);
      if (ts < slotEnd && te > slotAbsMin) return true;
    }
    return false;
  }

  function isPastTime(absMin: number): boolean {
    if (!now) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = toDateInputValue(today);
    if (isoDate < todayIso) return true;
    if (isoDate > todayIso) return false;
    const currentAbsMin = now.getHours() * 60 + now.getMinutes();
    return absMin < currentAbsMin;
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
      const time = `${String(editing.hour).padStart(2, "0")}:${String(editing.minute).padStart(2, "0")}`;
      onCreate({
        title: editingTitle.trim(),
        scope: "DAILY",
        scheduledFor: isoDate,
        time,
        duration: editing.duration,

      });
    }
    setEditing(null);
    setEditingTitle("");
  }

  function handleSlotMouseDown(hour: number, e: React.MouseEvent<HTMLDivElement>) {
    const minute = calcMinuteInCell(e);
    if (isPastTime(hour * 60 + minute)) return;
    if (isSlotOccupied(hour * 60 + minute)) return;
    // If an editor is open, close it (saving any typed title) before starting new select
    flushPendingEditor();
    e.preventDefault();
    const t = totalMin(hour, minute);
    setDrag({ anchorMin: t, currentMin: t, moved: false });
  }

  function largestFreeInHour(hour: number): { start: number; duration: number } {
    const hourStartAbs = hour * 60;
    const hourEndAbs = hourStartAbs + 60;

    const occupied: Array<[number, number]> = [];

    // Treat past time as occupied
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = toDateInputValue(today);
    if (isoDate < todayIso) {
      occupied.push([0, 60]);
    } else if (isoDate === todayIso && now) {
      const currentAbsMin = now.getHours() * 60 + now.getMinutes();
      if (currentAbsMin >= hourEndAbs) {
        occupied.push([0, 60]);
      } else if (currentAbsMin > hourStartAbs) {
        occupied.push([0, currentAbsMin - hourStartAbs]);
      }
    }

    for (const p of plans) {
      if (p.scope !== "DAILY" || p.scheduledFor !== isoDate || !p.time) continue;
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

  function openHourEditor(hour: number) {
    const { start, duration } = largestFreeInHour(hour);
    if (duration < SNAP) return;
    flushPendingEditor();
    setEditing({ hour, minute: start, duration });
    setEditingTitle("");
    setHourHover(null);
  }

  function handleSlotMove(hour: number, e: React.MouseEvent<HTMLDivElement>) {
    const minute = calcMinuteInCell(e);

    const slotBlocked =
      isPastTime(hour * 60 + minute) || isSlotOccupied(hour * 60 + minute);

    if (slotBlocked) {
      if (hover) setHover(null);
    } else if (hover?.hour !== hour || hover?.minute !== minute) {
      setHover({ hour, minute });
    }

    if (drag) {
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
      const time = `${String(editing.hour).padStart(2, "0")}:${String(editing.minute).padStart(2, "0")}`;
      onCreate({
        title: editingTitle.trim(),
        scope: "DAILY",
        scheduledFor: isoDate,
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

  const isDragging = !!drag;
  const dragMoved = isDragging && drag.moved;
  const dragStartMin = dragMoved ? Math.min(drag.anchorMin, drag.currentMin) : 0;
  const dragEndMin = dragMoved ? Math.max(drag.anchorMin, drag.currentMin) + SNAP : 0;
  const dragDuration = dragEndMin - dragStartMin;
  const dragCoverStart = isDragging ? Math.min(drag.anchorMin, drag.currentMin) : -1;
  const dragCoverEnd = isDragging ? Math.max(drag.anchorMin, drag.currentMin) + SNAP : -1;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
      {/* Untimed section */}
      {untimed.length > 0 && (
        <section className="border-b border-border bg-subtle/30">
          <header className="flex items-center justify-between px-3 py-1.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-faint">
              Vaqtsiz
            </p>
            <p className="font-mono text-[10px] tabular-nums text-faint">{untimed.length}</p>
          </header>
          <ul className="divide-y divide-border/70">
            {untimed.map((p) => {
              const done = p.status === "DONE";
              return (
                <li
                  key={p.id}
                  onClick={() => setDetailId(p.id)}
                  className="group flex cursor-pointer items-center gap-2.5 px-3 py-1.5 transition-colors hover:bg-hover/60"
                >
                  <span
                    className={cn(
                      "flex-1 truncate text-[12.5px]",
                      done && "text-faint line-through"
                    )}
                  >
                    {p.title}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(p.id);
                    }}
                    aria-label={done ? "Bekor qilish" : "Bajarildi"}
                    className={cn(
                      "grid size-[16px] shrink-0 place-items-center rounded border transition-all",
                      done
                        ? "border-accent bg-accent"
                        : "border-border-strong hover:border-accent"
                    )}
                  >
                    {done && <Check className="size-2 text-background" strokeWidth={4} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Time grid */}
      <div className="relative select-none pt-3">
        <div className="grid" style={{ gridTemplateColumns: "56px 1fr" }}>
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

          {/* Day column */}
          <div className="relative border-l border-border">
            {/* Past-time stripes overlay */}
            {(() => {
              const todayD = new Date();
              todayD.setHours(0, 0, 0, 0);
              const todayIso = toDateInputValue(todayD);
              const fullDayHeight = MAX_MIN * (HOUR_HEIGHT / 60);
              let pastHeightPx = 0;
              if (isoDate < todayIso) {
                pastHeightPx = fullDayHeight;
              } else if (isoDate === todayIso && now) {
                const curAbsMin = now.getHours() * 60 + now.getMinutes();
                const startAbsMin = START_HOUR * 60;
                if (curAbsMin > startAbsMin) {
                  pastHeightPx = Math.min(fullDayHeight, (curAbsMin - startAbsMin) * (HOUR_HEIGHT / 60));
                }
              }
              if (pastHeightPx <= 0) return null;
              return (
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 z-[1] bg-[repeating-linear-gradient(135deg,transparent_0,transparent_5px,var(--border)_5px,var(--border)_6px)] opacity-50"
                  style={{ height: pastHeightPx }}
                />
              );
            })()}
            {hours.map((h) => {
              const isHovered = hover?.hour === h;
              const hoveredMinute = isHovered ? hover.minute : null;
              const hourStartMin = (h - START_HOUR) * 60;
              const hourEndMin = hourStartMin + 60;
              const cellInDrag =
                isDragging && hourStartMin < dragCoverEnd && hourEndMin > dragCoverStart;
              const isHourHovered = hourHover === h && !drag;
              const showSubdivisions =
                ((isHovered || isHourHovered) && !drag) || cellInDrag;
              const free = largestFreeInHour(h);
              const hasFree = free.duration > SNAP;
              const freeLabel =
                free.duration >= 60 ? "1s" : `${free.duration}m`;
              const cellIsHovered = (isHovered || isHourHovered) && !drag;
              const prevCellHovered =
                !drag &&
                ((hover?.hour === h - 1) || (hourHover === h - 1));
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
                        onClick={() => openHourEditor(h)}
                        onMouseEnter={() => setHourHover(h)}
                        onMouseLeave={() => setHourHover(null)}
                        aria-label={`${freeLabel} reja qo'shish`}
                      >
                        {isHourHovered && (
                          <span className="absolute inset-0 grid place-items-center font-mono text-[11px] font-semibold tabular-nums text-accent-ink">
                            {freeLabel}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 15-min zone (right) */}
                  <div
                    className="relative flex-1 cursor-pointer transition-colors"
                    onMouseDown={(e) => handleSlotMouseDown(h, e)}
                    onMouseMove={(e) => handleSlotMove(h, e)}
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
                          className="pointer-events-none absolute left-2 z-10 rounded bg-foreground px-1 py-px font-mono text-[9px] tabular-nums text-background shadow-sm"
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

            {/* Overlays */}
            <div className="pointer-events-none absolute inset-0">
              {/* Existing tasks */}
              {timed.map((p) => {
                const [h, m] = p.time!.split(":").map(Number);
                if (h < START_HOUR || h > END_HOUR) return null;
                const top = ((h - START_HOUR) * 60 + m) * (HOUR_HEIGHT / 60);
                const dur = p.duration ?? 60;
                const heightPx = (dur / 60) * HOUR_HEIGHT;
                const done = p.status === "DONE";
                const tiny = heightPx < 24;
                const compact = heightPx < 42;
                const pc = priorityClasses(p.priority, done);
                return (
                  <div
                    key={p.id}
                    title={p.title}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailId(p.id);
                    }}
                    className={cn(
                      "group pointer-events-auto absolute left-2 right-2 cursor-pointer overflow-hidden rounded border border-l-2 transition-all hover:z-20 hover:overflow-visible hover:shadow-md",
                      tiny ? "px-1.5 py-px" : compact ? "px-2 py-0.5" : "px-2 py-1",
                      pc.border,
                      pc.bg,
                      done && "opacity-70"
                    )}
                    style={{ top, height: heightPx }}
                  >
                    <div className={cn("flex h-full", compact ? "items-center gap-1.5" : "items-start gap-2")}>
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
                          tiny ? "size-[11px]" : "size-[13px]",
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
                              ? "truncate text-[11px] leading-[1.15]"
                              : compact
                              ? "truncate text-[12px] leading-[1.2]"
                              : "line-clamp-2 text-[12.5px] leading-[1.25] group-hover:line-clamp-none",
                            done && "line-through"
                          )}
                        >
                          {p.title}
                        </p>
                        {!compact && (
                          <p className={cn("mt-0.5 font-mono text-[10px] tabular-nums", done ? "text-faint" : "text-accent-ink")}>
                            {p.time}
                            {p.duration ? ` · ${p.duration}m` : ""}
                          </p>
                        )}
                      </div>
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

              {/* Drag preview */}
              {dragMoved && (
                <div
                  className="pointer-events-none absolute left-2 right-2 z-15 overflow-hidden rounded border-l-2 border-accent bg-accent/15 ring-1 ring-accent/30"
                  style={{
                    top: (dragStartMin / 60) * HOUR_HEIGHT,
                    height: (dragDuration / 60) * HOUR_HEIGHT,
                  }}
                >
                  {Array.from({ length: Math.max(0, dragDuration / SNAP - 1) }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute inset-x-0 border-t border-dashed border-accent/40"
                      style={{ top: ((i + 1) * SNAP / 60) * HOUR_HEIGHT }}
                    />
                  ))}
                  <span className="absolute right-1.5 top-1 rounded bg-foreground px-1 py-px font-mono text-[10px] tabular-nums text-background shadow-sm">
                    {Math.floor(dragDuration / 60) > 0 && `${Math.floor(dragDuration / 60)}s `}
                    {dragDuration % 60 > 0 && `${dragDuration % 60}d`}
                  </span>
                  <span className="absolute left-1.5 top-1 rounded bg-foreground px-1 py-px font-mono text-[10px] tabular-nums text-background shadow-sm">
                    {String(Math.floor(dragStartMin / 60) + START_HOUR).padStart(2, "0")}:
                    {String(dragStartMin % 60).padStart(2, "0")}
                    {" – "}
                    {String(Math.floor((dragStartMin + dragDuration) / 60) + START_HOUR).padStart(2, "0")}:
                    {String((dragStartMin + dragDuration) % 60).padStart(2, "0")}
                  </span>
                </div>
              )}

              {/* Editor — desktop inline only; mobile uses centered modal below */}
              {!isMobile && editing && (() => {
                const editH = (editing.duration / 60) * HOUR_HEIGHT;
                const eTiny = editH < 24;
                const eCompact = editH < 42;
                return (
                  <div
                    className={cn(
                      "pointer-events-auto absolute left-2 right-2 z-20 overflow-hidden rounded border-l-2 border-accent bg-accent-soft shadow-md ring-1 ring-accent/30",
                      eTiny ? "px-1.5 py-px" : "px-2 py-0.5"
                    )}
                    style={{
                      top: ((editing.hour - START_HOUR) * 60 + editing.minute) * (HOUR_HEIGHT / 60),
                      height: editH,
                    }}
                  >
                    <div className="flex h-full items-center gap-1.5">
                      {!eTiny && (
                        <span className="shrink-0 font-mono text-[10px] tabular-nums text-accent-ink">
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
                          eTiny ? "text-[11px] leading-[1.15]" : "text-[12px] leading-[1.2]"
                        )}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Current time line */}
              {showCurrentTime && currentTimeY > 0 && currentTimeY < MAX_MIN * (HOUR_HEIGHT / 60) && (
                <div
                  className="pointer-events-none absolute -left-1 right-0 z-10"
                  style={{ top: currentTimeY }}
                >
                  <div className="flex items-center">
                    <div className="size-2 rounded-full bg-current-time/70 shadow-[0_0_0_3px_color-mix(in_oklch,var(--current-time)_18%,transparent)]" />
                    <div className="h-px flex-1 bg-current-time/50" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bajarilgan dropdown — all completed tasks for this day */}
      {completedPlans.length > 0 && (
        <section className="mt-3 overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className={cn(
              "flex w-full items-center justify-between bg-subtle/30 px-3 py-1.5 transition-colors hover:bg-subtle/60",
              showCompleted && "border-b border-border"
            )}
            aria-expanded={showCompleted}
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
              {completedPlans.length}
            </p>
          </button>
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ gridTemplateRows: showCompleted ? "1fr" : "0fr" }}
          >
            <ul className="divide-y divide-border/70 overflow-hidden">
              {completedPlans
                .slice()
                .sort((a, b) => (a.time ?? "z").localeCompare(b.time ?? "z"))
                .map((p) => (
                  <li
                    key={p.id}
                    onClick={() => setDetailId(p.id)}
                    className="group fade-in flex cursor-pointer items-center gap-3 bg-subtle/30 px-3 py-2 transition-colors hover:bg-hover/60"
                  >
                    {p.time ? (
                      <span className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-faint">
                        <Clock className="size-2.5" />
                        {p.time}
                      </span>
                    ) : (
                      <span className="w-[58px] shrink-0 text-center font-mono text-[10.5px] text-faint">
                        vaqtsiz
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-faint line-through">
                      {p.title}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggle(p.id);
                      }}
                      aria-label="Bekor qilish"
                      className="grid size-[18px] shrink-0 place-items-center rounded-md border border-accent bg-accent"
                    >
                      <Check className="size-2.5 text-background" strokeWidth={4} />
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </section>
      )}

      <TaskDetail
        plan={detailPlan}
        plans={plans}
        open={!!detailPlan}
        onClose={() => setDetailId(null)}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />

      {/* Mobile centered task-create modal — replaces the inline hour editor */}
      <AnimatePresence>
        {isMobile && editing && (() => {
          const editTime = `${String(editing.hour).padStart(2, "0")}:${String(editing.minute).padStart(2, "0")}`;
          const dur = editing.duration;
          const durLabel =
            dur >= 60
              ? `${Math.floor(dur / 60)}s${dur % 60 ? ` ${dur % 60}d` : ""}`
              : `${dur}d`;

          function submitMobile(e: React.FormEvent<HTMLFormElement>) {
            e.preventDefault();
            commit();
          }

          function openDetailFromEditor() {
            if (!editing) return;
            const titleVal = editingTitle.trim() || "Yangi reja";
            const newId = onCreate({
              title: titleVal,
              scope: "DAILY",
              scheduledFor: isoDate,
              time: editTime,
              duration: editing.duration,
            });
            setEditing(null);
            setEditingTitle("");
            setDetailId(newId);
          }

          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={cancel}
                className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[3px] md:hidden"
              />
              <div
                className="fixed inset-0 z-50 flex items-start justify-center px-4 md:hidden"
                style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 4rem)" }}
                onClick={cancel}
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
                      onClick={cancel}
                      aria-label="Yopish"
                      className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </header>
                  <form onSubmit={submitMobile} className="space-y-3 px-5 py-4">
                    <input
                      ref={inputRef}
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      placeholder="Reja nomi…"
                      autoFocus
                      className="w-full bg-transparent text-[17px] placeholder:text-faint focus:outline-none"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-[13px] tabular-nums text-foreground">
                          <Clock className="size-3.5 text-faint" />
                          {editTime}
                          <span className="text-[11px] text-faint">· {durLabel}</span>
                        </span>
                        <button
                          type="button"
                          onClick={openDetailFromEditor}
                          className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:border-border-strong hover:text-foreground"
                        >
                          <Pencil className="size-3.5" />
                          Batafsil
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={!editingTitle.trim()}
                        className={cn(
                          "rounded-md px-4 py-2 text-[13.5px] font-medium transition-opacity",
                          !editingTitle.trim()
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
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
