"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  getCalendarGrid,
  isSameDay,
  startOfMonth,
  toDateInputValue,
} from "@/lib/dates";

const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

export function MiniMonth({
  today,
  selected,
  onSelect,
  plans,
}: {
  today: Date;
  selected: Date;
  onSelect: (d: Date) => void;
  plans: Plan[];
}) {
  const [view, setView] = useState(() => startOfMonth(selected));
  const grid = useMemo(() => getCalendarGrid(view), [view]);

  const planDates = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of plans) {
      if (p.scope !== "DAILY") continue;
      map.set(p.scheduledFor, (map.get(p.scheduledFor) ?? 0) + 1);
    }
    return map;
  }, [plans]);

  function shift(delta: number) {
    setView((m) => {
      const next = new Date(m);
      next.setMonth(m.getMonth() + delta);
      return startOfMonth(next);
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3 shadow-[0_1px_0_var(--border)]">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="text-[12.5px] font-semibold tracking-tight">
          {UZ_MONTHS[view.getMonth()]} {view.getFullYear()}
        </h3>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Oldingi oy"
            className="grid size-6 place-items-center rounded text-muted transition-colors hover:bg-hover hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setView(startOfMonth(today));
              onSelect(today);
            }}
            className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted transition-colors hover:bg-hover hover:text-foreground"
          >
            Bugun
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Keyingi oy"
            className="grid size-6 place-items-center rounded text-muted transition-colors hover:bg-hover hover:text-foreground"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-y-0.5">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={cn(
              "py-1 text-center font-mono text-[9.5px] uppercase tracking-wider",
              i >= 5 ? "text-warm/80" : "text-faint"
            )}
          >
            {d}
          </div>
        ))}

        {grid.flat().map((cell) => {
          const inMonth = cell.getMonth() === view.getMonth();
          const isToday = isSameDay(cell, today);
          const isSelected = isSameDay(cell, selected);
          const iso = toDateInputValue(cell);
          const count = planDates.get(iso) ?? 0;
          const isWeekend = cell.getDay() === 0 || cell.getDay() === 6;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(cell)}
              className={cn(
                "grid h-7 w-full place-items-center rounded text-[12px] tabular-nums transition-all",
                !inMonth && "text-faint/60",
                inMonth && !isSelected && !isToday && (isWeekend ? "text-warm" : "text-foreground"),
                inMonth && !isSelected && "hover:bg-hover",
                isToday && !isSelected && "font-semibold text-accent",
                isSelected && "bg-foreground font-semibold text-background"
              )}
            >
              <span className="relative">
                {cell.getDate()}
                {count > 0 && !isSelected && (
                  <span
                    className={cn(
                      "absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full",
                      isToday ? "bg-accent" : "bg-faint"
                    )}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
