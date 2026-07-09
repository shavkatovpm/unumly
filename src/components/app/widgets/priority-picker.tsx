"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => setMounted(true), []);

  // Dropdown portal orqali document.body'ga chiqariladi — aks holda
  // jadval/kalendar katagi kabi `overflow-hidden` konteynerlar ichida
  // qirqilib, "chala" ko'rinardi.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    function place() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = 132; // taxminan (3 doira + tozalash tugmasi + padding)
      const left = align === "right" ? r.right - width : r.left;
      setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(left, window.innerWidth - width - 8)) });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const colorCls = priorityColorClass(value);

  return (
    <>
      <button
        ref={triggerRef}
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
      {mounted && open && pos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[120] flex items-center gap-1 rounded-md border border-border bg-surface p-1 shadow-lg"
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
        </div>,
        document.body
      )}
    </>
  );
}
