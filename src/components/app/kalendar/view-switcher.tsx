"use client";

import { cn } from "@/lib/utils";
import type { CalendarView } from "@/lib/calendar-view-store";

const VIEWS: { id: CalendarView; label: string; short: string }[] = [
  { id: "kun",   label: "Kun",   short: "K" },
  { id: "hafta", label: "Hafta", short: "H" },
  { id: "oy",    label: "Oy",    short: "O" },
  { id: "yil",   label: "Yil",   short: "Y" },
];

export function ViewSwitcher({
  value,
  onChange,
}: {
  value: CalendarView;
  onChange: (v: CalendarView) => void;
}) {
  return (
    <nav className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
      {VIEWS.map((v) => {
        const active = v.id === value;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id)}
            aria-label={v.label}
            className={cn(
              "rounded-[5px] px-2 py-1 text-[12px] font-medium tracking-tight transition-colors sm:px-2.5 sm:text-[11.5px]",
              active
                ? "bg-foreground text-background"
                : "text-muted hover:bg-hover hover:text-foreground"
            )}
          >
            <span className="hidden sm:inline">{v.label}</span>
            <span className="sm:hidden">{v.short}</span>
          </button>
        );
      })}
    </nav>
  );
}
