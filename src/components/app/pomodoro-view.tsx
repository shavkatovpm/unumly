"use client";

/**
 * Pomodoro / fokus taymeri — Fokus va Tanaffus davrlari, har biri o'z
 * daqiqasiga mustaqil sozlanadi. Vaqt tugaganda "Yog'och/marimba" ovozi
 * (ikkalasi uchun ham) va brauzer notifikatsiyasi chiqadi.
 */

import { useEffect, useRef, useState } from "react";
import { Minus, Pause, Play, Plus, RotateCcw, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSoundEnabled, playTimerEnd } from "@/lib/sounds";

type Mode = "focus" | "break";

const MODE_LABEL: Record<Mode, string> = {
  focus: "Fokus",
  break: "Tanaffus",
};

const MIN_MIN: Record<Mode, number> = { focus: 5, break: 1 };
const MAX_MIN: Record<Mode, number> = { focus: 90, break: 30 };
const STEP_MIN: Record<Mode, number> = { focus: 5, break: 1 };

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

export function PomodoroView() {
  // Fokus va tanaffus daqiqalari mustaqil — pastdagi +/- qaysi rejim
  // tanlangan bo'lsa, aynan o'shani sozlaydi.
  const [minutes, setMinutes] = useState<Record<Mode, number>>({ focus: 25, break: 5 });
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(minutes.focus * 60);
  const [running, setRunning] = useState(false);
  const [cyclesDone, setCyclesDone] = useState(0);
  const notifiedRef = useRef(false);

  function adjustMinutes(deltaMin: number) {
    const next = Math.max(MIN_MIN[mode], Math.min(MAX_MIN[mode], minutes[mode] + deltaMin));
    if (next === minutes[mode]) return;
    setMinutes((m) => ({ ...m, [mode]: next }));
    if (!running) setSecondsLeft(next * 60);
  }

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (secondsLeft > 0) return;
    if (notifiedRef.current) return;
    notifiedRef.current = true;

    if (isSoundEnabled()) playTimerEnd("wood-tap");
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const nextLabel = mode === "focus" ? "Tanaffus vaqti!" : "Fokus vaqti!";
      new Notification("Pomodoro", { body: nextLabel, icon: "/icon.png" });
    }

    const nextMode: Mode = mode === "focus" ? "break" : "focus";
    if (mode === "focus") setCyclesDone((c) => c + 1);
    setMode(nextMode);
    setSecondsLeft(minutes[nextMode] * 60);
    setRunning(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  useEffect(() => {
    notifiedRef.current = false;
  }, [mode]);

  useEffect(() => {
    document.title = running
      ? `${formatClock(secondsLeft)} · ${MODE_LABEL[mode]} — Pomodoro`
      : "Unumly";
    return () => {
      document.title = "Unumly";
    };
  }, [secondsLeft, running, mode]);

  function toggleRunning() {
    if (!running && typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    setRunning((r) => !r);
  }

  function reset() {
    setRunning(false);
    setSecondsLeft(minutes[mode] * 60);
  }

  function skip() {
    const nextMode: Mode = mode === "focus" ? "break" : "focus";
    if (mode === "focus") setCyclesDone((c) => c + 1);
    setMode(nextMode);
    setSecondsLeft(minutes[nextMode] * 60);
    setRunning(false);
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setSecondsLeft(minutes[next] * 60);
    setRunning(false);
  }

  const total = minutes[mode] * 60;
  const pct = Math.max(0, Math.min(100, ((total - secondsLeft) / total) * 100));
  const circumference = 2 * Math.PI * 15;

  return (
    <div
      data-scroll-lock-on-focus
      className="flex flex-col overflow-y-auto"
      style={{ height: "var(--tg-vh, 100vh)" }}
    >
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4 md:px-6">
        <h1 className="text-[15px] font-semibold tracking-[-0.01em] sm:text-[13px]">Pomodoro</h1>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
        <div className="flex items-center gap-1 rounded-full bg-subtle/60 p-1 text-[12.5px]">
          {(["focus", "break"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={cn(
                "rounded-full px-3 py-1.5 font-medium transition-all",
                mode === m ? "bg-surface text-foreground shadow-sm" : "text-faint hover:text-muted"
              )}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        <div className="relative grid size-[280px] place-items-center sm:size-[320px]">
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--subtle)" strokeWidth="1.5" />
            <circle
              cx="18" cy="18" r="15"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
              className="transition-[stroke-dasharray] duration-1000 ease-linear"
            />
          </svg>
          <div className="flex flex-col items-center gap-1.5">
            <p className="font-mono text-[56px] font-semibold leading-none tabular-nums tracking-tight sm:text-[64px]">
              {formatClock(Math.max(0, secondsLeft))}
            </p>
            <p className="text-[13px] text-muted">{MODE_LABEL[mode]}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            aria-label="Qayta boshlash"
            className="grid size-11 place-items-center rounded-full text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            type="button"
            onClick={toggleRunning}
            aria-label={running ? "To'xtatish" : "Boshlash"}
            className="grid size-16 place-items-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            {running ? <Pause className="size-6" strokeWidth={2.5} /> : <Play className="ml-0.5 size-6" strokeWidth={2.5} />}
          </button>
          <button
            type="button"
            onClick={skip}
            aria-label="Keyingisiga o'tish"
            className="grid size-11 place-items-center rounded-full text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            <SkipForward className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={running || minutes[mode] <= MIN_MIN[mode]}
            onClick={() => adjustMinutes(-STEP_MIN[mode])}
            className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <Minus className="size-3.5" />
          </button>
          <p className="w-[130px] text-center text-[12px] text-faint">
            {MODE_LABEL[mode]}: <span className="font-mono tabular-nums text-muted">{minutes[mode]} daq</span>
          </p>
          <button
            type="button"
            disabled={running || minutes[mode] >= MAX_MIN[mode]}
            onClick={() => adjustMinutes(STEP_MIN[mode])}
            className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        {cyclesDone > 0 && (
          <p className="font-mono text-[11px] tabular-nums text-faint">
            Bugun bajarilgan: {cyclesDone} ta fokus
          </p>
        )}
      </div>
    </div>
  );
}
