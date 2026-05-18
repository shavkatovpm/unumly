"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import type { Plan } from "@/lib/types";
import type { CreatePlanInput } from "@/lib/plans-store";
import { cn } from "@/lib/utils";
import {
  isSameDay,
  startOfWeek,
  toDateInputValue,
} from "@/lib/dates";

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
}: {
  date: Date;
  today: Date;
  plans: Plan[];
  onCreate: (input: CreatePlanInput) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
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
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

      if (!d.moved) {
        // pure click → single 15-min slot
        const hour = Math.floor(d.anchorMin / 60) + START_HOUR;
        const minute = d.anchorMin % 60;
        setEditing({ dayIdx: d.dayIdx, hour, minute, duration: SNAP });
      } else {
        // drag selection → multi-segment task
        const startMinTotal = Math.min(d.anchorMin, d.currentMin);
        const endMinTotal = Math.max(d.anchorMin, d.currentMin) + SNAP;
        const duration = endMinTotal - startMinTotal;
        const startHour = Math.floor(startMinTotal / 60) + START_HOUR;
        const startMinute = startMinTotal % 60;
        setEditing({
          dayIdx: d.dayIdx,
          hour: startHour,
          minute: startMinute,
          duration,
        });
      }
      setEditingTitle("");
      setDrag(null);
    }
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  function calcMinuteInCell(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawMin = (y / HOUR_HEIGHT) * 60;
    return Math.max(0, Math.min(45, Math.floor(rawMin / SNAP) * SNAP));
  }

  function totalMin(hour: number, minute: number) {
    return (hour - START_HOUR) * 60 + minute;
  }

  function handleSlotMouseDown(dayIdx: number, hour: number, e: React.MouseEvent<HTMLDivElement>) {
    if (editing) return; // don't start drag while editing
    e.preventDefault(); // avoid selecting text during drag
    const minute = calcMinuteInCell(e);
    const t = totalMin(hour, minute);
    setDrag({ dayIdx, anchorMin: t, currentMin: t, moved: false });
  }

  function handleSlotMove(dayIdx: number, hour: number, e: React.MouseEvent<HTMLDivElement>) {
    const minute = calcMinuteInCell(e);

    // hover preview
    if (hover?.dayIdx !== dayIdx || hover?.hour !== hour || hover?.minute !== minute) {
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
      <div className="flex-1 overflow-y-auto select-none">
        {/* Sticky header */}
        <div
          className="sticky top-0 z-30 grid border-b border-border bg-subtle/95 backdrop-blur"
          style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}
        >
          <div />
          {days.map((d, i) => {
            const isToday = isSameDay(d, today);
            return (
              <div
                key={i}
                className={cn(
                  "flex items-baseline justify-center gap-1.5 border-l border-border py-2",
                  i >= 5 && "bg-warm-soft/30"
                )}
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

            // Drag preview for this day column
            const dragInThisDay = drag && drag.dayIdx === dayIdx && drag.moved;
            const dragStartMin = dragInThisDay ? Math.min(drag.anchorMin, drag.currentMin) : 0;
            const dragEndMin = dragInThisDay ? Math.max(drag.anchorMin, drag.currentMin) + SNAP : 0;
            const dragDuration = dragEndMin - dragStartMin;

            return (
              <div key={dayIdx} className="relative border-l border-border">
                {hours.map((h) => {
                  const isHovered = hover?.dayIdx === dayIdx && hover?.hour === h;
                  const hoveredMinute = isHovered ? hover.minute : null;
                  const showSubdivisions = isHovered || (drag?.dayIdx === dayIdx);
                  return (
                    <div
                      key={h}
                      className="relative cursor-pointer border-t border-border transition-colors"
                      style={{ height: HOUR_HEIGHT }}
                      onMouseDown={(e) => handleSlotMouseDown(dayIdx, h, e)}
                      onMouseMove={(e) => handleSlotMove(dayIdx, h, e)}
                      onMouseLeave={() => setHover(null)}
                    >
                      {showSubdivisions && (
                        <>
                          {/* 15-min subdivision guides */}
                          <div
                            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-accent/30"
                            style={{ top: HOUR_HEIGHT / 4 }}
                          />
                          <div
                            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-accent/30"
                            style={{ top: HOUR_HEIGHT / 2 }}
                          />
                          <div
                            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-accent/30"
                            style={{ top: (3 * HOUR_HEIGHT) / 4 }}
                          />
                        </>
                      )}
                      {/* Hover highlight (only when not dragging) */}
                      {isHovered && hoveredMinute !== null && !drag && (
                        <>
                          <div
                            className="pointer-events-none absolute inset-x-0 bg-accent/12"
                            style={{
                              top: (hoveredMinute / 60) * HOUR_HEIGHT,
                              height: HOUR_HEIGHT / 4,
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
                    const heightPx = Math.max(30, (dur / 60) * HOUR_HEIGHT);
                    const done = p.status === "DONE";
                    return (
                      <div
                        key={p.id}
                        title={p.title}
                        className={cn(
                          "group pointer-events-auto absolute left-1 right-1 overflow-hidden rounded border-l-2 px-1.5 py-1 transition-all hover:z-20 hover:overflow-visible hover:shadow-md",
                          done
                            ? "border-border-strong bg-subtle/80 opacity-70 hover:bg-subtle"
                            : "border-accent bg-accent-soft hover:bg-accent-soft"
                        )}
                        style={{ top, height: heightPx }}
                      >
                        <div className="flex items-start gap-1.5">
                          <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => onToggle(p.id)}
                            aria-label="Holatni o'zgartirish"
                            className={cn(
                              "mt-0.5 grid size-[12px] shrink-0 place-items-center rounded-sm border transition-all",
                              done ? "border-accent bg-accent" : "border-border-strong hover:border-accent"
                            )}
                          >
                            {done && <Check className="size-2 text-white" strokeWidth={4} />}
                          </button>
                          <div className="min-w-0 flex-1 leading-tight">
                            <p
                              className={cn(
                                "break-words text-[11px] font-medium leading-[1.25]",
                                "line-clamp-2 group-hover:line-clamp-none",
                                done && "line-through"
                              )}
                            >
                              {p.title}
                            </p>
                            <p className={cn("mt-0.5 font-mono text-[9px] tabular-nums", done ? "text-faint" : "text-accent-ink")}>
                              {p.time}
                              {p.duration ? ` · ${p.duration}m` : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => onRemove(p.id)}
                            aria-label="O'chirish"
                            className="opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                          >
                            <X className="size-2.5 text-faint" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Drag preview */}
                  {dragInThisDay && (
                    <div
                      className="pointer-events-none absolute left-1 right-1 z-15 rounded border-l-2 border-accent bg-accent/15 ring-1 ring-accent/30"
                      style={{
                        top: (dragStartMin / 60) * HOUR_HEIGHT,
                        height: (dragDuration / 60) * HOUR_HEIGHT,
                      }}
                    >
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
                  {editing && editing.dayIdx === dayIdx && (
                    <div
                      className="pointer-events-auto absolute left-1 right-1 z-20 overflow-hidden rounded border-l-2 border-accent bg-accent-soft px-1.5 py-1 shadow-md ring-1 ring-accent/30"
                      style={{
                        top: ((editing.hour - START_HOUR) * 60 + editing.minute) * (HOUR_HEIGHT / 60),
                        height: Math.max(38, (editing.duration / 60) * HOUR_HEIGHT),
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="shrink-0 font-mono text-[9px] tabular-nums text-accent-ink">
                          {String(editing.hour).padStart(2, "0")}:{String(editing.minute).padStart(2, "0")}
                          {" · "}
                          {editing.duration >= 60
                            ? `${Math.floor(editing.duration / 60)}s${editing.duration % 60 ? ` ${editing.duration % 60}d` : ""}`
                            : `${editing.duration}d`}
                        </span>
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
                          className="min-w-0 flex-1 bg-transparent text-[11px] placeholder:text-faint focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Current time line */}
                  {isToday && currentTimeY > 0 && currentTimeY < MAX_MIN * (HOUR_HEIGHT / 60) && (
                    <div
                      className="pointer-events-none absolute -left-1 right-0 z-10"
                      style={{ top: currentTimeY }}
                    >
                      <div className="flex items-center">
                        <div className="size-1.5 rounded-full bg-danger" />
                        <div className="h-px flex-1 bg-danger" />
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
  );
}
