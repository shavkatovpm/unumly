"use client";

import { useMemo } from "react";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  getCalendarGrid,
  isSameDay,
  startOfMonth,
  toDateInputValue,
} from "@/lib/dates";

const WEEKDAYS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

export function OyView({
  date,
  today,
  plans,
  onSelectDate,
}: {
  date: Date;
  today: Date;
  plans: Plan[];
  onSelectDate: (d: Date) => void;
}) {
  const monthAnchor = startOfMonth(date);
  const grid = useMemo(() => getCalendarGrid(monthAnchor), [monthAnchor]);

  const byDate = useMemo(() => {
    const map = new Map<string, Plan[]>();
    for (const p of plans) {
      if (p.scope !== "DAILY") continue;
      const arr = map.get(p.scheduledFor) ?? [];
      arr.push(p);
      map.set(p.scheduledFor, arr);
    }
    // sort each day's plans
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        if (a.status !== b.status) return a.status === "DONE" ? 1 : -1;
        return (a.time ?? "z").localeCompare(b.time ?? "z");
      });
    }
    return map;
  }, [plans]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
      {/* Header */}
      <div className="grid shrink-0 grid-cols-7 border-b border-border bg-subtle/30">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="border-l border-border py-2 text-center font-mono text-[10px] uppercase tracking-wider text-faint first:border-l-0"
          >
            {d.slice(0, 3)}
          </div>
        ))}
      </div>

      {/* 6 weeks × 7 days */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6 overflow-y-auto">
        {grid.flat().map((cell, idx) => {
          const inMonth = cell.getMonth() === monthAnchor.getMonth();
          const isToday = isSameDay(cell, today);
          const iso = toDateInputValue(cell);
          const items = byDate.get(iso) ?? [];
          const isPast = !isToday && cell < today;

          return (
            <button
              key={iso + idx}
              type="button"
              onClick={() => onSelectDate(cell)}
              className={cn(
                "group relative flex min-h-[100px] flex-col items-stretch border-l border-t p-1.5 text-left transition-colors first:border-l-0 hover:bg-hover/30",
                isToday ? "border-foreground/70" : "border-border",
                !inMonth && "bg-subtle/40 text-faint"
              )}
            >
              {isPast && inMonth && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-[1] bg-[repeating-linear-gradient(135deg,transparent_0,transparent_5px,var(--border)_5px,var(--border)_6px)] opacity-50"
                />
              )}
              <div className="flex items-baseline justify-between">
                <span
                  className={cn(
                    "text-[12px] font-medium tabular-nums",
                    !inMonth && "text-faint/60",
                    isToday && "grid size-5 place-items-center rounded-full bg-foreground !text-background"
                  )}
                >
                  {cell.getDate()}
                </span>
                {items.length > 0 && (
                  <span className="font-mono text-[9px] tabular-nums text-faint">
                    {items.length}
                  </span>
                )}
              </div>

              <ul className="mt-1 space-y-0.5">
                {items.slice(0, 3).map((p) => {
                  const done = p.status === "DONE";
                  return (
                    <li
                      key={p.id}
                      className={cn(
                        "flex items-center gap-1 truncate rounded-sm px-1 py-px text-[10.5px] leading-tight",
                        done
                          ? "text-faint line-through"
                          : "bg-accent-soft/60 text-accent-ink"
                      )}
                    >
                      {p.time && (
                        <span className="shrink-0 font-mono text-[9px] tabular-nums opacity-70">
                          {p.time}
                        </span>
                      )}
                      <span className="truncate">{p.title}</span>
                    </li>
                  );
                })}
                {items.length > 3 && (
                  <li className="px-1 text-[10px] text-faint">+{items.length - 3} ko&apos;proq</li>
                )}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}
