"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useBlurInputOnScrollOut } from "@/lib/use-blur-on-scroll-out";

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
  const isCenter = mobilePlacement === "center";
  // Markaz rejimida overlay'ni ko'rinadigan maydonga (visual viewport) moslaymiz
  // — klaviatura ochilganda modal markazda, to'liq ko'rinib turadi.
  const [vp, setVp] = useState<{ top: number; height: number } | null>(null);

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

  // Fokuslangan input scroll bilan modaldan chiqib ketsa — kursor (caret)
  // modal tashqarisida "sizib" chizilmasligi uchun fokusni olib tashlaymiz.
  useBlurInputOnScrollOut(cardRef, open);

  useEffect(() => {
    if (!open || !isCenter || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setVp({ top: vv.offsetTop, height: vv.height });
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [open, isCenter]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed z-50 flex justify-center",
        isCenter ? "inset-x-0 items-center p-4" : "inset-0",
        mobilePlacement === "bottom" && "items-end p-0 sm:items-center sm:p-4",
        mobilePlacement === "top" && "items-start justify-center px-4 sm:items-center sm:p-4"
      )}
      style={
        isCenter
          ? { top: vp?.top ?? 0, height: vp ? `${vp.height}px` : "var(--tg-vh, 100dvh)" }
          : mobilePlacement === "top"
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
          mobilePlacement === "center" && "max-h-[calc(100%-2rem)] overflow-hidden rounded-xl",
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
