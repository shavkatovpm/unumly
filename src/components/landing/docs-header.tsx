"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Menu, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { useT, useLang, LANGS } from "./i18n";

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

/**
 * Landing navbar bilan bir xil ko'rinishdagi header — boshqa sahifalarda
 * (masalan /haqida) ishlatish uchun. Havolalar absolyut (`/#...`) bo'lgani
 * uchun istalgan sahifadan ishlaydi. <LangProvider> ichida render qilinishi shart.
 */
export function DocsHeader() {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const mobileLinks: { label: string; href: string; route?: boolean }[] = [
    { label: t.nav.features, href: "/#imkoniyatlar" },
    { label: t.nav.price, href: "/#narx" },
    { label: t.nav.blog, href: "/blog", route: true },
    { label: t.nav.about, href: "/haqida", route: true },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-5">
        <Link
          href="/"
          aria-label="unumly"
          className="shrink-0 transition-opacity hover:opacity-80"
        >
          <Wordmark className="text-[17px]" />
        </Link>

        {/* Desktop linklar */}
        <div className="hidden items-center gap-7 md:flex">
          <Link
            href="/#imkoniyatlar"
            className="text-[13px] text-muted transition-colors hover:text-foreground"
          >
            {t.nav.features}
          </Link>
          <Link
            href="/#narx"
            className="text-[13px] text-muted transition-colors hover:text-foreground"
          >
            {t.nav.price}
          </Link>
          <Link
            href="/blog"
            className="text-[13px] text-muted transition-colors hover:text-foreground"
          >
            {t.nav.blog}
          </Link>
          <Link
            href="/haqida"
            className="text-[13px] font-medium text-foreground transition-colors"
          >
            {t.nav.about}
          </Link>
        </div>

        {/* Desktop o'ng tomon */}
        <div className="hidden items-center gap-2.5 md:flex">
          <LangToggle />
          <Link
            href="/bugun"
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
                  onClick={closeMenu}
                  className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
                >
                  {t.nav.login} <ArrowUpRight className="size-3.5" />
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
