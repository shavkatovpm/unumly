"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, MoreHorizontal } from "lucide-react";
import { CATEGORY_COLOR_KEYS, CATEGORY_PALETTE } from "@/lib/category-palette";
import type { CategoryColor } from "@/lib/types";

export function WorkspaceProjectMenu({ title, color, onColor, onRemove }: {
  title: string;
  color?: CategoryColor;
  onColor: (color: CategoryColor) => void;
  onRemove: () => void;
}) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  function close() { setPosition(null); trigger.current?.focus(); }
  useEffect(() => {
    if (!position) return;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); close(); }
    }
    function onOutside(event: PointerEvent) {
      if (event.target instanceof Node && !panel.current?.contains(event.target) && !trigger.current?.contains(event.target)) setPosition(null);
    }
    function onResize() { setPosition(null); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onOutside);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onOutside);
      window.removeEventListener("resize", onResize);
    };
  }, [position]);
  return <>
    <button ref={trigger} type="button" aria-label={`${title}: loyiha amallari`} aria-expanded={!!position} aria-haspopup="dialog"
      className="absolute bottom-2 right-2 z-[2] grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white/70"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => {
        if (position) { close(); return; }
        const rect = trigger.current!.getBoundingClientRect();
        setPosition({ left: Math.max(8, Math.min(rect.right - 248, window.innerWidth - 256)), top: Math.max(8, Math.min(rect.top - 244, window.innerHeight - 252)) });
      }}><MoreHorizontal className="size-4" /></button>
    {position && createPortal(
      <div ref={panel} role="dialog" aria-label={`${title}: loyiha amallari`} className="fixed z-[100] w-[248px] max-h-[calc(100dvh-16px)] overflow-y-auto rounded-xl border border-white/15 bg-[#141615] p-3 text-white shadow-2xl" style={position}
        onPointerDown={(event) => event.stopPropagation()}>
        <p className="mb-3 text-sm text-white/60">Rangini o‘zgartirish</p>
        <div className="grid grid-cols-6 gap-2">
          {CATEGORY_COLOR_KEYS.map((key) => <button key={key} type="button" title={CATEGORY_PALETTE[key].label} aria-label={CATEGORY_PALETTE[key].label} aria-pressed={(color ?? "slate") === key}
            className="grid size-7 place-items-center rounded-full border border-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{ background: key === "white" ? "#d8d8d2" : CATEGORY_PALETTE[key].oklch }}
            onClick={() => { onColor(key); close(); }}>{(color ?? "slate") === key && <Check className="size-4 text-black" />}</button>)}
        </div>
        <button type="button" className="mt-3 w-full rounded-lg border-t border-white/10 px-2 py-3 text-left text-sm text-red-300 hover:bg-white/5" onClick={() => { close(); onRemove(); }}>Workspace’dan olib tashlash</button>
      </div>, document.body
    )}
  </>;
}
