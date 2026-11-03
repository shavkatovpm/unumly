"use client";

/**
 * Pomodoro / fokus taymeri — Fokus va Tanaffus davrlari, har biri o'z
 * daqiqasiga mustaqil sozlanadi. Vaqt tugaganda "Yog'och/marimba" ovozi
 * (ikkalasi uchun ham) va brauzer notifikatsiyasi chiqadi.
 * Mantiq — ./pomodoro/use-pomodoro; mobil ko'rinish — ./pomodoro/pomodoro-mobile.
 */

import { Minus, Pause, Play, Plus, RotateCcw, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_MIN, MIN_MIN, MODE_LABEL, STEP_MIN, formatClock, usePomodoro, type Mode } from "./pomodoro/use-pomodoro";
import { PomodoroMobile } from "./pomodoro/pomodoro-mobile";

export function PomodoroView() {
  const p = usePomodoro();
  const { minutes, mode, secondsLeft, running, cyclesDone, pct } = p;
  const circumference = 2 * Math.PI * 15;

  return (
    <>
      <div
        data-scroll-lock-on-focus
        className="hidden flex-col overflow-y-auto md:flex"
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
                onClick={() => p.switchMode(m)}
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
              onClick={p.reset}
              aria-label="Qayta boshlash"
              className="grid size-11 place-items-center rounded-full text-faint transition-colors hover:bg-hover hover:text-foreground"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              type="button"
              onClick={p.toggleRunning}
              aria-label={running ? "To'xtatish" : "Boshlash"}
              className="grid size-16 place-items-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              {running ? <Pause className="size-6" strokeWidth={2.5} /> : <Play className="ml-0.5 size-6" strokeWidth={2.5} />}
            </button>
            <button
              type="button"
              onClick={p.skip}
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
              onClick={() => p.adjustMinutes(-STEP_MIN[mode])}
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
              onClick={() => p.adjustMinutes(STEP_MIN[mode])}
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

      <PomodoroMobile p={p} />
    </>
  );
}
