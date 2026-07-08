"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Rocket, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/lib/use-scroll-lock";

/**
 * Birinchi kirgan foydalanuvchiga tanishuv — 3 ta alohida sahifa:
 * rejalashtirish, moliya va "Boshladikmi?" chaqirig'i. Har sahifada o'ziga
 * xos jonli animatsion ikona. Desktopda ikona va matn kattaroq.
 */
const AUTO_MS = 5000; // har sahifa shu vaqtdan keyin avtomatik keyingisiga o'tadi

export function WelcomeIntro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  useScrollLock(true);

  const last = i === PAGES.length - 1;
  const page = PAGES[i];

  function next() {
    if (last) onDone();
    else setI((v) => v + 1);
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* Yumshoq accent fon */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 70% at 50% 0%, color-mix(in oklch, var(--accent) 14%, transparent) 0%, transparent 60%)",
        }}
      />

      {/* Tepa: nuqtalar + o'tkazib yuborish */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7">
        <div className="flex gap-1.5">
          {PAGES.map((_, idx) => {
            const active = idx === i;
            return (
              <button
                key={idx}
                type="button"
                aria-label={`Sahifa ${idx + 1}`}
                onClick={() => setI(idx)}
                className={cn(
                  "h-1.5 overflow-hidden rounded-full transition-all duration-300",
                  active ? "w-6 bg-border" : "w-1.5 bg-border"
                )}
              >
                {active && !last && (
                  <motion.span
                    key={i}
                    className="block h-full bg-accent"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: AUTO_MS / 1000, ease: "linear" }}
                    onAnimationComplete={() => setI((v) => v + 1)}
                  />
                )}
                {active && last && <span className="block h-full w-full bg-accent" />}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onDone}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] text-muted transition-colors hover:text-foreground sm:text-[13.5px]"
        >
          O&apos;tkazib yuborish
          <X className="size-3.5" />
        </button>
      </div>

      {/* Kontent */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <div className="mb-9 scale-110 sm:mb-12 sm:scale-[1.7]">{page.anim}</div>
            <h1 className="max-w-md text-[27px] font-semibold leading-tight tracking-[-0.02em] sm:max-w-xl sm:text-[42px]">
              {page.title}
            </h1>
            <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-muted sm:mt-5 sm:max-w-lg sm:text-[18.5px]">
              {page.text}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pastki tugma — ixcham, markazda */}
      <div className="relative z-20 flex justify-center px-6 pb-9 sm:pb-12">
        <button
          type="button"
          onClick={next}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-6 py-2.5 text-[14px] font-semibold text-accent-ink transition-transform active:scale-95 sm:text-[15px]"
        >
          {last ? "Boshlash" : "Keyingi"}
          <ArrowRight className={cn("size-4", last && "hidden")} />
        </button>
      </div>
    </div>
  );
}

const PAGES: { anim: React.ReactNode; title: string; text: string }[] = [
  {
    anim: <PlanAnim />,
    title: "Ishlarni rejalashtiring",
    text: "Kunlik va oylik vazifalaringizni tartibga soling, bajaring va har kuningiz qanchalik unumli o'tganini kuzating.",
  },
  {
    anim: <FinanceAnim />,
    title: "Moliyani boshqaring",
    text: "Kirim-chiqimni yozing, byudjet belgilang va pullaringiz qayerga ketayotganini aniq ko'ring.",
  },
  {
    anim: <StartAnim />,
    title: "Xo'sh, boshladikmi?",
    text: "Hammasi tayyor. Birinchi rejangizni qo'shing va kuningizni Unumly bilan unumli o'tkazing.",
  },
];

