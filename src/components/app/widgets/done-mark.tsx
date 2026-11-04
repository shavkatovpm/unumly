"use client";

/* Bajarildi belgisi: doira sakraydi, belgi chiziladi va doiradan qator bo'ylab
   yumshoq to'lqin yoyiladi (faqat belgilanganda, bekor qilinganda emas). */

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Tugma turgan qatorni topadi: ro'yxat qatori yoki eni kamida 220px bo'lgan ota. */
function rowOf(el: HTMLElement): HTMLElement | null {
  const marked = el.closest<HTMLElement>("[data-done-row],[role=button],[data-reorder-id],li");
  if (marked && marked !== el) return marked;
  let p = el.parentElement;
  while (p && p.offsetWidth < 220) p = p.parentElement;
  return p;
}

/** Qator ichida, tugma markazidan to'lqin. Qatorning o'z uslubiga faqat animatsiya paytida tegiladi. */
export function playDoneWave(from: HTMLElement) {
  const row = rowOf(from);
  if (!row || typeof row.animate !== "function") return;
  const r = row.getBoundingClientRect();
  const t = from.getBoundingClientRect();
  const cx = t.left + t.width / 2 - r.left;
  const cy = t.top + t.height / 2 - r.top;
  const radius = Math.hypot(Math.max(cx, r.width - cx), Math.max(cy, r.height - cy));
  const prev = { position: row.style.position, overflow: row.style.overflow };
  if (getComputedStyle(row).position === "static") row.style.position = "relative";
  row.style.overflow = "hidden";
  const wave = document.createElement("span");
  wave.setAttribute("aria-hidden", "true");
  Object.assign(wave.style, {
    position: "absolute",
    left: `${cx - radius}px`,
    top: `${cy - radius}px`,
    width: `${radius * 2}px`,
    height: `${radius * 2}px`,
    borderRadius: "9999px",
    background: "color-mix(in oklch, var(--accent) 10%, transparent)",
    pointerEvents: "none",
  });
  row.appendChild(wave);
  const anim = wave.animate(
    [{ transform: "scale(0)", opacity: 1 }, { transform: "scale(1)", opacity: 0 }],
    { duration: 700, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
  );
  anim.onfinish = anim.oncancel = () => {
    wave.remove();
    row.style.position = prev.position;
    row.style.overflow = prev.overflow;
  };
}

/** Doira + chiziladigan belgi. `wave` — belgilanganda qator bo'ylab to'lqin. */
export function DoneMark({ on, size = 26, wave = true, className }: { on: boolean; size?: number; wave?: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(on);
  useEffect(() => {
    if (on && !prev.current && wave && ref.current) playDoneWave(ref.current);
    prev.current = on;
  }, [on, wave]);
  return (
    <motion.span
      ref={ref}
      initial={false}
      animate={on ? { scale: [1, 1.18, 1] } : { scale: 1 }}
      transition={{ duration: 0.36 }}
      className={cn("grid shrink-0 place-items-center rounded-full border-2 transition-colors duration-200", on ? "border-accent bg-accent text-accent-ink" : "border-border-strong text-transparent", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <motion.path d="M3.5 8.5l3 3 6-7" initial={false} animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }} transition={{ duration: 0.22, delay: on ? 0.05 : 0 }} />
      </svg>
    </motion.span>
  );
}
