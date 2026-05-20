"use client";

import { useEffect } from "react";

// Modal ochiq paytda sahifa va belgilangan scroll konteynerlarini qulflash.
// iOS Safari'da klaviatura ochilganda fokuslangan input'ni "ko'rinishga
// olib kelish" uchun parent scroll containerni siljitmasligi uchun.
// CSS :has() qoidasi yetarli emas — eski iOS Safari'da yoki fokus eventi
// kechiksa shift sodir bo'lib qolishi mumkin. JS-based proaktiv lock
// modal state o'zgarishi bilanoq qulflaydi.
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBodyOverscroll = body.style.overscrollBehavior;

    const containers = Array.from(
      document.querySelectorAll<HTMLElement>("[data-scroll-lock-on-focus]")
    );
    const saved = containers.map((el) => ({
      el,
      overflow: el.style.overflow,
      overscroll: el.style.overscrollBehavior,
    }));

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "contain";
    body.style.overscrollBehavior = "contain";
    containers.forEach((el) => {
      el.style.overflow = "hidden";
      el.style.overscrollBehavior = "contain";
    });

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.overscrollBehavior = prevBodyOverscroll;
      saved.forEach(({ el, overflow, overscroll }) => {
        el.style.overflow = overflow;
        el.style.overscrollBehavior = overscroll;
      });
    };
  }, [locked]);
}
