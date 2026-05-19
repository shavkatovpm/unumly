"use client";

import { cn } from "@/lib/utils";
import type { CalendarView } from "@/lib/calendar-view-store";

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "hafta",  label: "Hafta" },
  { id: "oy",     label: "Oy" },
  { id: "yil",    label: "Yil" },
];

export function ViewSwitcher({
  value,
  onChange,
}: {
  value: CalendarView;
  onChange: (v: CalendarView) => void;
}) {
  return (
    <nav className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
      {VIEWS.map((v) => {
        const active = v.id === value;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id)}
            className={cn(
              "rounded-[5px] px-2.5 py-1 text-[11.5px] font-medium tracking-tight transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted hover:bg-hover hover:text-foreground"
            )}
          >
            {v.label}
          </button>
        );
      })}
    </nav>
  );
}
