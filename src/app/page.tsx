"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const VERBS = ["Rejalang", "Boshqaring", "Bajaring"];
const ROTATE_MS = 2200;

export default function HomePage() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setIdx((v) => (v + 1) % VERBS.length),
      ROTATE_MS
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col">
      {/* Mobile (< md): dashed-bordered card */}
      <section className="flex flex-1 flex-col items-center justify-center px-5 py-8 md:hidden">
        <div className="rise-in w-full max-w-sm rounded-2xl border border-dashed border-border-strong bg-transparent px-4 py-10 text-center">
          <h1 className="text-balance text-[16.5px] font-medium leading-snug tracking-[-0.01em]">
            Kunlik ishlarni rejalashtirish ilovasi
          </h1>

          <div
            className="rise-in mt-7 flex items-baseline justify-center gap-1.5"
            style={{ animationDelay: "140ms" }}
          >
            <span className="text-[52px] font-medium leading-none tracking-[-0.05em] text-foreground">
              unumly
            </span>
            <span
              aria-hidden
              className="relative inline-block size-1.5 -translate-y-1 rounded-full bg-accent"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60" />
            </span>
          </div>

          <div className="rise-in mt-5" style={{ animationDelay: "220ms" }}>
            <MobileVerb idx={idx} />
          </div>

          <div className="rise-in mt-8" style={{ animationDelay: "320ms" }}>
            <CtaStack />
          </div>
        </div>

        <p
          className="rise-in mt-5 text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-faint"
          style={{ animationDelay: "60ms" }}
        >
          Vaqtingizni unumli boshqaring
        </p>
      </section>

      {/* Desktop (≥ md): original open layout, no card */}
      <section className="hidden flex-1 items-center justify-center px-6 py-12 md:flex">
        <div className="w-full max-w-3xl text-center">
          <h1 className="rise-in text-balance text-[clamp(1.5rem,3vw,2.25rem)] font-medium leading-[1.1] tracking-[-0.02em]">
            Kunlik ishlarni rejalashtirish ilovasi
          </h1>
          <p
            className="rise-in mt-3 text-[15px] text-muted"
            style={{ animationDelay: "60ms" }}
          >
            Vaqtingizni unumli boshqaring
          </p>

          <div
            className="rise-in mt-10 flex items-baseline justify-center gap-2"
            style={{ animationDelay: "140ms" }}
          >
            <span className="text-[clamp(5rem,14vw,11rem)] font-medium leading-none tracking-[-0.05em] text-foreground">
              unumly
            </span>
            <span
              aria-hidden
              className="relative inline-block size-3 -translate-y-2 rounded-full bg-accent"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60" />
            </span>
          </div>

          <div className="rise-in mt-8" style={{ animationDelay: "220ms" }}>
            <DesktopVerb idx={idx} />
          </div>

          <div className="rise-in mt-12" style={{ animationDelay: "320ms" }}>
            <CtaRow />
          </div>
        </div>
      </section>

      <footer className="px-6 pb-5 pt-3 text-center text-[10px] uppercase tracking-[0.15em] text-faint sm:pb-6 sm:text-[10.5px]">
        © {new Date().getFullYear()} unumly.uz
      </footer>
    </main>
  );
}

/* ─── Rotating verbs ─────────────────────────────────────────── */
function MobileVerb({ idx }: { idx: number }) {
  return (
    <div className="relative h-[52px]" aria-live="polite" aria-atomic>
      {VERBS.map((verb, i) => {
        const isCurrent = i === idx;
        const isPrev = i === (idx - 1 + VERBS.length) % VERBS.length;
        return (
          <p
            key={verb}
            className={cn(
              "absolute inset-0 flex items-center justify-center whitespace-nowrap text-[52px] font-medium leading-none tracking-[-0.05em] text-muted transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
              isCurrent && "translate-y-0 opacity-100 blur-0",
              !isCurrent && isPrev && "-translate-y-2 opacity-0 blur-[2px]",
              !isCurrent && !isPrev && "translate-y-2 opacity-0 blur-[2px]"
            )}
            aria-hidden={!isCurrent}
          >
            {verb}
          </p>
        );
      })}
    </div>
  );
}

function DesktopVerb({ idx }: { idx: number }) {
  return (
    <div className="relative h-[3.5rem]" aria-live="polite" aria-atomic>
      {VERBS.map((verb, i) => {
        const isCurrent = i === idx;
        const isPrev = i === (idx - 1 + VERBS.length) % VERBS.length;
        return (
          <p
            key={verb}
            className={cn(
              "absolute inset-0 flex items-center justify-center whitespace-nowrap text-[clamp(2rem,5vw,3rem)] font-medium leading-none tracking-[-0.03em] text-muted transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
              isCurrent && "translate-y-0 opacity-100 blur-0",
              !isCurrent && isPrev && "-translate-y-3 opacity-0 blur-[2px]",
              !isCurrent && !isPrev && "translate-y-3 opacity-0 blur-[2px]"
            )}
            aria-hidden={!isCurrent}
          >
            {verb}
          </p>
        );
      })}
    </div>
  );
}

/* ─── Mobile CTA: stacked (Boshlash on top, Haqida | Blog below) ─── */
function CtaStack() {
  return (
    <div className="flex flex-col items-center gap-3.5">
      <Link
        href="/bugun"
        className="inline-flex items-center gap-2 rounded-md bg-foreground px-6 py-2.5 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
      >
        Boshlash
        <ArrowUpRight className="size-4" />
      </Link>
      <div className="flex items-center gap-5">
        <Link
          href="/haqida"
          className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint transition-colors hover:text-foreground"
        >
          Haqida
        </Link>
        <span aria-hidden className="h-3 w-px bg-border" />
        <Link
          href="/blog"
          className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint transition-colors hover:text-foreground"
        >
          Blog
        </Link>
      </div>
    </div>
  );
}

/* ─── Desktop CTA: inline row (Haqida   [Boshlash ↗]   Blog) ─── */
function CtaRow() {
  return (
    <div className="flex items-center justify-center gap-5">
      <Link
        href="/haqida"
        className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint transition-colors hover:text-foreground"
      >
        Haqida
      </Link>
      <Link
        href="/bugun"
        className="inline-flex items-center gap-2 rounded-md bg-foreground px-6 py-2.5 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
      >
        Boshlash
        <ArrowUpRight className="size-4" />
      </Link>
      <Link
        href="/blog"
        className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint transition-colors hover:text-foreground"
      >
        Blog
      </Link>
    </div>
  );
}
