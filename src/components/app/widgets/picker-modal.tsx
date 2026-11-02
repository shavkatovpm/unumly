"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/** Mobilda sana/vaqt tanlash: ekran o'rtasida, Telegram zonasidan pastda. */
export function PickerModal({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Klaviatura yopilsin — oyna butun ekran o'rtasida ochiladi.
  useLayoutEffect(() => {
    if (open) (document.activeElement as HTMLElement | null)?.blur?.();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-x-0 top-0 z-[130] flex items-center justify-center px-4 pb-4"
          style={{ height: "var(--tg-vh, 100dvh)", paddingTop: "var(--modal-safe-top)" }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            className="relative flex max-h-full w-full max-w-[380px] flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-2xl"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 520, damping: 38 }}
          >
            <header className="flex shrink-0 items-center justify-between px-5 pb-1 pt-4">
              <p className="text-[17px] font-semibold tracking-tight text-foreground">{label}</p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Yopish"
                className="grid size-9 place-items-center rounded-full bg-subtle text-muted transition-colors active:bg-hover"
              >
                <X className="size-[18px]" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
