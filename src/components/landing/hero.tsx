"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useT, useLang } from "./i18n";

export function Hero() {
  const t = useT();
  const { lang } = useLang();
  const h = t.hero;

  const wrapRef = useRef<HTMLDivElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const h1 = h1Ref.current;
    if (!wrap || !h1) return;

    const fit = () => {
      const lines = h1.querySelectorAll<HTMLElement>("[data-fit-line]");
      if (!lines.length) return;
      h1.style.fontSize = "100px";
      let maxW = 0;
      lines.forEach((l) => {
        if (l.scrollWidth > maxW) maxW = l.scrollWidth;
      });
      if (maxW === 0) return;
      h1.style.fontSize = `${(100 * wrap.clientWidth) / maxW}px`;
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    document.fonts?.ready?.then(fit).catch(() => {});
    return () => ro.disconnect();
    // til o'zgarganda matn (en) o'zgaradi → qayta o'lchaymiz
  }, [lang]);

  return (
    <div
      ref={wrapRef}
      className="relative left-1/2 w-[80vw] max-w-[80vw] -translate-x-1/2 text-center"
    >
      <h1
        ref={h1Ref}
        style={{ fontSize: "8vw" }}
        className="font-semibold leading-[1.05] tracking-[-0.045em]"
      >
        <span data-fit-line className="block whitespace-nowrap">
          {h.line1}
        </span>
        <span data-fit-line className="block whitespace-nowrap">
          <span className="text-accent">{h.line2a}</span>
          {h.line2b ? ` ${h.line2b}` : ""}
        </span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-balance text-[15px] leading-relaxed text-muted sm:text-[16px]">
        <span className="sm:hidden">{h.subShort}</span>
        <span className="hidden sm:inline">{h.sub}</span>
      </p>

      <div className="mt-8 flex flex-row items-center justify-center gap-3">
        <Link
          href="/bugun"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-6 py-3 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
        >
          {h.ctaStart} <ArrowUpRight className="size-4" />
        </Link>
        <a
          href="#imkoniyatlar"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border-strong px-6 py-3 text-[14px] font-medium text-foreground transition-colors hover:bg-subtle"
        >
          {h.ctaFeatures}
        </a>
      </div>
    </div>
  );
}
