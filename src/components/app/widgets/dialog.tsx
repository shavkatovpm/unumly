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
  /** "bottom" = bottom-sheet on mobile (default), "center" = centered modal on mobile too. */
  mobilePlacement?: "bottom" | "center";
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

  const centered = mobilePlacement === "center";

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex justify-center fade-in",
        centered
          ? "items-center p-4"
          : "items-end p-0 sm:items-center sm:p-4"
      )}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={cardRef}
        className={cn(
          "rise-in relative z-10 w-full max-w-md overflow-hidden border border-border bg-surface shadow-2xl",
          centered
            ? "rounded-xl"
            : "rounded-t-2xl sm:rounded-xl",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
