/**
 * Input fokuslanganda uni klaviatura ortidan ko'rinadigan maydonga silliq
 * scroll qiladi. iOS'da klaviatura layout viewport'ni kichraytirmaydi (ustidan
 * qoplaydi), shuning uchun visualViewport o'lchamidan foydalanamiz.
 *
 * Ishlatish: <input onFocus={ensureVisibleOnFocus} ... />
 */

function getScrollParent(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement;
  while (p) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) {
      return p;
    }
    p = p.parentElement;
  }
  return null;
}

function bringIntoView(el: HTMLElement) {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const visibleTop = vv ? vv.offsetTop : 0;
  const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
  const rect = el.getBoundingClientRect();
  const margin = 24;

  let delta = 0;
  if (rect.bottom > visibleBottom - margin) {
    delta = rect.bottom - (visibleBottom - margin);
  } else if (rect.top < visibleTop + margin) {
    delta = rect.top - (visibleTop + margin);
  }
  if (Math.abs(delta) < 2) return;

  const sc = getScrollParent(el);
  if (sc) sc.scrollBy({ top: delta, behavior: "smooth" });
  else window.scrollBy({ top: delta, behavior: "smooth" });
}

export function ensureVisibleOnFocus(e: React.FocusEvent<HTMLElement>) {
  const el = e.currentTarget;
  // Klaviatura animatsiyasi tugashini kutib bir necha marta urinib ko'ramiz.
  window.setTimeout(() => bringIntoView(el), 100);
  window.setTimeout(() => bringIntoView(el), 350);

  // visualViewport o'lchami o'zgarganda (klaviatura ochilganda) qayta moslaymiz.
  const vv = window.visualViewport;
  if (vv) {
    const onResize = () => bringIntoView(el);
    vv.addEventListener("resize", onResize);
    window.setTimeout(() => vv.removeEventListener("resize", onResize), 700);
  }
}
