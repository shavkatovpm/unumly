"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Send, ArrowRight, X } from "lucide-react";
import { useT } from "./i18n";

const TELEGRAM_URL = "https://t.me/unumlybot";
const APP_URL = "/bugun";

type StartCtxValue = { isMobile: boolean; openStart: () => void };
const StartCtx = createContext<StartCtxValue>({
  isMobile: false,
  openStart: () => {},
});

export function StartProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <StartCtx.Provider value={{ isMobile, openStart: () => setOpen(true) }}>
      {children}
      <StartModal open={open} onClose={() => setOpen(false)} />
    </StartCtx.Provider>
  );
}

/** Mobil bo'lsa modalni ochadi, aks holda oddiy navigatsiya davom etadi */
export function useStart() {
  const { isMobile, openStart } = useContext(StartCtx);
  const handleStart = (e: React.MouseEvent) => {
    if (isMobile) {
      e.preventDefault();
      openStart();
    }
  };
  return { isMobile, openStart, handleStart };
}

function StartModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT().modal;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="start-overlay"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          className="landing-graphite fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center"
        >
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-3xl border border-border bg-surface p-5 pb-7 text-foreground shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.45)] sm:rounded-3xl sm:pb-5 sm:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.45)]"
          >
            {/* Drag-handle (mobil sheet hissi) */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong sm:hidden" />

            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-semibold tracking-[-0.01em]">
                {t.title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Yopish"
                className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-subtle hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {/* Telegram — tavsiya */}
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="relative flex items-start gap-3 rounded-xl border border-accent/40 bg-accent-soft p-4 transition-opacity hover:opacity-90"
              >
                <span className="absolute -top-2.5 right-4 rounded-full bg-accent px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-accent-ink">
                  {t.recommended}
                </span>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-ink">
                  <Send className="size-[18px]" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-[14px] font-medium">{t.telegramTitle}</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
                    {t.telegramDesc}
                  </p>
                </div>
              </a>

              {/* Sayt */}
              <Link
                href={APP_URL}
                onClick={onClose}
                className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 transition-colors hover:bg-subtle"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-subtle text-foreground">
                  <ArrowRight className="size-[18px]" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-[14px] font-medium">{t.webTitle}</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
                    {t.webDesc}
                  </p>
                </div>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
