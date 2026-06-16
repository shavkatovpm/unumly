"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Kontent balandligi o'zgarganda (masalan tab almashganda) silliq
 * kattalashish/kichiklashish beradi. Ichki o'lchamni ResizeObserver bilan
 * kuzatadi va CSS `height` transition orqali animatsiya qiladi — bu transform
 * scale ishlatmaydi, shuning uchun matn cho'zilib ketmaydi.
 *
 * Balandlik kontentga teng qilib o'rnatiladi; `max-h-*` (className orqali) bilan
 * cheklab, baland kontent uchun ichki scroll qoldiriladi.
 */
export function AutoHeight({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "overflow-y-auto transition-[height] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
        className
      )}
      style={{ height }}
    >
      <div ref={inner}>{children}</div>
    </div>
  );
}
