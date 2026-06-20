"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
import { useBlurInputOnScrollOut } from "@/lib/use-blur-on-scroll-out";
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
  const cardRef = useRef<HTMLDivElement>(null);
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
    if (prev == null || Math.abs(prev - next) < 2) return; // ilk o'lchov yoki o'zgarmagan
    sizeAnimRef.current?.cancel();
    sizeAnimRef.current = el.animate(
      [{ height: `${prev}px` }, { height: `${next}px` }],
      { duration: 300, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
    );
  });

  const isCenter = mobilePlacement === "center";
  // "center" va "top" rejimlarida overlay'ni ko'rinadigan maydonga (visual
  // viewport) moslaymiz — klaviatura ochilganda modal to'liq ko'rinib, balandlik
  // sakramaydi.
  const tracksViewport = mobilePlacement === "center" || mobilePlacement === "top";
  const [vp, setVp] = useState<{ top: number; height: number } | null>(null);

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

  useEffect(() => {
    if (!open || !tracksViewport || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setVp({ top: vv.offsetTop, height: vv.height });
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [open, tracksViewport]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed z-50 flex justify-center",
        // Klaviatura ochilib-yopilganda `top`/`height` silliq o'zgaradi
        // (to'satdan sakramaydi). "center" va "top" — visual viewport'ga
        // moslashadi.
        tracksViewport
          ? "inset-x-0 transition-[top,height] duration-300 ease-out"
          : "inset-0",
        isCenter && "items-center p-4",
        mobilePlacement === "bottom" && "items-end p-0 sm:items-center sm:p-4",
        mobilePlacement === "top" && "items-start justify-center px-4 sm:items-center sm:p-4"
      )}
      style={
        tracksViewport
          ? {
              top: vp?.top ?? 0,
              height: vp ? `${vp.height}px` : "var(--tg-vh, 100dvh)",
              ...(mobilePlacement === "top"
                ? { paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)" }
                : null),
            }
          : undefined
      }
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
          mobilePlacement === "bottom" && "max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-xl",
          mobilePlacement === "top" && "max-h-[calc(100%-2rem)] overflow-hidden rounded-2xl sm:max-h-[85vh] sm:rounded-xl",
          className
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}
