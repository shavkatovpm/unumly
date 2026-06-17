"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pointer-Events asosidagi reorder — ham desktop (sichqoncha), ham mobil
 * (touch)da ishlaydi. HTML5 native drag touch qurilmalarda ishlamaydi, shuning
 * uchun setPointerCapture + elementFromPoint orqali barmoq ostidagi qatorni
 * topib, drag'ni qo'lda amalga oshiramiz.
 *
 * Foydalanish:
 *   const drag = usePointerReorder((draggedId, beforeId) => persist(...));
 *   <li data-reorder-id={id} className={cn(drag.draggingId===id && "opacity-40",
 *       drag.overId===id && drag.draggingId!==id && "shadow-[inset_0_2px_0_...]")}>
 *     <button onPointerDown={(e) => drag.start(e, id)}><GripVertical/></button>
 *   </li>
 *
 * beforeId — foydalanuvchi ustiga tashlagan qator id'si (dragged shundan OLDIN
 * qo'yiladi). beforeId === null bo'lsa — oxiriga.
 */
export function usePointerReorder(
  onMove: (draggedId: string, beforeId: string | null) => void
) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const overIdRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  const onMoveRef = useRef(onMove);
  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);

  const handleMove = useCallback((e: PointerEvent) => {
    if (!draggingIdRef.current) return;
    // Drag paytida scroll'ni bloklash — aks holda iOS dialog body'ni scroll qiladi.
    e.preventDefault();
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const row = el?.closest?.("[data-reorder-id]") as HTMLElement | null;
    const id = row?.dataset.reorderId ?? null;
    if (id !== overIdRef.current) {
      overIdRef.current = id;
      setOverId(id);
    }
  }, []);

  const handleEnd = useCallback(() => {
    const dragged = draggingIdRef.current;
    const over = overIdRef.current;
    if (dragged && over && dragged !== over) {
      onMoveRef.current(dragged, over);
    }
    draggingIdRef.current = null;
    overIdRef.current = null;
    startedRef.current = false;
    setDraggingId(null);
    setOverId(null);
  }, []);

  useEffect(() => {
    if (!draggingId) return;
    document.addEventListener("pointermove", handleMove, { passive: false });
    document.addEventListener("pointerup", handleEnd);
    document.addEventListener("pointercancel", handleEnd);
    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleEnd);
      document.removeEventListener("pointercancel", handleEnd);
    };
  }, [draggingId, handleMove, handleEnd]);

  function start(e: React.PointerEvent, id: string) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* iOS sometimes throws */ }
    draggingIdRef.current = id;
    startedRef.current = true;
    setDraggingId(id);
  }

  return { draggingId, overId, start };
}
