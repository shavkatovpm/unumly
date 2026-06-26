"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Menu, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { Reveal } from "./reveal";
import dynamic from "next/dynamic";
const Hero = dynamic(() => import("./hero").then((m) => ({ default: m.Hero })), {
  ssr: false,
  loading: () => <div className="h-40 sm:h-52" />,
});
import { BugunHead, BugunBody } from "./app-mockup";
import { FinanceHead, FinanceBody } from "./finance-mockup";
import { StickyShowcase } from "./showcase";
import { MODULES } from "./data";
import { useT, useLang, LANGS } from "./i18n";
import { useStart } from "./start-modal";

const menuListV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.06 } },
  exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
};
const menuItemV = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
};

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5">
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => setLang(l.id)}
          aria-pressed={lang === l.id}
          className={cn(
            "rounded-full px-2 py-1 text-[11px] font-medium transition-colors",
            lang === l.id
              ? "bg-foreground text-background"
              : "text-muted hover:text-foreground"
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export function Landing() {
  const t = useT();
  const { lang } = useLang();
  const { handleStart } = useStart();
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const closeMenu = () => setMenuOpen(false);

  const mobileLinks = [
    { label: t.nav.features, href: "#imkoniyatlar", route: false },
    { label: t.nav.blog, href: "/blog", route: true },
    { label: t.nav.about, href: "/haqida", route: true },
  ];

  // Menyu ochiq bo'lsa: scroll qilinganda yopiladi
  useEffect(() => {
    if (!menuOpen) return;
    const onScroll = () => setMenuOpen(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  // Landing ochiq ekan, butun hujjat foni ham grafit-dark (overscroll/chetlarda
  // foydalanuvchi temasi oq ko'rinib qolmasligi uchun). Chiqishda tiklanadi.
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prev = {
      rootBg: root.style.backgroundColor,
      bodyBg: body.style.backgroundColor,
      scheme: root.style.colorScheme,
    };
    const DARK = "oklch(0.16 0.006 255)";
    root.style.backgroundColor = DARK;
    body.style.backgroundColor = DARK;
    root.style.colorScheme = "dark";
    return () => {
      root.style.backgroundColor = prev.rootBg;
      body.style.backgroundColor = prev.bodyBg;
      root.style.colorScheme = prev.scheme;
    };
  }, []);

  return (
    <div className="landing-graphite min-h-screen bg-subtle text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-5">
          <button
            type="button"
            onClick={scrollTop}
            aria-label="unumly"
            className="shrink-0 transition-opacity hover:opacity-80"
          >
            <Wordmark className="text-[17px]" />
          </button>

          {/* Desktop linklar */}
          <div className="hidden items-center gap-7 md:flex">
            <a
              href="#imkoniyatlar"
              className="text-[13px] text-muted transition-colors hover:text-foreground"
            >
              {t.nav.features}
            </a>
            <Link
              href="/blog"
              className="text-[13px] text-muted transition-colors hover:text-foreground"
            >
              {t.nav.blog}
            </Link>
            <Link
              href="/haqida"
              className="text-[13px] text-muted transition-colors hover:text-foreground"
            >
              {t.nav.about}
            </Link>
          </div>

          {/* Desktop o'ng tomon */}
          <div className="hidden items-center gap-2.5 md:flex">
            <LangToggle />
            <Link
              href="/bugun"
              onClick={handleStart}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
            >
              {t.nav.login} <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          {/* Mobil hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menyu"
            aria-expanded={menuOpen}
            className="grid size-9 place-items-center overflow-hidden rounded-md text-foreground transition-colors hover:bg-subtle md:hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={menuOpen ? "x" : "m"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="grid place-items-center"
              >
                {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </nav>

        {/* Mobil menyu — navbar ostidan suzuvchi karta, stagger animatsiya */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMenu}
              className="fixed inset-0 top-14 z-30 bg-foreground/15 backdrop-blur-sm md:hidden"
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="fixed inset-x-3 top-[4.25rem] z-40 origin-top overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] md:hidden"
            >
              <motion.div
                variants={menuListV}
                initial="hidden"
                animate="show"
                className="flex flex-col"
              >
                {mobileLinks.map((l) => (
                  <motion.div key={l.href} variants={menuItemV}>
                    {l.route ? (
                      <Link
                        href={l.href}
                        onClick={closeMenu}
                        className="group flex items-center justify-between rounded-xl px-3 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-subtle"
                      >
                        {l.label}
                        <ChevronRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    ) : (
                      <a
                        href={l.href}
                        onClick={closeMenu}
                        className="group flex items-center justify-between rounded-xl px-3 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-subtle"
                      >
                        {l.label}
                        <ChevronRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5" />
                      </a>
                    )}
                  </motion.div>
                ))}

                <motion.div
                  variants={menuItemV}
                  className="mt-1 flex items-center justify-between gap-3 border-t border-border px-1 pt-3"
                >
                  <LangToggle />
                  <Link
                    href="/bugun"
                    onClick={(e) => {
                      handleStart(e);
                      closeMenu();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
                  >
                    {t.hero.ctaStart} <ArrowUpRight className="size-3.5" />
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        {/* Hero */}
        <Hero key={lang} />

        {/* Showcase 1 — Bugun */}
        <div className="mt-20 sm:mt-28">
          <Reveal className="mx-auto mb-7 max-w-xl text-center">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-faint">
              {t.showcase1.eyebrow}
            </p>
            <h2 className="mt-3 text-[clamp(1.4rem,3.5vw,2rem)] font-medium tracking-[-0.02em]">
              {t.showcase1.title}
            </h2>
          </Reveal>
          <StickyShowcase
            key={`bugun-${lang}`}
            activeKey="bugun"
            url="unumly.uz/bugun"
            head={<BugunHead />}
            body={<BugunBody />}
          />
        </div>

        {/* Showcase 2 — Moliya */}
        <div className="mt-20 sm:mt-28">
          <Reveal className="mx-auto mb-7 max-w-xl text-center">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-faint">
              {t.showcase2.eyebrow}
            </p>
            <h2 className="mt-3 text-[clamp(1.4rem,3.5vw,2rem)] font-medium tracking-[-0.02em]">
              {t.showcase2.title}
            </h2>
          </Reveal>
          <StickyShowcase
            key={`moliya-${lang}`}
            activeKey="moliya"
            url="unumly.uz/moliya"
            head={<FinanceHead />}
            body={<FinanceBody />}
          />
        </div>

        {/* Imkoniyatlar */}
        <section id="imkoniyatlar" className="scroll-mt-20 py-20 sm:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-faint">
              {t.features.eyebrow}
            </p>
            <h2 className="mt-4 text-[clamp(1.5rem,4vw,2.25rem)] font-medium tracking-[-0.02em]">
              {t.features.title}
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {MODULES.map((m, i) => {
              const mod = t.modules[m.key];
              return (
                <Reveal
                  key={m.key}
                  delay={(i % 4) * 60}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <m.icon className="size-[17px]" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-medium tracking-tight">
                      {mod.title}
                    </h3>
                    <p className="mt-0.5 text-[12px] leading-snug text-muted">
                      {mod.short}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="pb-24 sm:pb-32">
          <Reveal className="relative mx-auto max-w-xl">
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-32 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-accent/25 bg-surface px-8 py-14 text-center sm:px-14">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
                {t.ctaSec.eyebrow}
              </p>
              <h2 className="mt-4 text-[clamp(1.6rem,4vw,2.4rem)] font-medium tracking-[-0.025em]">
                {t.ctaSec.title}
              </h2>
              <Link
                href="/bugun"
                onClick={handleStart}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-[15px] font-medium text-accent-ink shadow-[0_8px_32px_-8px] shadow-accent/50 transition-all duration-200 hover:opacity-90 hover:shadow-[0_8px_40px_-8px] hover:shadow-accent/70"
              >
                {t.ctaSec.cta} <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-8">
          <Wordmark className="text-[15px]" showDot={false} />
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-faint">
            © {new Date().getFullYear()} unumly.uz
          </p>
        </div>
      </footer>
    </div>
  );
}
