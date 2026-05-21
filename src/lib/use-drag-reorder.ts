"use client";

import { useState } from "react";

/**
 * Tiny drag-drop reorder helper using HTML5 native drag events.
 * Returns handlers that wire to the draggable row + drop indicator state.
 *
 * Usage:
 *   const dr = useDragReorder<Item>(items, (draggedId, beforeId) => {
 *     // Persist new order — beforeId is the id of the row the user dropped
 *     // ON TOP of (so dragged should be inserted BEFORE it). beforeId === null
 *     // means dropped after the last item.
 *   });
 *
 *   items.map(item => (
 *     <div
 *       key={item.id}
 *       draggable
 *       onDragStart={(e) => dr.start(e, item.id)}
 *       onDragOver={(e) => dr.over(e, item.id)}
 *       onDrop={(e) => dr.drop(e, item.id)}
 *       onDragEnd={dr.end}
 *     >
 *       ...
 *     </div>
 *   ))
 */
export function useDragReorder<T extends { id: string }>(
  _items: T[],
  onMove: (draggedId: string, beforeId: string | null) => void
) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function start(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", id); } catch { /**/ }
  }

  function over(e: React.DragEvent, id: string) {
    if (!draggingId || draggingId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overId !== id) setOverId(id);
  }

  function drop(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (draggingId && draggingId !== id) onMove(draggingId, id);
    setDraggingId(null);
    setOverId(null);
  }

  function end() {
    setDraggingId(null);
    setOverId(null);
  }

  return { draggingId, overId, start, over, drop, end };
}
