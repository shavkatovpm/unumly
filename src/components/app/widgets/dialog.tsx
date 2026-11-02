"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
import { useBlurInputOnScrollOut } from "@/lib/use-blur-on-scroll-out";
import { useKeyboardArea } from "@/lib/use-keyboard-area";
import { useScrollLock } from "@/lib/use-scroll-lock";

export function Dialog({
  open,
  onClose,
  children,
  className,
  mobilePlacement = "bottom",
  dismissable = true,
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
  /** false bo'lsa — backdrop bosish va Esc yopmaydi (faqat X tugmasi). */
  dismissable?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // Oyna klaviaturaga oldindan moslashadi — klaviatura chiqib bo'lgach sakramaydi.
  const area = useKeyboardArea(rootRef, open);
  const prevAreaRef = useRef(area.visibleHeight);
  // Kontent o'zgarib karta balandligi o'zgarsa — uni silliq animatsiya qilamiz
  // (masalan view→edit). Balandlikni TO'G'RIDAN-TO'G'RI animatsiya qilamiz
  // (framer `layout` scale-proyeksiyasi matnni cho'zib yuborardi).
  const prevHeightRef = useRef<number | null>(null);
  const sizeAnimRef = useRef<Animation | null>(null);
  useIsoLayoutEffect(() => {
    if (!open) { prevHeightRef.current = null; return; }
    const el = cardRef.current;
    if (!el) return;
    const next = el.offsetHeight;
    const prev = prevHeightRef.current;
    prevHeightRef.current = next;
    // Klaviatura joyi o'zgarganda balandlik animatsiyasi kerak emas (faqat kontent o'zgarganda).
    const areaChanged = prevAreaRef.current !== area.visibleHeight;
    prevAreaRef.current = area.visibleHeight;
    if (areaChanged) return;
    if (prev == null || Math.abs(prev - next) < 2) return; // ilk o'lchov yoki o'zgarmagan
    sizeAnimRef.current?.cancel();
    sizeAnimRef.current = el.animate(
      [{ height: `${prev}px` }, { height: `${next}px` }],
      { duration: 300, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
    );
  });

  const isCenter = mobilePlacement === "center";

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && dismissable) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, dismissable]);

  // iOS-da ishonchli scroll-lock: html+body+swipe konteynerlarni qulflaydi
  // (faqat body overflow yetarli emas — ortdagi konteyner rubber-band scroll
  // bo'lib ketadi).
  useScrollLock(open);

  // Fokuslangan input scroll bilan modaldan chiqib ketsa — kursor (caret)
  // modal tashqarisida "sizib" chizilmasligi uchun fokusni olib tashlaymiz.
  // Faqat "center" da agressiv: "top" da scroll paytida blur qilsak balandlik
  // sakrab modal "qotib qoladi".
  useBlurInputOnScrollOut(cardRef, open && isCenter);

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className={cn(
        "fixed inset-x-0 z-50 flex justify-center",
        // Ochilib bo'lgach yozish boshlansa — `top`/`height` silliq o'zgaradi.
        area.settled && "transition-[top,height] duration-300 ease-out",
        isCenter && "items-center p-4",
        mobilePlacement === "bottom" && "items-end p-0 sm:items-center sm:p-4",
        mobilePlacement === "top" && "items-start justify-center px-4 sm:items-center sm:p-4"
      )}
      style={{
        top: area.top,
        height: area.visibleHeight === null ? "var(--tg-vh, 100dvh)" : `${area.visibleHeight}px`,
        paddingTop: mobilePlacement === "bottom" ? undefined : "var(--modal-safe-top)",
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop renders instantly (no fade) so the blur shows up at the
          same frame as the card — avoids a perceived blur-lag. */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={dismissable ? onClose : undefined}
      />
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: mobilePlacement === "bottom" ? 24 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative z-10 flex w-full max-w-md flex-col border border-border bg-surface shadow-2xl",
          mobilePlacement === "center" && "max-h-[calc(100%-2rem)] overflow-hidden rounded-xl",
          mobilePlacement === "bottom" && "max-h-[min(90%,calc(100%-var(--modal-safe-top)))] overflow-hidden rounded-t-2xl sm:rounded-xl",
          mobilePlacement === "top" && "max-h-[calc(100%-2rem)] overflow-hidden rounded-2xl sm:max-h-[85vh] sm:rounded-xl",
          className
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}
