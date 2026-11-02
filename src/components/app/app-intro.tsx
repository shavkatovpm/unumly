"use client";

import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { IntroTrace } from "@/components/brand/logo-intros";
import { appData } from "@/lib/app-data";

// Tarmoq osilib qolsa ham foydalanuvchi logoda qamalib qolmasin.
const MAX_WAIT_MS = 8000;

/** Ilovaga kirish: logo ma'lumot yuklanguncha turadi, keyin ilovaga eriydi. */
export function AppIntro() {
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Hozircha faqat mobil uchun.
    if (window.matchMedia("(min-width: 768px)").matches) {
      setDone(true);
      return;
    }
    const timer = window.setTimeout(() => setReady(true), MAX_WAIT_MS);
    void appData().then(() => setReady(true));
    return () => window.clearTimeout(timer);
  }, []);

  if (done) return null;

  return (
    <div className="fixed inset-0 z-[200] md:hidden" style={{ containerType: "size" }}>
      <MotionConfig reducedMotion="user">
        <IntroTrace ready={ready} onDone={() => setDone(true)} />
      </MotionConfig>
    </div>
  );
}