/* ─── Rejalashtirish: vazifalar belgisi "chizilib" bajariladi ─── */
function PlanAnim() {
  const CYCLE = 3;
  return (
    <div className="grid size-[88px] place-items-center rounded-[24px] border border-border bg-subtle/40">
      <div className="flex w-[54px] flex-col gap-[9px]">
        {[0, 1, 2].map((idx) => {
          const d = idx * 0.45;
          return (
            <div key={idx} className="flex items-center gap-2">
              {/* Belgilash katakchasi */}
              <span className="relative grid size-[18px] shrink-0 place-items-center overflow-hidden rounded-[6px] border border-border">
                <motion.span
                  className="absolute inset-0 rounded-[5px]"
                  style={{ background: "var(--accent)" }}
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 0, 1, 1, 0] }}
                  transition={{ duration: CYCLE, times: [0, 0.1, 0.28, 0.82, 1], ease: "backOut", repeat: Infinity, delay: d }}
                />
                <svg viewBox="0 0 12 12" className="relative size-3">
                  <motion.path
                    d="M2.5 6.4 L5 8.8 L9.5 3.4"
                    fill="none"
                    stroke="var(--accent-ink)"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: [0, 0, 1, 1, 0] }}
                    transition={{ duration: CYCLE, times: [0, 0.18, 0.4, 0.82, 1], ease: "easeInOut", repeat: Infinity, delay: d }}
                  />
                </svg>
              </span>
              {/* Vazifa chizig'i — bajarilganda accent bilan to'ladi */}
              <span className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-border">
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: "var(--accent)" }}
                  initial={{ width: "0%" }}
                  animate={{ width: ["0%", "0%", "100%", "100%", "0%"] }}
                  transition={{ duration: CYCLE, times: [0, 0.18, 0.45, 0.82, 1], ease: "easeInOut", repeat: Infinity, delay: d }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Moliya: aylanib (flip) tushuvchi tangalar + hamyon reaksiyasi ─── */
function FinanceAnim() {
  return (
    <div
      className="relative grid size-[88px] place-items-center overflow-hidden rounded-[24px] border border-border bg-subtle/40"
      style={{ perspective: 420 }}
    >
      {[0, 1, 2].map((idx) => (
        <motion.span
          key={idx}
          className="absolute left-1/2 top-[16%] grid size-[16px] -translate-x-1/2 place-items-center rounded-full border"
          style={{
            background: "var(--warning)",
            borderColor: "color-mix(in oklch, var(--warning) 65%, black)",
            transformStyle: "preserve-3d",
          }}
          initial={{ y: -34, opacity: 0, rotateY: 0 }}
          animate={{ y: [-34, 18, 18], opacity: [0, 1, 0], rotateY: [0, 540, 720] }}
          transition={{ duration: 1.6, times: [0, 0.6, 1], ease: "easeIn", repeat: Infinity, delay: idx * 0.45 }}
        >
          <span
            className="h-[7px] w-[2px] rounded-full"
            style={{ background: "color-mix(in oklch, var(--warning) 60%, black)" }}
          />
        </motion.span>
      ))}
      {/* "+" — tanga tushganda ko'tariladi */}
      <motion.span
        className="absolute right-[16%] top-1/2 text-[11px] font-bold"
        style={{ color: "var(--accent)" }}
        animate={{ y: [4, -10, -16], opacity: [0, 1, 0] }}
        transition={{ duration: 1.6, times: [0, 0.5, 1], repeat: Infinity, delay: 0.6 }}
      >
        +
      </motion.span>
      <motion.div
        className="relative z-10"
        animate={{ scale: [1, 1.12, 1], y: [0, -1.5, 0] }}
        transition={{ duration: 1.6, times: [0, 0.62, 0.78], ease: "easeOut", repeat: Infinity }}
      >
        <Wallet className="size-11 text-accent" strokeWidth={1.7} />
      </motion.div>
    </div>
  );
}

/* ─── Boshlash: raketa joyida suzadi, ostida alanga + uchqunlar ─── */
function StartAnim() {
  return (
    <div className="relative grid size-[88px] place-items-center overflow-hidden rounded-[24px] border border-border bg-subtle/40">
      {/* Uchqunlar */}
      {[
        { x: "20%", y: "24%", delay: 0.2 },
        { x: "76%", y: "30%", delay: 0.9 },
        { x: "70%", y: "16%", delay: 1.6 },
      ].map((s, idx) => (
        <motion.span
          key={`s${idx}`}
          className="absolute size-1.5 rounded-full"
          style={{ left: s.x, top: s.y, background: "var(--accent)" }}
          animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity, delay: s.delay }}
        />
      ))}

      {/* Raketa + alanga (birga suzadi) */}
      <motion.div
        className="relative grid place-items-center"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
      >
        <Rocket className="size-11 -rotate-45 text-accent" strokeWidth={1.7} />

        {/* Alanga — nozul ostida lop-lop yonadi */}
        <motion.span
          className="absolute -bottom-1 left-1/2 h-3 w-2 -translate-x-1/2 rounded-full blur-[1px]"
          style={{ background: "var(--warning)", transformOrigin: "top" }}
          animate={{ scaleY: [0.5, 1.15, 0.5], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.4, ease: "easeInOut", repeat: Infinity }}
        />
        {/* Tushuvchi cho'g'lar */}
        {[0, 1].map((idx) => (
          <motion.span
            key={`e${idx}`}
            className="absolute bottom-0 left-1/2 size-1 -translate-x-1/2 rounded-full"
            style={{ background: "var(--warning)" }}
            animate={{ y: [2, 14], opacity: [0.9, 0], scale: [1, 0.3] }}
            transition={{ duration: 0.8, ease: "easeIn", repeat: Infinity, delay: idx * 0.4 }}
          />
        ))}
      </motion.div>
    </div>
  );
}
