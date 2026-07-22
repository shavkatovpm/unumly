"use client";

/**
 * "Loyiha" bo'limi — to'liq workspace: har bir loyiha o'z Hujjatlar
 * (nested BlockNote sahifalari) va Tasklar (jadval) to'plamiga ega.
 * Bu yerda: loyihalar ro'yxati + kategoriya/vaqt taqsimoti — Barchasi
 * (ro'yxat + A/B/C/D belgilash), Reja (haftalik maqsad), Jadval (necha
 * marta ishlaganingiz), Analitika (reja bo'yicha bajarish %).
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LoyihaBarchasi } from "./loyiha/loyiha-barchasi";
import { LoyihaReja } from "./loyiha/loyiha-reja";
import { LoyihaJadval } from "./loyiha/loyiha-jadval";
import { LoyihaAnalitika } from "./loyiha/loyiha-analitika";

type Tab = "barchasi" | "reja" | "jadval" | "analitika";

const TABS: { key: Tab; label: string }[] = [
  { key: "barchasi", label: "Barchasi" },
  { key: "reja", label: "Reja" },
  { key: "jadval", label: "Jadval" },
  { key: "analitika", label: "Analitika" },
];

export function LoyihaView() {
  const [tab, setTab] = useState<Tab>("barchasi");

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-4 pb-24 pt-3 md:pb-6 lg:max-w-4xl xl:max-w-5xl">
      <header className="mb-4">
        <h1 className="text-[18px] font-semibold tracking-[-0.01em]">Loyiha</h1>
        <p className="mt-0.5 text-[12.5px] text-faint">
          Har biri o&apos;z hujjatlari va tasklariga ega alohida workspace
        </p>
      </header>

      <div className="mb-4 inline-flex w-fit rounded-md border border-border bg-surface p-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
              tab === t.key ? "bg-accent text-accent-ink" : "text-muted hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "barchasi" && <LoyihaBarchasi />}
          {tab === "reja" && <LoyihaReja />}
          {tab === "jadval" && <LoyihaJadval />}
          {tab === "analitika" && <LoyihaAnalitika />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
