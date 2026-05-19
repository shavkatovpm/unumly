"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

type Variant = 1 | 2 | 3 | 4 | 5 | 6;

const VARIANTS: { id: Variant; label: string }[] = [
  { id: 1, label: "Notebook" },
  { id: 2, label: "Poem" },
  { id: 3, label: "Statement" },
  { id: 4, label: "Manifesto" },
  { id: 5, label: "Brand" },
  { id: 6, label: "Question" },
];

export default function HomePage() {
  const [variant, setVariant] = useState<Variant>(3);

  return (
    <main className="relative flex min-h-screen flex-col">
      <div className="fixed right-4 top-4 z-50 flex items-center gap-0.5 rounded-md border border-border bg-surface/80 p-0.5 shadow-sm backdrop-blur">
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVariant(v.id)}
            title={v.label}
            className={cn(
              "rounded-[5px] px-2 py-1 text-[11px] font-medium transition-colors",
              variant === v.id
                ? "bg-foreground text-background"
                : "text-muted hover:bg-hover hover:text-foreground"
            )}
          >
            V{v.id}
          </button>
        ))}
      </div>

      {variant === 1 && <V1Notebook />}
      {variant === 2 && <V2Poem />}
      {variant === 3 && <V3Statement />}
      {variant === 4 && <V4Manifesto />}
      {variant === 5 && <V5Brand />}
      {variant === 6 && <V6Question />}

      <footer className="px-6 py-6 text-center text-[10.5px] tracking-[0.15em] uppercase text-faint sm:px-10">
        © {new Date().getFullYear()} unumly.uz
      </footer>
    </main>
  );
}

