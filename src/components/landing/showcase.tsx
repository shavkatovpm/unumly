"use client";

import { useEffect, useRef } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";
import { MODULES, type ModuleKey } from "./data";
import { useT } from "./i18n";

const TOP_OFFSET = 64; // navbar ostida minimal masofa
const LERP = 0.16; // yumshoqlik (kichik = yumshoqroq)
const SCROLL_GAIN = 1.5; // ichki scroll masofasi (1.5 = 50% ko'proq)

/**
 * Sticky showcase: oyna ekran markaziga kelganда pin bo'lib turadi va
 * ichidagi ilova ko'rinishi yumshoq (inertsiyali) suriladi. Kirishda
 * zoom + fade ham bor. Bitta uzluksiz rAF + lerp, layout o'qishlari
 * keshlangan (silliq).
 */
export function StickyShowcase({
  activeKey,
  url,
  children,
}: {
  activeKey: ModuleKey;
  url: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const sticky = stickyRef.current;
    const card = cardRef.current;
    const vp = viewportRef.current;
    const inner = innerRef.current;
    if (!track || !sticky || !card || !vp || !inner) return;

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Keshlangan layout qiymatlari (har kadrda reflow bo'lmasligi uchun)
    let winH = 0;
    let maxShift = 0;
    let scrollLen = 0; // ichki scroll uchun ajratilgan page-scroll masofasi
    let pinStart = 0;

    const layout = () => {
      winH = window.innerHeight || document.documentElement.clientHeight;
      const cardH = card.offsetHeight;
      maxShift = Math.max(0, inner.scrollHeight - vp.clientHeight);
      scrollLen = maxShift * SCROLL_GAIN;

      // Oynani vertikal markazga pin qilamiz (navbardan past bo'lmasin)
      const stickyTop = Math.max(TOP_OFFSET, Math.round((winH - cardH) / 2));
      sticky.style.top = `${stickyTop}px`;

      const linger = winH * 0.15; // ichki scroll tugagach qisqa "ushlab turish"
      if (maxShift < 24) {
        track.style.height = "auto";
        scrollLen = 0;
      } else {
        track.style.height = `${cardH + scrollLen + linger}px`;
      }

      const trackTopAbs = track.getBoundingClientRect().top + window.scrollY;
      // Markazga kelganda (pin boshlanganda) ichki scroll boshlanadi
      pinStart = trackTopAbs - stickyTop;
    };

    if (reduced) {
      track.style.height = "auto";
      sticky.style.top = `${TOP_OFFSET}px`;
      card.style.transform = "none";
      card.style.opacity = "1";
      return;
    }

    let curY = 0;
    let curScale = 0.94;
    let curOp = 0.6;
    let raf = 0;

    const tick = () => {
      const y = window.scrollY;

      // Pin progressi (markazdan boshlab ichki scroll)
      const p =
        scrollLen > 0 ? Math.min(1, Math.max(0, (y - pinStart) / scrollLen)) : 0;
      const targetY = -p * maxShift;

      // Kirish progressi (zoom + fade) — markazga yetguncha tugaydi
      const e = Math.min(
        1,
        Math.max(0, (y - (pinStart - winH * 0.7)) / (winH * 0.7))
      );
      const targetScale = 0.94 + 0.06 * e;
      const targetOp = 0.6 + 0.4 * e;

      // Yumshoq yaqinlashish (lerp)
      curY += (targetY - curY) * LERP;
      curScale += (targetScale - curScale) * LERP;
      curOp += (targetOp - curOp) * LERP;

      inner.style.transform = `translate3d(0, ${curY.toFixed(2)}px, 0)`;
      card.style.transform = `scale(${curScale.toFixed(4)})`;
      card.style.opacity = curOp.toFixed(3);

      raf = requestAnimationFrame(tick);
    };

    layout();
    raf = requestAnimationFrame(tick);

    const onResize = () => layout();
    window.addEventListener("resize", onResize);
    document.fonts?.ready?.then(layout).catch(() => {});

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={trackRef} className="relative">
      <div ref={stickyRef} className="sticky" style={{ top: TOP_OFFSET }}>
        <div
          ref={cardRef}
          style={{
            transform: "scale(0.94)",
            opacity: 0.6,
            transformOrigin: "center center",
            willChange: "transform, opacity",
          }}
          className="flex h-[72svh] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-[0_30px_80px_-30px_rgba(0,0,0,0.3)] sm:h-[calc(100svh-5rem)]"
        >
          {/* Browser chrome */}
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-subtle/60 px-4 py-3">
            <span className="size-3 rounded-full bg-border-strong" />
            <span className="size-3 rounded-full bg-border-strong" />
            <span className="size-3 rounded-full bg-border-strong" />
            <div className="ml-3 hidden flex-1 sm:block">
              <div className="mx-auto w-fit rounded-md bg-background px-4 py-1 font-mono text-[10.5px] text-faint">
                {url}
              </div>
            </div>
          </div>

          {/* App shell — qolgan balandlikni to'ldiradi */}
          <div className="grid min-h-0 flex-1 sm:grid-cols-[200px_1fr]">
            <aside className="hidden flex-col gap-1 overflow-hidden border-r border-border bg-surface p-3 sm:flex">
              <Wordmark className="mb-3 px-2 pt-1 text-[15px]" />
              {MODULES.map((m) => {
                const active = m.key === activeKey;
                return (
                  <span
                    key={m.key}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors",
                      active
                        ? "bg-accent-soft font-medium text-foreground"
                        : "text-muted hover:bg-subtle"
                    )}
                  >
                    <m.icon className="size-4 shrink-0" strokeWidth={1.75} />
                    {t.modules[m.key].title}
                  </span>
                );
              })}
            </aside>

            {/* Ichki scroll oynasi */}
            <div
              ref={viewportRef}
              className="relative min-h-0 overflow-hidden bg-background"
            >
              <div ref={innerRef} style={{ willChange: "transform" }}>
                {children}
              </div>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
