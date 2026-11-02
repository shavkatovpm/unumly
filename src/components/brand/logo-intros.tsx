"use client";

import { useEffect, useId, useState } from "react";
import { motion } from "framer-motion";
import {
  LOGO_GLYPH_PATH,
  LOGO_STROKE_PATH,
  LOGO_STROKE_WIDTH,
} from "./logo-paths";

const NIGHT = "#0e0e0e";

type IntroProps = {
  /** Ilova yuklanib bo'ldimi. Animatsiya tugasa ham, shu `true` bo'lguncha kutadi */
  ready: boolean;
  /** Sahna to'liq erib bo'lgach chaqiriladi */
  onDone?: () => void;
};

/**
 * Qorong'i sahna: markazda harf. Ilovaga faqat ikkala shart bajarilganda eriydi:
 * animatsiya `playFor` soniya to'liq o'ynagan va `ready` true bo'lgan.
 */
function LightStage({
  playFor,
  ready,
  onDone,
  children,
}: IntroProps & {
  playFor: number;
  children: React.ReactNode;
}) {
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPlayed(true), playFor * 1000);
    return () => clearTimeout(timer);
  }, [playFor]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: NIGHT }}
      initial={{ opacity: 1 }}
      animate={{ opacity: played && ready ? 0 : 1 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (played && ready) onDone?.();
      }}
    >
      <svg
        viewBox="0 0 512 512"
        className="relative overflow-visible"
        style={{ width: "58cqmin", height: "58cqmin" }}
      >
        {children}
      </svg>
    </motion.div>
  );
}

/** Yorug'lik qalamdek harfni yozish tartibida bosib o'tadi */
export function IntroTrace({ ready, onDone }: IntroProps) {
  const maskId = useId();
  const softId = useId();
  const clipId = useId();
  const write = { delay: 0.1, duration: 1.4, ease: [0.45, 0.05, 0.4, 1] } as const;
  const region = { x: 0, y: 0, width: 512, height: 512 };
  return (
    <LightStage playFor={2} ready={ready} onDone={onDone}>
      <defs>
        <filter id={softId} filterUnits="userSpaceOnUse" {...region}>
          <feGaussianBlur stdDeviation={9} />
        </filter>
        <mask id={maskId} maskUnits="userSpaceOnUse" {...region}>
          <g filter={`url(#${softId})`}>
            <motion.path
              d={LOGO_STROKE_PATH}
              fill="none"
              stroke="#fff"
              strokeWidth={LOGO_STROKE_WIDTH + 30}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: write,
                opacity: { delay: write.delay, duration: 0.01 },
              }}
            />
          </g>
        </mask>
        <clipPath id={clipId}>
          <path d={LOGO_GLYPH_PATH} clipRule="evenodd" />
        </clipPath>
      </defs>
      <path
        d={LOGO_GLYPH_PATH}
        fill="#fff"
        fillRule="evenodd"
        mask={`url(#${maskId})`}
      />
      {/* Qalam uchidagi nur, harf chetidan chiqmaydi. CSS blur iOS WebKit'da SVG
          ichida ishlamaydi — faqat SVG filtri bilan xira bo'ladi */}
      <g clipPath={`url(#${clipId})`}>
        <g filter={`url(#${softId})`}>
          <motion.path
            d={LOGO_STROKE_PATH}
            fill="none"
            stroke="#fff"
            strokeWidth={34}
            strokeLinecap="round"
            initial={{ pathLength: 0.04, pathOffset: 0, opacity: 0 }}
            animate={{ pathOffset: 0.96, opacity: [0, 0.9, 0.9, 0] }}
            transition={{
              pathOffset: write,
              opacity: { ...write, ease: "linear", times: [0, 0.08, 0.92, 1] },
            }}
          />
        </g>
      </g>
    </LightStage>
  );
}