/* ─── V1 — Notebook (margin lines, like a journal) ─────────── */
function V1Notebook() {
  return (
    <>
      <header className="px-6 py-6 sm:px-10">
        <Wordmark className="text-base" />
      </header>

      <section className="relative flex flex-1 items-center px-6 sm:px-10">
        {/* Faint horizontal lines like ruled paper */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_bottom,transparent_31px,var(--border)_31px,var(--border)_32px,transparent_32px)] [background-size:100%_32px] opacity-30"
        />
        {/* Red margin line on the left */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-12 w-px bg-danger/30 sm:left-20"
        />

        <div className="relative ml-6 max-w-2xl pl-6 sm:ml-14 sm:pl-8">
          <p className="rise-in font-mono text-[10.5px] uppercase tracking-[0.2em] text-faint">
            Bugun · {new Date().toLocaleDateString("uz-UZ", { day: "numeric", month: "long" })}
          </p>
          <h1
            className="rise-in mt-3 font-serif text-balance text-4xl font-medium leading-[1.1] tracking-[-0.02em] sm:text-5xl"
            style={{ animationDelay: "60ms" }}
          >
            Bir kunlik daftar.
            <br />
            <span className="italic text-faint">Hammasi shu yerda.</span>
          </h1>
          <Link
            href="/bugun"
            className="rise-in mt-10 inline-flex items-center gap-2 text-[14px] font-medium underline decoration-foreground/40 underline-offset-[6px] hover:decoration-foreground"
            style={{ animationDelay: "140ms" }}
          >
            Daftarni ochish
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}

/* ─── V2 — Poem (stacked phrases) ────────────────────────── */
function V2Poem() {
  const lines = [
    "Ertalab —",
    "ro'yxat tuzdik.",
    "",
    "Tushlikda —",
    "uchtasini bajardik.",
    "",
    "Kechqurun —",
    "yana bittasini.",
  ];

  return (
    <section className="flex flex-1 flex-col justify-between px-6 py-10 sm:px-12 sm:py-14">
      <Wordmark className="text-base" />

      <div className="mx-auto w-full max-w-md py-12">
        {lines.map((l, i) => (
          <p
            key={i}
            className={cn(
              l ? "rise-in text-[22px] leading-[1.4] tracking-[-0.01em] sm:text-[26px]" : "h-3",
              i % 3 === 0 ? "text-faint" : "text-foreground"
            )}
            style={l ? { animationDelay: `${i * 80}ms` } : undefined}
          >
            {l}
          </p>
        ))}

        <Link
          href="/bugun"
          className="rise-in mt-10 inline-flex items-center gap-2 text-[14px] font-medium"
          style={{ animationDelay: `${lines.length * 80 + 200}ms` }}
        >
          <span className="border-b border-foreground pb-0.5">Yozishni boshlash</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div />
    </section>
  );
}

/* ─── V3 — Big Statement (kept from previous) ────────────── */
function V3Statement() {
  return (
    <section className="flex flex-1 flex-col justify-between px-6 py-10 sm:px-10 sm:py-14">
      <Wordmark className="text-base" />

      <div className="flex flex-1 items-center">
        <h1 className="rise-in text-balance text-[clamp(2.5rem,9vw,7rem)] font-medium leading-[0.95] tracking-[-0.04em]">
          Nima qilish kerakligini bilasiz.
          <br />
          <span className="text-faint">Faqat boshlang.</span>
        </h1>
      </div>

      <div
        className="rise-in flex flex-wrap items-end justify-between gap-4"
        style={{ animationDelay: "120ms" }}
      >
        <p className="max-w-sm text-[13px] text-muted">
          Rejalaringizni saqlash, kuzatish va bajarish uchun bitta minimal app.
        </p>
        <Link
          href="/bugun"
          className="group inline-flex items-center gap-2 text-[15px] font-medium text-foreground"
        >
          <span className="border-b border-foreground/40 pb-1 transition-colors group-hover:border-foreground">
            Boshlash
          </span>
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}

/* ─── V4 — Numbered Manifesto ────────────────────────────── */
function V4Manifesto() {
  const principles = [
    { n: "01", title: "Hech qanday ro'yxatdan o'tish.",      hint: "Brauzeringizning o'zida ishlaydi." },
    { n: "02", title: "Hech qanday ortiqcha tugma.",         hint: "Faqat asosiy harakatlar." },
    { n: "03", title: "Kun, hafta, oy, yil — bir joyda.",    hint: "Vaqt ko'lamini o'zgartirib turing." },
    { n: "04", title: "Ma'lumotlar sizniki.",                hint: "Lokal saqlash, eksport mumkin." },
  ];

  return (
    <section className="flex flex-1 flex-col px-6 py-10 sm:px-10 sm:py-14">
      <header className="mb-12 flex items-baseline justify-between border-b border-border pb-4">
        <Wordmark className="text-base" />
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-faint">
          Manifest · 4
        </p>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-y-8 md:grid-cols-2 md:gap-x-16">
        {principles.map((p, i) => (
          <div
            key={p.n}
            className="rise-in"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
              {p.n}
            </p>
            <h2 className="mt-2 text-balance text-[22px] font-medium leading-[1.2] tracking-[-0.01em] sm:text-[26px]">
              {p.title}
            </h2>
            <p className="mt-1.5 text-[13px] text-muted">{p.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex items-center justify-end border-t border-border pt-6">
        <Link
          href="/bugun"
          className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
        >
          Boshlash
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}

/* ─── V5 — Brand-forward (massive wordmark) ──────────────── */
function V5Brand() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-6 sm:px-10">
      <div className="text-center">
        <div className="rise-in flex items-baseline justify-center gap-2">
          <span className="text-[clamp(4rem,16vw,12rem)] font-medium leading-none tracking-[-0.05em] text-foreground">
            unumly
          </span>
          <span
            aria-hidden
            className="relative inline-block size-3 -translate-y-2 rounded-full bg-accent sm:size-5"
          >
            <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60" />
          </span>
        </div>
        <p
          className="rise-in mt-6 max-w-md font-mono text-[11.5px] uppercase tracking-[0.25em] text-muted"
          style={{ animationDelay: "140ms" }}
        >
          rejalar uchun · lokal · o&apos;zbekcha
        </p>
        <Link
          href="/bugun"
          className="rise-in mt-12 inline-flex items-center gap-2 text-[14px] font-medium"
          style={{ animationDelay: "240ms" }}
        >
          <span className="border-b border-foreground pb-1">Ochish</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

/* ─── V6 — Conversational question ───────────────────────── */
function V6Question() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const greeting = (() => {
    if (!now) return "Salom";
    const h = now.getHours();
    if (h < 5)  return "Tinch tun";
    if (h < 12) return "Xayrli tong";
    if (h < 17) return "Xayrli kun";
    if (h < 22) return "Xayrli kech";
    return "Tinch tun";
  })();

  return (
    <section className="flex flex-1 flex-col px-6 py-10 sm:px-10 sm:py-14">
      <Wordmark className="text-base" />

      <div className="flex flex-1 items-center">
        <div className="w-full max-w-2xl">
          <p className="rise-in text-[15px] text-faint">{greeting}.</p>
          <h1
            className="rise-in mt-2 text-balance text-4xl font-medium leading-[1.1] tracking-[-0.03em] sm:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            Bugun nima qilmoqchisiz?
          </h1>

          <Link
            href="/bugun"
            className="rise-in mt-10 inline-flex w-full max-w-md items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-border-strong"
            style={{ animationDelay: "200ms" }}
          >
            <span className="font-mono text-[13px] text-faint">Birinchi rejani yozing…</span>
            <span className="ml-3 inline-flex size-7 items-center justify-center rounded-md bg-foreground text-background">
              <ArrowRight className="size-3.5" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
