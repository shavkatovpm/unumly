"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { usePlans } from "@/lib/plans-store";
import type { CalendarView } from "@/lib/calendar-view-store";
import {
  endOfWeek,
  formatUzDate,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import { ViewSwitcher } from "./kalendar/view-switcher";
import { DayGrid } from "./kalendar/day-grid";
import { HaftaView } from "./kalendar/hafta-view";
import { OyView } from "./kalendar/oy-view";
import { YilView } from "./kalendar/yil-view";
import { useConfirmRemove } from "./widgets/confirm-dialog";

const UZ_MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

function headingFor(view: CalendarView, date: Date): string {
  switch (view) {
    case "kun":   return formatUzDate(date);
    case "hafta": {
      const f = startOfWeek(date);
      const t = endOfWeek(date);
      if (f.getMonth() === t.getMonth()) {
        return `${f.getDate()}–${t.getDate()} ${UZ_MONTHS[t.getMonth()]}`;
      }
      return `${f.getDate()} ${UZ_MONTHS[f.getMonth()]} – ${t.getDate()} ${UZ_MONTHS[t.getMonth()]}`;
    }
    case "oy":    return `${UZ_MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
    case "yil":   return String(date.getFullYear());
  }
}

export function KalendarView() {
  const { plans, create, update, toggleStatus, remove, removeMany } = usePlans();
  const { askRemove, confirmEl } = useConfirmRemove(plans, remove);
  const [view, setView] = useState<CalendarView>("hafta");
  const today = useMemo(() => startOfDay(), []);
  const [selected, setSelected] = useState<Date>(today);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view !== "kun" && view !== "hafta") return;
    const el = scrollRef.current;
    if (!el) return;
    // scroll to ~07:30 region
    el.scrollTop = (8 - 6) * (view === "kun" ? 56 : 48) - 80;
  }, [view]);

  function shift(delta: number) {
    const next = new Date(selected);
    switch (view) {
      case "kun":
        next.setDate(selected.getDate() + delta);
        break;
      case "hafta":
        next.setDate(selected.getDate() + delta * 7);
        break;
      case "oy":
        next.setMonth(selected.getMonth() + delta);
        break;
      case "yil":
        next.setFullYear(selected.getFullYear() + delta);
        break;
    }
    setSelected(startOfDay(next));
  }

  const isToday = isSameDay(selected, today);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border pl-12 pr-3 md:pl-6 md:pr-6">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <h1 className="hidden text-[13px] font-semibold tracking-[-0.01em] sm:block">Kalendar</h1>

          {view === "kun" && (
            <button
              type="button"
              onClick={() => setView("oy")}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted transition-colors hover:bg-hover hover:text-foreground"
              aria-label="Oyga qaytish"
            >
              <ArrowLeft className="size-3" />
              Oy
            </button>
          )}

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label="Oldingi"
              className="grid size-6 place-items-center rounded text-muted transition-colors hover:bg-hover hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSelected(today)}
              disabled={isToday}
              title={isToday ? undefined : "Bugunga qaytish"}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-0.5 text-[12.5px] font-medium transition-colors",
                isToday
                  ? "text-accent"
                  : "text-foreground hover:bg-hover"
              )}
            >
              <span>{headingFor(view, selected)}</span>
              {isToday && view === "kun" && (
                <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  bugun
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label="Keyingi"
              className="grid size-6 place-items-center rounded text-muted transition-colors hover:bg-hover hover:text-foreground"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          {!isToday && (
            <button
              type="button"
              onClick={() => setSelected(today)}
              className="rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-faint transition-colors hover:bg-hover hover:text-foreground"
            >
              Bugun
            </button>
          )}
        </div>

        <ViewSwitcher value={view} onChange={setView} />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-2 sm:p-4">
        <div ref={scrollRef} className="h-full overflow-hidden">
          {view === "kun" && (
            <div className="h-full overflow-y-auto pr-1">
              <DayGrid
                date={selected}
                plans={plans}
                onCreate={create}
                onToggle={toggleStatus}
                onRemove={askRemove}
                onUpdate={update}
              />
            </div>
          )}

          {view === "hafta" && (
            <HaftaView
              date={selected}
              today={today}
              plans={plans}
              onCreate={create}
              onToggle={toggleStatus}
              onRemove={askRemove}
              onUpdate={update}
              onRemoveMany={removeMany}
            />
          )}

          {view === "oy" && (
            <OyView
              date={selected}
              today={today}
              plans={plans}
              onSelectDate={(d) => {
                setSelected(d);
                setView("kun");
              }}
            />
          )}

          {view === "yil" && (
            <YilView
              date={selected}
              today={today}
              plans={plans}
              onSelectMonth={(d) => {
                setSelected(d);
                setView("oy");
              }}
            />
          )}
        </div>
      </div>
      {confirmEl}
    </div>
  );
}
