import type { RefObject } from "react";

const EDGE = 8;

/** Telegram close/⋮ zonasi — CSS o'zgaruvchisi hisob-kitobli, shu sabab o'lchanadi. */
function safeTop(): number {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;visibility:hidden;height:var(--modal-safe-top,0px)";
  document.body.appendChild(probe);
  const height = probe.offsetHeight;
  probe.remove();
  return height;
}

/** Menyu ekran pastiga sig'masa yuqoriga suriladi, Telegram zonasiga esa kirmaydi. */
export function fitInView(el: HTMLElement | null) {
  if (!el) return;
  el.style.translate = "";
  const rect = el.getBoundingClientRect();
  const vv = window.visualViewport;
  const bottom = (vv ? vv.offsetTop + vv.height : window.innerHeight) - EDGE;
  const overflow = rect.bottom - bottom;
  if (overflow <= 0) return;
  const shift = Math.min(overflow, Math.max(0, rect.top - safeTop()));
  el.style.translate = `0 ${-shift}px`;
}

/** Mavjud `ref` bilan birga ishlatish uchun. */
export function fitRef<T extends HTMLElement>(ref: RefObject<T | null>) {
  return (el: T | null) => {
    ref.current = el;
    fitInView(el);
  };
}
