"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const LONG_PRESS_MS = 350;
const MOVE_TOLERANCE = 8;

function haptic() {
  try {
    (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred: (s: string) => void } } } })
      .Telegram?.WebApp?.HapticFeedback?.impactOccurred("medium");
  } catch { /* old clients */ }
}

/** Qatorni uzoq bosib sudrash (`data-reorder-id` qatorlar). Touch hodisalari: faqat ular orqali brauzer
   aylantirishini sudrash boshlangandan keyin ham to'xtatish mumkin. */
export function useLongPressReorder(ref: RefObject<HTMLElement | null>, onMove: (id: string, beforeId: string) => void) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const onMoveRef = useRef(onMove);
  useEffect(() => { onMoveRef.current = onMove; });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    let startX = 0;
    let startY = 0;
    let dragging: string | null = null;
    let over: string | null = null;

    function clear() {
      window.clearTimeout(timer);
      timer = 0;
    }
    function onStart(e: TouchEvent) {
      const row = (e.target as HTMLElement).closest?.("[data-reorder-id]") as HTMLElement | null;
      // Tugma va maydonlar (belgilash, o'chirish, matn) o'z ishini qiladi.
      if (!row || (e.target as HTMLElement).closest("button,input,textarea") || e.touches.length > 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      const id = row.dataset.reorderId ?? null;
      timer = window.setTimeout(() => {
        dragging = id;
        setDragId(id);
        haptic();
      }, LONG_PRESS_MS);
    }
    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (!dragging) {
        if (Math.hypot(t.clientX - startX, t.clientY - startY) > MOVE_TOLERANCE) clear();
        return;
      }
      e.preventDefault();
      const hit = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
      const id = (hit?.closest?.("[data-reorder-id]") as HTMLElement | null)?.dataset.reorderId ?? null;
      if (id !== over) {
        over = id;
        setOverId(id);
      }
    }
    function onEnd(e: TouchEvent) {
      clear();
      if (!dragging) return;
      // Bosib turishdan keyingi click matnni tahrirlashga o'tkazmasin.
      if (e.cancelable) e.preventDefault();
      if (over && over !== dragging) onMoveRef.current(dragging, over);
      dragging = null;
      over = null;
      setDragId(null);
      setOverId(null);
    }
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      clear();
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [ref]);

  return { dragId, overId };
}

