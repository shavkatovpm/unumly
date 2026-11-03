"use client";

/**
 * Pomodoro taymer mantig'i — desktop va mobil ko'rinish bitta holatni
 * bo'lishadi. Taymer xatti-harakati avvalgi PomodoroView bilan bir xil:
 * Fokus/Tanaffus mustaqil daqiqalari, vaqt tugaganda ovoz + bildirishnoma
 * va keyingi davrga o'tish. Qo'shimcha (faqat qurilmada, serverga
 * yozilmaydi): fokus vazifasi va bugungi fokus sessiyalari.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isSoundEnabled, playTimerEnd } from "@/lib/sounds";
import { dateKey } from "@/lib/money";

export type Mode = "focus" | "break";

export const MODE_LABEL: Record<Mode, string> = {
  focus: "Fokus",
  break: "Tanaffus",
};

export const MIN_MIN: Record<Mode, number> = { focus: 5, break: 1 };
export const MAX_MIN: Record<Mode, number> = { focus: 90, break: 30 };
export const STEP_MIN: Record<Mode, number> = { focus: 5, break: 1 };

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
export function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

/* ─── Bugungi sessiyalar va vazifa (localStorage) ─── */

export type FocusSession = { id: string; task: string | null; minutes: number; start: number; end: number };
type Log = { day: string; sessions: FocusSession[]; task: string | null };

const LOG_KEY = "unumly:pomodoro:log";
const EMPTY_LOG: Log = { day: "", sessions: [], task: null };
let logCache: Log | null = null;
const logListeners = new Set<() => void>();

function readLog(): Log {
  const today = dateKey();
  if (logCache && logCache.day === today) return logCache;
  let saved: Partial<Log> | null = null;
  try {
    saved = JSON.parse(window.localStorage.getItem(LOG_KEY) ?? "null");
  } catch { /* buzilgan yozuv — e'tiborsiz */ }
  logCache = {
    day: today,
    // Kun almashsa — sessiyalar yangidan, tanlangan vazifa qoladi.
    sessions: saved?.day === today && Array.isArray(saved.sessions) ? saved.sessions : [],
    task: typeof saved?.task === "string" ? saved.task : null,
  };
  return logCache;
}
function writeLog(patch: Partial<Log>) {
  logCache = { ...readLog(), ...patch };
  try { window.localStorage.setItem(LOG_KEY, JSON.stringify(logCache)); } catch { /* to'lgan/bloklangan */ }
  for (const l of logListeners) l();
}
function subscribeLog(cb: () => void) {
  logListeners.add(cb);
  return () => { logListeners.delete(cb); };
}

export function usePomodoroLog() {
  return useSyncExternalStore(subscribeLog, readLog, () => EMPTY_LOG);
}
export function setFocusTask(task: string | null) {
  writeLog({ task: task?.trim() || null });
}

/* ─── Taymer ─── */

export function usePomodoro() {
  // Fokus va tanaffus daqiqalari mustaqil — +/- qaysi rejim tanlangan
  // bo'lsa, aynan o'shani sozlaydi.
  const [minutes, setMinutes] = useState<Record<Mode, number>>({ focus: 25, break: 5 });
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(minutes.focus * 60);
  const [running, setRunning] = useState(false);
  const [cyclesDone, setCyclesDone] = useState(0);
  // Taxminiy tugash vaqti (mobil "…da tugaydi" uchun) — start bosilganda olinadi.
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const notifiedRef = useRef(false);
  // Joriy fokus qachon boshlangan — sessiya tarixi uchun.
  const focusStartRef = useRef<number | null>(null);

  function recordFocus(spentMin: number) {
    const end = Date.now();
    const start = focusStartRef.current ?? end - spentMin * 60000;
    focusStartRef.current = null;
    if (spentMin < 1) return;
    const log = readLog();
    writeLog({ sessions: [...log.sessions, { id: `${end}`, task: log.task, minutes: spentMin, start, end }] });
  }

  function adjustMinutes(deltaMin: number, target: Mode = mode) {
    const next = Math.max(MIN_MIN[target], Math.min(MAX_MIN[target], minutes[target] + deltaMin));
    if (next === minutes[target]) return;
    setMinutes((m) => ({ ...m, [target]: next }));
    if (!running && target === mode) setSecondsLeft(next * 60);
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
    if (mode === "focus") {
      setCyclesDone((c) => c + 1);
      recordFocus(minutes.focus);
    }
    setMode(nextMode);
    setSecondsLeft(minutes[nextMode] * 60);
    setRunning(false);
    setEndsAt(null);
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
    if (!running) {
      if (mode === "focus" && focusStartRef.current === null) focusStartRef.current = Date.now();
      setEndsAt(Date.now() + secondsLeft * 1000);
    } else {
      setEndsAt(null);
    }
    setRunning((r) => !r);
  }

  function reset() {
    setRunning(false);
    setEndsAt(null);
    focusStartRef.current = null;
    setSecondsLeft(minutes[mode] * 60);
  }

  function skip() {
    const nextMode: Mode = mode === "focus" ? "break" : "focus";
    if (mode === "focus") {
      setCyclesDone((c) => c + 1);
      // O'tkazib yuborilgan fokus — kamida 1 daqiqa ishlangan bo'lsa tarixga yoziladi.
      recordFocus(Math.floor((minutes.focus * 60 - secondsLeft) / 60));
    }
    setMode(nextMode);
    setSecondsLeft(minutes[nextMode] * 60);
    setRunning(false);
    setEndsAt(null);
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    focusStartRef.current = null;
    setMode(next);
    setSecondsLeft(minutes[next] * 60);
    setRunning(false);
    setEndsAt(null);
  }

  const total = minutes[mode] * 60;
  const pct = Math.max(0, Math.min(100, ((total - secondsLeft) / total) * 100));

  return {
    minutes,
    mode,
    secondsLeft,
    running,
    cyclesDone,
    endsAt,
    total,
    pct,
    adjustMinutes,
    toggleRunning,
    reset,
    skip,
    switchMode,
  };
}

export type Pomodoro = ReturnType<typeof usePomodoro>;
