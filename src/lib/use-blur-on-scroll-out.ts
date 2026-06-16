import { useEffect, type RefObject } from "react";

/**
 * Mobil brauzerlarda fokuslangan input/textarea scroll bilan ko'rinish
 * maydonidan chiqib ketsa ham, uning kursori (caret) konteynerning `overflow`
 * clip'idan "sizib" chiqib, modaldan tashqarida chizilib qoladi (yonib-o'chadigan
 * chiziq). Buni oldini olish uchun: fokuslangan element konteyner maydonidan
 * to'liq chiqib ketsa — fokusni olib tashlaymiz (kursor yo'qoladi, klaviatura
 * yopiladi).
 *
 * @param ref    scroll bo'ladigan modal/konteyner elementi
 * @param active hook faolmi (modal ochiqmi)
 */
export function useBlurInputOnScrollOut(
  ref: RefObject<HTMLElement | null>,
  active: boolean
) {
  useEffect(() => {
    if (!active) return;
    const card = ref.current;
    if (!card) return;
    function onScroll() {
      const el = document.activeElement as HTMLElement | null;
      if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return;
      if (!card || !card.contains(el)) return;
      const cr = card.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      if (er.bottom <= cr.top || er.top >= cr.bottom) el.blur();
    }
    // capture — ichki scroll konteyner (`overflow-y-auto`) hodisalarini ushlash uchun
    card.addEventListener("scroll", onScroll, true);
    return () => card.removeEventListener("scroll", onScroll, true);
  }, [ref, active]);
}
