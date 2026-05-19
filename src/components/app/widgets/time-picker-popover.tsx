"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { TimePicker } from "./time-picker";

const POPOVER_WIDTH = 280;
const POPOVER_HEIGHT_APPROX = 340;
const EDGE_MARGIN = 12;

export function TimePickerPopover({
  open,
  triggerRef,
  value,
  onChange,
  onClear,
  onClose,
  disableBefore,
  occupiedSlots,
}: {
  open: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  value: string;
  onChange: (v: string) => void;
  onClear?: () => void;
  onClose: () => void;
  /** HH:MM — slots strictly less than this are unselectable */
  disableBefore?: string;
  /** HH:MM slots already occupied by other tasks (shown as "band") */
  occupiedSlots?: string[];
}) {
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute position relative to the trigger.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    function place() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      let top = r.bottom + 6;
      if (top + POPOVER_HEIGHT_APPROX > window.innerHeight - EDGE_MARGIN) {
        top = Math.max(EDGE_MARGIN, r.top - POPOVER_HEIGHT_APPROX - 6);
      }
      let left = r.left;
      if (left + POPOVER_WIDTH > window.innerWidth - EDGE_MARGIN) {
        left = window.innerWidth - POPOVER_WIDTH - EDGE_MARGIN;
      }
      left = Math.max(EDGE_MARGIN, left);
      setPos({ top, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, triggerRef]);

  // Close on Escape / outside click. Defer listener attach to next tick to
  // avoid catching the same click that opened the popover.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      onClose();
    }
    const t = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onClose, triggerRef]);

  if (!open || !mounted || !pos) return null;

  return createPortal(
    <div
      ref={popRef}
      role="dialog"
      aria-label="Vaqt tanlash"
      className="fade-in fixed z-[100] rounded-xl border border-border bg-surface p-3 shadow-2xl ring-1 ring-black/5"
      style={{
        top: pos.top,
        left: pos.left,
        width: POPOVER_WIDTH,
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
          Vaqt tanlash
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="grid size-6 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <TimePicker
        value={value}
        onChange={(v) => {
          onChange(v);
          onClose();
        }}
        onClear={onClear}
        disableBefore={disableBefore}
        occupiedSlots={occupiedSlots}
      />
    </div>,
    document.body
  );
}
