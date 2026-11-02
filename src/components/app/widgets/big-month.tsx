"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCalendarGrid, isSameDay, startOfMonth, toDateInputValue } from "@/lib/dates";

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(d.getDate() + days);
  return next;
}

/** Mobil kalendar: katta, barmoq bilan bosishga qulay katakchalar. */
export function BigMonth({
  today,
  selected,
  onSelect,
  planDates,
  min,
  max,
}: {
  today: Date;
  selected: Date | null;
  onSelect: (d: Date) => void;
  /** Rejasi bor kunlar (YYYY-MM-DD) — ostida nuqta chiqadi. */
  planDates?: Set<string>;
  min?: string;
  max?: string;
}) {
  const [view, setView] = useState(() => startOfMonth(selected ?? today));
  const grid = useMemo(() => getCalendarGrid(view), [view]);

  function shift(delta: number) {
    setView((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }
  function disabled(d: Date) {
    const iso = toDateInputValue(d);
    return (!!min && iso < min) || (!!max && iso > max);
  }

  const quick = [
    { label: "Bugun", date: today },
    { label: "Ertaga", date: addDays(today, 1) },
    { label: "1 haftadan keyin", date: addDays(today, 7) },
  ];

  return (
    <div>
      <div className="flex gap-1.5">
        {quick.map((q) => {
          const active = !!selected && isSameDay(q.date, selected);
          return (
            <button
              key={q.label}
              type="button"
              disabled={disabled(q.date)}
              onClick={() => onSelect(q.date)}
              className={cn(
                "h-9 flex-1 whitespace-nowrap rounded-full px-2 text-[12.5px] font-medium transition-colors disabled:opacity-40",
                active ? "bg-accent text-accent-ink" : "bg-subtle text-foreground active:bg-hover"
              )}
            >
              {q.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between px-1">
        <p className="text-[16px] font-semibold tracking-tight tabular-nums text-foreground">
          {MONTHS[view.getMonth()]} {view.getFullYear()}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Oldingi oy"
            className="grid size-9 place-items-center rounded-full text-muted transition-colors active:bg-hover"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Keyingi oy"
            className="grid size-9 place-items-center rounded-full text-muted transition-colors active:bg-hover"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <div className="mt-1 grid grid-cols-7">
        {WEEKDAYS.map((w) => (
          <div key={w} className="grid h-8 place-items-center text-[12px] font-medium text-faint">
            {w}
          </div>
        ))}
        {grid.flat().map((cell) => {
          const iso = toDateInputValue(cell);
          const inMonth = cell.getMonth() === view.getMonth();
          const isSelected = !!selected && isSameDay(cell, selected);
          const isToday = isSameDay(cell, today);
          const off = disabled(cell);
          return (
            <button
              key={iso}
              type="button"
              disabled={off}
              onClick={() => onSelect(cell)}
              className="grid h-12 place-items-center disabled:cursor-not-allowed"
            >
              <span
                className={cn(
                  "relative grid size-11 place-items-center rounded-full text-[16px] tabular-nums transition-colors",
                  isSelected && "bg-accent font-semibold text-accent-ink",
                  !isSelected && !off && inMonth && "text-foreground active:bg-hover",
                  !isSelected && !off && !inMonth && "text-faint/60 active:bg-hover",
                  !isSelected && off && "text-faint/35",
                  !isSelected && isToday && "font-semibold ring-1 ring-inset ring-foreground/35"
                )}
              >
                {cell.getDate()}
                {planDates?.has(iso) && (
                  <span
                    className={cn(
                      "absolute bottom-1.5 size-1 rounded-full",
                      isSelected ? "bg-accent-ink" : "bg-muted"
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
