"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import type { Plan } from "@/lib/types";
import type { CreatePlanInput } from "@/lib/plans-store";
import { cn } from "@/lib/utils";
import { isSameDay, toDateInputValue } from "@/lib/dates";

const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_HEIGHT = 56;
const SNAP_MINUTES = 15;

export function DayGrid({
  date,
  plans,
  onCreate,
  onToggle,
  onRemove,
}: {
  date: Date;
  plans: Plan[];
  onCreate: (input: CreatePlanInput) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const isoDate = toDateInputValue(date);
  const dayPlans = plans.filter(
    (p) => p.scope === "DAILY" && p.scheduledFor === isoDate
  );
  const timed = dayPlans.filter((p) => p.time);
  const untimed = dayPlans.filter((p) => !p.time);

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

  // Editing state
  const [editing, setEditing] = useState<{ hour: number; minute: number } | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleSlotClick(hour: number, e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawMin = (y / HOUR_HEIGHT) * 60;
    const minute = Math.max(0, Math.min(45, Math.floor(rawMin / SNAP_MINUTES) * SNAP_MINUTES));
    setEditing({ hour, minute });
    setEditingTitle("");
  }

  function commit() {
    if (editing && editingTitle.trim()) {
      const time = `${String(editing.hour).padStart(2, "0")}:${String(editing.minute).padStart(2, "0")}`;
      onCreate({
        title: editingTitle.trim(),
        scope: "DAILY",
        scheduledFor: isoDate,
        time,
      });
    }
    setEditing(null);
    setEditingTitle("");
  }

  function cancel() {
    setEditing(null);
    setEditingTitle("");
  }

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

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
                  className="group flex items-center gap-2.5 px-3 py-1.5 transition-colors hover:bg-hover/60"
                >
                  <button
                    type="button"
                    onClick={() => onToggle(p.id)}
                    aria-label={done ? "Bekor qilish" : "Bajarildi"}
                    className={cn(
                      "grid size-[16px] shrink-0 place-items-center rounded border transition-all",
                      done
                        ? "border-accent bg-accent"
                        : "border-border-strong hover:border-accent"
                    )}
                  >
                    {done && <Check className="size-2 text-white" strokeWidth={4} />}
                  </button>
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
                    onClick={() => onRemove(p.id)}
                    aria-label="O'chirish"
                    className="grid size-5 place-items-center rounded text-faint opacity-0 transition-all hover:text-foreground group-hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Time grid */}
      <div className="relative pt-3">
        {hours.map((h) => (
          <div
            key={h}
            className="grid grid-cols-[56px_1fr] border-t border-border first:border-t-0"
            style={{ height: HOUR_HEIGHT }}
          >
            <div className="relative border-r border-border">
              <span className="absolute right-2 top-0 -translate-y-1/2 bg-surface px-1 font-mono text-[10px] tabular-nums text-faint">
                {String(h).padStart(2, "0")}:00
              </span>
            </div>
            <div
              className="relative cursor-pointer transition-colors hover:bg-hover/30"
              onClick={(e) => handleSlotClick(h, e)}
            />
          </div>
        ))}

        {/* Overlays: tasks, editing, current time */}
        <div className="pointer-events-none absolute inset-y-0 left-[56px] right-0">
          {timed.map((p) => {
            const [h, m] = p.time!.split(":").map(Number);
            if (h < START_HOUR || h > END_HOUR) return null;
            const top = ((h - START_HOUR) * 60 + m) * (HOUR_HEIGHT / 60);
            const done = p.status === "DONE";
            return (
              <div
                key={p.id}
                className={cn(
                  "pointer-events-auto absolute left-2 right-2 rounded-md border-l-2 px-2 py-1.5 backdrop-blur-sm transition-all",
                  done
                    ? "border-border-strong bg-subtle/80 opacity-70"
                    : "border-accent bg-accent-soft/80 hover:bg-accent-soft hover:shadow-sm"
                )}
                style={{ top, minHeight: 46 }}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => onToggle(p.id)}
                    aria-label={done ? "Bekor qilish" : "Bajarildi"}
                    className={cn(
                      "mt-px grid size-[14px] shrink-0 place-items-center rounded border transition-all",
                      done
                        ? "border-accent bg-accent"
                        : "border-border-strong hover:border-accent"
                    )}
                  >
                    {done && <Check className="size-2 text-white" strokeWidth={4} />}
                  </button>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p
                      className={cn(
                        "truncate text-[12px] font-medium",
                        done && "line-through"
                      )}
                    >
                      {p.title}
                    </p>
                    <p
                      className={cn(
                        "font-mono text-[10px] tabular-nums",
                        done ? "text-faint" : "text-accent-ink"
                      )}
                    >
                      {p.time}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(p.id)}
                    aria-label="O'chirish"
                    className="grid size-5 shrink-0 place-items-center rounded text-faint opacity-0 transition-all hover:text-foreground group-hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Inline editor */}
          {editing && (
            <div
              className="pointer-events-auto absolute left-2 right-2 rounded-md border-l-2 border-accent bg-accent-soft px-2 py-1.5 shadow-md ring-1 ring-accent/30"
              style={{
                top: ((editing.hour - START_HOUR) * 60 + editing.minute) * (HOUR_HEIGHT / 60),
                minHeight: 46,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-accent-ink">
                  {String(editing.hour).padStart(2, "0")}:
                  {String(editing.minute).padStart(2, "0")}
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
                  placeholder="Reja nomi…"
                  className="flex-1 bg-transparent text-[12px] placeholder:text-faint focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Current time line */}
          {showCurrentTime && currentTimeY > 0 && currentTimeY < hours.length * HOUR_HEIGHT && (
            <div
              className="pointer-events-none absolute -left-1 right-0 z-10"
              style={{ top: currentTimeY }}
            >
              <div className="flex items-center">
                <div className="size-2 rounded-full bg-danger shadow-[0_0_0_3px_var(--danger-soft)]" />
                <div className="h-px flex-1 bg-danger" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
