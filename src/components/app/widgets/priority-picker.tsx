"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { PlanPriority } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: PlanPriority; label: string; cls: string }[] = [
  { value: "HIGH",   label: "Yuqori", cls: "bg-priority-high" },
  { value: "MEDIUM", label: "O'rta",  cls: "bg-priority-medium" },
  { value: "LOW",    label: "Past",   cls: "bg-priority-low" },
];

export function priorityColorClass(p: PlanPriority | undefined) {
  if (p === "HIGH")   return "bg-priority-high";
  if (p === "MEDIUM") return "bg-priority-medium";
  if (p === "LOW")    return "bg-priority-low";
  return "";
}

export function PriorityPicker({
  value,
  onChange,
  size = "sm",
  align = "right",
}: {
  value: PlanPriority | undefined;
  onChange: (next: PlanPriority | undefined) => void;
  size?: "xs" | "sm";
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const colorCls = priorityColorClass(value);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title={value ? OPTIONS.find((o) => o.value === value)?.label : "Daraja qo'shing"}
        aria-label="Muhimlik darajasi"
        className={cn(
          "rounded-full transition-all hover:scale-110",
          size === "xs" ? "size-2.5" : "size-3",
          value
            ? colorCls + " ring-1 ring-inset ring-black/10 dark:ring-white/10"
            : "border-[1.5px] border-dashed border-faint hover:border-foreground"
        )}
      />
      {open && (
        <div
          className={cn(
            "absolute top-full z-50 mt-1 flex items-center gap-1 rounded-md border border-border bg-surface p-1 shadow-lg",
            align === "right" ? "right-0" : "left-0"
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {OPTIONS.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(active ? undefined : o.value);
                  setOpen(false);
                }}
                title={o.label}
                className={cn(
                  "size-5 rounded-full transition-all hover:scale-110",
                  o.cls,
                  active && "ring-2 ring-foreground ring-offset-1 ring-offset-surface"
                )}
              />
            );
          })}
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
                setOpen(false);
              }}
              title="Olib tashlash"
              className="grid size-5 place-items-center rounded-full text-faint transition-colors hover:bg-hover hover:text-foreground"
            >
              <X className="size-2.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
