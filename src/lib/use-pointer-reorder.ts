"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Pointer-Events asosidagi reorder — ham desktop (sichqoncha), ham mobil
 * (touch)da ishlaydi. HTML5 native drag touch qurilmalarda ishlamaydi, shuning
 * uchun setPointerCapture + elementFromPoint orqali barmoq ostidagi qatorni
 * topib, drag'ni qo'lda amalga oshiramiz.
 *
 * Faollashtirish chegaralari (ixtiyoriy) — tap/scroll bilan to'qnashmaslik uchun:
 *   - mouse: `activationDistance` px siljigach drag boshlanadi (klik buzilmaydi).
 *   - touch/pen: `holdDelay` ms ushlab turilsa drag boshlanadi (long-press);
 *     bu vaqt ichida `holdTolerance` px dan ortiq siljish = scroll, bekor qilinadi.
 * Hech biri berilmasa — eski xulq: pointerdown'da darhol boshlanadi (grip handle uchun).
 *
 * Foydalanish:
 *   const drag = usePointerReorder((draggedId, beforeId) => persist(...));
 *   <li data-reorder-id={id} className={cn(drag.draggingId===id && "opacity-40",
 *       drag.overId===id && drag.draggingId!==id && "...indikator...")}>
 *     <button onPointerDown={(e) => drag.start(e, id)}><GripVertical/></button>
 *   </li>
 *
 * beforeId — foydalanuvchi ustiga tashlagan qator id'si (dragged shundan OLDIN
 * qo'yiladi). beforeId === null bo'lsa — oxiriga.
 */
type ReorderOpts = {
  activationDistance?: number;
  holdDelay?: number;
  holdTolerance?: number;
};

export function usePointerReorder(
  onMove: (draggedId: string, beforeId: string | null) => void,
  opts?: ReorderOpts
) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const draggingIdRef = useRef<string | null>(null);
  const overIdRef = useRef<string | null>(null);
  const phaseRef = useRef<"idle" | "pending" | "dragging">("idle");
  const pendingRef = useRef<{ id: string; pointerId: number; target: Element; x: number; y: number } | null>(null);
  const holdTimerRef = useRef<number | null>(null);

  const onMoveRef = useRef(onMove);
  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);
  const optsRef = useRef(opts);
  useEffect(() => { optsRef.current = opts; }, [opts]);

  // start() ham, hold-timer ham drag'ni boshlash uchun shu ref orqali chaqiradi.
  const beginRef = useRef<() => void>(() => {});

  useEffect(() => {
    function clearHold() {
      if (holdTimerRef.current != null) { window.clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    }
    function reset() {
      clearHold();
      phaseRef.current = "idle";
      pendingRef.current = null;
      draggingIdRef.current = null;
      overIdRef.current = null;
      setDraggingId(null);
      setOverId(null);
    }
    function begin() {
      const p = pendingRef.current;
      if (!p) return;
      clearHold();
      try { p.target.setPointerCapture(p.pointerId); } catch { /* iOS sometimes throws */ }
      phaseRef.current = "dragging";
      draggingIdRef.current = p.id;
      setDraggingId(p.id);
    }
    beginRef.current = begin;

    function onMove(e: PointerEvent) {
      if (phaseRef.current === "dragging") {
        e.preventDefault(); // drag paytida scroll'ni bloklaymiz
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const row = el?.closest?.("[data-reorder-id]") as HTMLElement | null;
        const id = row?.dataset.reorderId ?? null;
        if (id !== overIdRef.current) { overIdRef.current = id; setOverId(id); }
        return;
      }
      if (phaseRef.current === "pending") {
        const p = pendingRef.current;
        if (!p) return;
        const dist = Math.hypot(e.clientX - p.x, e.clientY - p.y);
        const o = optsRef.current;
        if (holdTimerRef.current != null) {
          // touch long-press kutilmoqda — siljish = scroll niyati, bekor.
          if (dist > (o?.holdTolerance ?? 10)) reset();
        } else {
          // mouse masofa chegarasi.
          if (dist >= Math.max(1, o?.activationDistance ?? 1)) begin();
        }
      }
    }
    function onUp() {
      if (phaseRef.current === "dragging") {
        const d = draggingIdRef.current;
        const o = overIdRef.current;
        if (d && o && d !== o) onMoveRef.current(d, o);
      }
      reset();
    }

    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      clearHold();
    };
  }, []);

  function start(e: React.PointerEvent, id: string) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const o = optsRef.current;
    const isMouse = e.pointerType === "mouse";
    const dist = o?.activationDistance ?? 0;
    const delay = o?.holdDelay ?? 0;

    pendingRef.current = { id, pointerId: e.pointerId, target: e.currentTarget, x: e.clientX, y: e.clientY };
    phaseRef.current = "pending";

    const immediate = isMouse ? dist <= 0 : delay <= 0;
    if (immediate) {
      e.preventDefault();
      beginRef.current();
      return;
    }
    if (!isMouse && delay > 0) {
      holdTimerRef.current = window.setTimeout(() => beginRef.current(), delay);
    }
    // mouse + masofa: siljish kutiladi (onMove ichida boshlanadi)
  }

  return { draggingId, overId, start };
}
