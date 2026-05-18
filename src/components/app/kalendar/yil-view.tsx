"use client";

import { useMemo } from "react";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  getCalendarGrid,
  isSameDay,
  toDateInputValue,
} from "@/lib/dates";

const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const WEEKDAYS = ["D", "S", "C", "P", "J", "S", "Y"];

export function YilView({
  date,
  today,
  plans,
  onSelectMonth,
}: {
  date: Date;
  today: Date;
  plans: Plan[];
  onSelectMonth: (d: Date) => void;
}) {
  const year = date.getFullYear();

  const countsByDate = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const p of plans) {
      if (p.scope !== "DAILY") continue;
      const entry = map.get(p.scheduledFor) ?? { total: 0, done: 0 };
      entry.total += 1;
      if (p.status === "DONE") entry.done += 1;
      map.set(p.scheduledFor, entry);
    }
    return map;
  }, [plans]);

  const monthTotals = useMemo(() => {
    const totals = Array.from({ length: 12 }, () => ({ total: 0, done: 0 }));
    for (const [iso, meta] of countsByDate.entries()) {
      const m = Number(iso.split("-")[1]) - 1;
      const y = Number(iso.split("-")[0]);
      if (y === year && m >= 0 && m < 12) {
        totals[m].total += meta.total;
        totals[m].done += meta.done;
      }
    }
    return totals;
  }, [countsByDate, year]);

  return (
    <div className="overflow-y-auto p-1">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {UZ_MONTHS.map((label, monthIdx) => {
          const monthDate = new Date(year, monthIdx, 1);
          const grid = getCalendarGrid(monthDate);
          const meta = monthTotals[monthIdx];

          return (
            <button
              key={monthIdx}
              type="button"
              onClick={() => onSelectMonth(monthDate)}
              className="group rounded-lg border border-border bg-surface p-3 text-left shadow-[0_1px_0_var(--border)] transition-all hover:border-border-strong hover:shadow-sm"
            >
              <header className="mb-2 flex items-baseline justify-between">
                <h3 className="text-[12.5px] font-semibold tracking-tight">
                  {label}
                </h3>
                <span className="font-mono text-[10px] tabular-nums text-faint">
                  {meta.done}/{meta.total}
                </span>
              </header>

              <div className="grid grid-cols-7 gap-px">
                {WEEKDAYS.map((d, i) => (
                  <div
                    key={d + i}
                    className={cn(
                      "py-0.5 text-center font-mono text-[8.5px]",
                      i >= 5 ? "text-warm/70" : "text-faint"
                    )}
                  >
                    {d}
                  </div>
                ))}

                {grid.flat().map((cell, idx) => {
                  const inMonth = cell.getMonth() === monthIdx;
                  const isToday = isSameDay(cell, today);
                  const iso = toDateInputValue(cell);
                  const c = countsByDate.get(iso);
                  const intensity = c ? Math.min(c.total / 4, 1) : 0;

                  return (
                    <div
                      key={iso + idx}
                      className={cn(
                        "grid h-4 w-full place-items-center rounded-sm text-[8.5px] tabular-nums transition-colors",
                        !inMonth && "text-faint/30",
                        inMonth && !c && "text-faint",
                        inMonth && c && "text-accent-ink",
                        isToday && "ring-1 ring-foreground"
                      )}
                      style={{
                        backgroundColor: c
                          ? `oklch(0.62 0.13 155 / ${0.12 + intensity * 0.45})`
                          : undefined,
                      }}
                      title={c ? `${c.done}/${c.total} reja` : undefined}
                    >
                      {inMonth ? cell.getDate() : ""}
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
