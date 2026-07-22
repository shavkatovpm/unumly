"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_PALETTE, colorWithAlpha } from "@/lib/category-palette";
import { KATEGORIYALAR } from "@/lib/kategoriya";
import type { LoyihaKategoriya } from "@/lib/types";

/** Loyihaga A/B/C/D kategoriya belgilash — eski va yangi loyihalarning
 *  barchasida bir xil mexanizm orqali ishlaydi (PriorityPicker naqshiga
 *  asoslangan portal-dropdown, overflow-hidden kartalar ichida qirqilmasin). */
export function KategoriyaPicker({
  value,
  onChange,
  align = "left",
}: {
  value: LoyihaKategoriya | null | undefined;
  onChange: (next: LoyihaKategoriya | null) => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    function place() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = 192;
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

  const active = value ? KATEGORIYALAR.find((k) => k.key === value) ?? null : null;

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
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
          active ? "" : "border border-dashed border-faint text-faint hover:border-foreground hover:text-foreground"
        )}
        style={
          active
            ? { background: colorWithAlpha(active.color, 0.14), color: CATEGORY_PALETTE[active.color].oklch }
            : undefined
        }
      >
        {active && <span className="size-1.5 rounded-full" style={{ background: CATEGORY_PALETTE[active.color].oklch }} />}
        {active ? active.label : "Kategoriyasiz"}
      </button>
      {mounted && open && pos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[120] w-48 rounded-lg border border-border bg-surface p-1.5 shadow-lg"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {KATEGORIYALAR.map((k) => {
            const sel = k.key === value;
            return (
              <button
                key={k.key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(sel ? null : k.key);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors hover:bg-hover",
                  sel && "bg-hover"
                )}
              >
                <span className="size-2 rounded-full" style={{ background: CATEGORY_PALETTE[k.color].oklch }} />
                <span className="flex-1 font-medium">{k.label}</span>
                {sel && <Check className="size-3.5 text-faint" />}
              </button>
            );
          })}
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                setOpen(false);
              }}
              className="mt-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-faint transition-colors hover:bg-hover hover:text-foreground"
            >
              <X className="size-3.5" /> Kategoriyasiz qilish
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
