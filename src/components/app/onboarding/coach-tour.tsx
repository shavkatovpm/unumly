"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type CoachStep = {
  selector: string;
  title: string;
  text: string;
};

type Rect = { top: number; left: number; width: number; height: number };

/**
 * Ketma-ket coachmark turi: har qadamda maqsadli element atrofi yoritiladi
 * (qolgan joy blur), unga kesik chiziqli strelka qaratiladi va izoh kartasi
 * chiqadi. Topilmagan/ko'rinmas elementli qadamlar avtomatik o'tkaziladi.
 */
export function CoachTour({ steps, onDone }: { steps: CoachStep[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState<{ w: number; h: number }>({ w: 300, h: 120 });

  const step = steps[i];

  // Maqsadli elementni topish; topilmasa — qadamni o'tkazib yuborish.
  useEffect(() => {
    if (!step) {
      onDone();
      return;
    }
    function visibleEl(): HTMLElement | null {
      const els = Array.from(document.querySelectorAll<HTMLElement>(step.selector));
      return els.find((e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0) ?? null;
    }
    const el = visibleEl();
    if (!el) {
      // keyingi qadamga (yoki tugatish)
      if (i < steps.length - 1) setI((v) => v + 1);
      else onDone();
      return;
    }
    const apply = (e: HTMLElement) => {
      const r = e.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    apply(el);
    // Elementni ko'rinadigan joyga keltirish
    el.scrollIntoView({ block: "center", behavior: "smooth" });

    function onUpd() {
      const e = visibleEl();
      if (e) apply(e);
    }
    window.addEventListener("resize", onUpd);
    window.addEventListener("scroll", onUpd, true);
    return () => {
      window.removeEventListener("resize", onUpd);
      window.removeEventListener("scroll", onUpd, true);
    };
  }, [i, step, steps.length, onDone]);

  // Karta o'lchamini o'lchash (joylashuv va strelka uchun).
  useLayoutEffect(() => {
    if (cardRef.current) {
      const r = cardRef.current.getBoundingClientRect();
      setCardSize({ w: r.width, h: r.height });
    }
  }, [rect, i]);

  if (!step || !rect) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const pad = 8;

  // Spotlight to'rtburchagi (paddingli)
  const hx = Math.max(0, rect.left - pad);
  const hy = Math.max(0, rect.top - pad);
  const hw = rect.width + pad * 2;
  const hh = rect.height + pad * 2;

  // Karta — ekran o'rtasida. Strelka kartadan maqsadga ilon (to'lqin) shaklida.
  const cardW = Math.min(320, vw - 24);
  const cw = cardSize.w || cardW;
  const ch = cardSize.h || 120;
  const ccx = vw / 2;
  const ccy = vh / 2;
  const tcx = rect.left + rect.width / 2;
  const tcy = rect.top + rect.height / 2;

  const start = edgePoint(ccx, ccy, cw / 2 + 8, ch / 2 + 8, tcx, tcy);
  const end = edgePoint(tcx, tcy, rect.width / 2 + pad + 4, rect.height / 2 + pad + 4, ccx, ccy);
  const arrowPath = snakePath(start, end, 3, 24);

  const isLast = i >= steps.length - 1;

  function next() {
    if (i < steps.length - 1) setI((v) => v + 1);
    else onDone();
  }

  return (
    <div className="fixed inset-0 z-[95]">
      {/* Klik-bloker (orqa fonni bosib bo'lmaydi) */}
      <div className="absolute inset-0" />

      {/* Blur + dim panellar (maqsad atrofida) */}
      <BlurPanel style={{ top: 0, left: 0, width: vw, height: hy }} />
      <BlurPanel style={{ top: hy + hh, left: 0, width: vw, height: Math.max(0, vh - (hy + hh)) }} />
      <BlurPanel style={{ top: hy, left: 0, width: hx, height: hh }} />
      <BlurPanel style={{ top: hy, left: hx + hw, width: Math.max(0, vw - (hx + hw)), height: hh }} />

      {/* Yoritilgan ramka */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pointer-events-none absolute rounded-lg"
        style={{
          top: hy,
          left: hx,
          width: hw,
          height: hh,
          boxShadow: "0 0 0 2px var(--accent), 0 0 0 6px color-mix(in oklch, var(--accent) 25%, transparent)",
        }}
      />

      {/* Kesik chiziqli strelka */}
      <svg className="pointer-events-none absolute inset-0" width={vw} height={vh}>
        <defs>
          <marker id="coach-arrow" markerWidth="9" markerHeight="9" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--accent)" />
          </marker>
        </defs>
        <motion.path
          d={arrowPath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="5 5"
          markerEnd="url(#coach-arrow)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, strokeDashoffset: [10, 0] }}
          transition={{
            opacity: { duration: 0.3 },
            strokeDashoffset: { duration: 0.6, ease: "linear", repeat: Infinity },
          }}
        />
      </svg>

      {/* Izoh kartasi — ekran o'rtasida */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            ref={cardRef}
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto w-full max-w-[320px] rounded-xl border border-border bg-surface p-4 shadow-2xl"
          >
            <p className="text-[14.5px] font-semibold leading-tight">{step.title}</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{step.text}</p>
            <div className="mt-3.5 flex items-center justify-between gap-2">
            {!isLast ? (
              <button
                type="button"
                onClick={onDone}
                className="text-[12px] text-faint transition-colors hover:text-foreground"
              >
                O&apos;tkazib yuborish
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={next}
              className={cn(
                "rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-accent-ink transition-transform active:scale-95"
              )}
            >
              {isLast ? "Tushundim" : "Keyingi"}
            </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Karta/maqsad to'rtburchagi chetidagi nuqta (markazdan `toward` yo'nalishida). */
function edgePoint(cx: number, cy: number, hw: number, hh: number, tx: number, ty: number) {
  const dx = tx - cx;
  const dy = ty - cy;
  const s = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh, 1e-6);
  return { x: cx + dx * s, y: cy + dy * s };
}

/** Ikki nuqta orasida ilon (sinus to'lqin) shaklidagi yo'l; chetlarda tekis. */
function snakePath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  waves: number,
  amp: number
): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const px = -dy / L;
  const py = dx / L;
  const N = Math.max(28, Math.round(L / 6));
  let d = `M ${a.x.toFixed(1)} ${a.y.toFixed(1)}`;
  for (let k = 1; k <= N; k++) {
    const t = k / N;
    const bx = a.x + dx * t;
    const by = a.y + dy * t;
    // sin(t·π) — chetlarda 0 amplituda (tekis ulanish), o'rtada to'liq to'lqin
    const off = Math.sin(t * Math.PI * waves) * amp * Math.sin(t * Math.PI);
    d += ` L ${(bx + px * off).toFixed(1)} ${(by + py * off).toFixed(1)}`;
  }
  return d;
}

function BlurPanel({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute bg-background/40 backdrop-blur-[3px]"
      style={style}
    />
  );
}
