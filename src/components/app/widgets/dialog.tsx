"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onClose,
  children,
  className,
  mobilePlacement = "bottom",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /**
   * "bottom" — bottom-sheet on mobile (default)
   * "center" — centered modal on mobile too
   * "top"    — top-anchored on mobile (input-heavy dialogs; klaviatura
   *            ochilganda kontent ko'rinib turadi)
   */
  mobilePlacement?: "bottom" | "center" | "top";
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex justify-center",
        mobilePlacement === "center" && "items-center p-4",
        mobilePlacement === "bottom" && "items-end p-0 sm:items-center sm:p-4",
        mobilePlacement === "top" && "items-start justify-center px-4 sm:items-center sm:p-4"
      )}
      style={
        mobilePlacement === "top"
          ? { paddingTop: "calc(env(safe-area-inset-top, 0px) + 4rem)" }
          : undefined
      }
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop renders instantly (no fade) so the blur shows up at the
          same frame as the card — avoids a perceived blur-lag. */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={cardRef}
        className={cn(
          "rise-in relative z-10 flex w-full max-w-md flex-col border border-border bg-surface shadow-2xl",
          mobilePlacement === "center" && "max-h-[85vh] overflow-hidden rounded-xl",
          mobilePlacement === "bottom" && "max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-xl",
          mobilePlacement === "top" && "max-h-[calc(var(--tg-vh,100vh)-6rem)] overflow-hidden rounded-2xl sm:max-h-[85vh] sm:rounded-xl",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
