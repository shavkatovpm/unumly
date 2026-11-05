"use client";

/* Pomodoro — mobil ko'rinish (md:hidden). Holat va taymer use-pomodoro'da;
   bu yerda faqat ko'rinish: rejim katakchalari, katta halqa, boshqaruv,
   fokus vazifasi, davomiylik va bugungi sessiyalar. Nav "+" — vazifa tanlash. */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Coffee, Minus, Pause, Play, Plus, RotateCcw, Settings2, SkipForward, Target, Timer, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { dateKey } from "@/lib/money";
import { MonoSwitch } from "../widgets/mono-bits";
import { isSoundEnabled, playTimerEnd, saveEnabled } from "@/lib/sounds";
import { useMobileAdd } from "@/lib/mobile-add";
import { usePlans } from "@/lib/plans-store";
import { MonoHeader, MonoSave, MonoSheet } from "../widgets/mono-sheet";
import { MAX_MIN, MIN_MIN, MODE_LABEL, STEP_MIN, formatClock, setFocusTask, usePomodoroLog, type Mode, type Pomodoro } from "./use-pomodoro";
import { useHideNav } from "@/lib/nav-hidden";

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const hm = (t: number) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
function duration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} soat${m ? ` ${m} daq` : ""}` : `${m} daq`;
}

export function PomodoroMobile({ p }: { p: Pomodoro }) {
  const log = usePomodoroLog();
  const [taskSheet, setTaskSheet] = useState(false);
  const [settings, setSettings] = useState(false);
  useMobileAdd(() => setTaskSheet(true));

  const { mode, minutes, secondsLeft, running, total, endsAt } = p;
  const progress = Math.max(0, Math.min(1, (total - secondsLeft) / total));
  const paused = !running && secondsLeft < total;
  const focusMin = log.sessions.reduce((s, x) => s + x.minutes, 0);
  // Ishlayotganda faqat taymer va pauza tugmasi qoladi: qolgani (pastki nav ham)
  // sekin so'nadi; pauza bosilsa hammasi qaytadi.
  useHideNav(running);
  const fade = cn("transition-opacity duration-500 ease-out", running && "pointer-events-none opacity-0");

  return (
    <div
      data-scroll-lock-on-focus
      className="flex flex-col overflow-y-auto md:hidden"
      style={{ height: "calc(var(--tg-vh, 100vh) - var(--tg-safe-top, 0px))" }}
    >
      <div aria-hidden={running} className={cn("flex items-center justify-between gap-3 px-4 pt-1", fade)}>
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="shrink-0 text-[22px] font-bold tracking-[-0.025em]">Pomodoro</h1>
          <p className="truncate text-[13px] text-muted">
            {log.sessions.length ? `${log.sessions.length} ta fokus · ${duration(focusMin)}` : "Bugun hali fokus yo'q"}
          </p>
        </div>
        <button type="button" onClick={() => setSettings(true)} aria-label="Sozlamalar" className="grid size-10 shrink-0 place-items-center rounded-full bg-subtle text-foreground active:scale-95">
          <Settings2 className="size-5" />
        </button>
      </div>

      <div className="px-4 pb-32 pt-2">
        <div role="radiogroup" aria-label="Rejim" aria-hidden={running} className={cn("grid grid-cols-2 gap-2", fade)}>
          {(["focus", "break"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => p.switchMode(m)}
              className={cn("h-11 rounded-[16px] border text-[14px] font-semibold transition-colors", mode === m ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface text-muted")}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          <TimerRing value={progress}>
            <span className="flex flex-col items-center">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
                {mode === "focus" ? <Target className="size-4" /> : <Coffee className="size-4" />}
                {MODE_LABEL[mode]}
              </span>
              <span className="mt-1 text-[64px] font-bold leading-none tracking-[-0.04em] tabular-nums">{formatClock(Math.max(0, secondsLeft))}</span>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={running ? "r" : paused ? "p" : "i"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 text-[13px] text-faint">
                  {running && endsAt ? `${hm(endsAt)} da tugaydi` : paused ? "Pauzada" : `${minutes[mode]} daqiqa`}
                </motion.span>
              </AnimatePresence>
            </span>
          </TimerRing>
        </div>

        <div className="mt-4 flex items-center justify-center gap-5">
          <button type="button" onClick={p.reset} aria-label="Qayta boshlash" tabIndex={running ? -1 : 0} className={cn("grid size-14 place-items-center rounded-full bg-subtle text-foreground active:scale-95", fade)}>
            <RotateCcw className="size-5" />
          </button>
          <button type="button" onClick={p.toggleRunning} aria-label={running ? "To'xtatish" : "Boshlash"} className={cn("grid size-20 place-items-center rounded-full bg-accent text-accent-ink shadow-lg transition-[transform,opacity] duration-500 active:scale-95", running && "opacity-50")}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={running ? "pause" : "play"} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }} className="grid">
                {running ? <Pause className="size-8" strokeWidth={2.4} fill="currentColor" /> : <Play className="ml-1 size-8" strokeWidth={2.4} fill="currentColor" />}
              </motion.span>
            </AnimatePresence>
          </button>
          <button type="button" onClick={p.skip} aria-label="Keyingisiga o'tish" tabIndex={running ? -1 : 0} className={cn("grid size-14 place-items-center rounded-full bg-subtle text-foreground active:scale-95", fade)}>
            <SkipForward className="size-5" />
          </button>
        </div>

        <div aria-hidden={running} className={fade}>
        <button type="button" onClick={() => setTaskSheet(true)} className="mt-5 flex min-h-[64px] w-full items-center gap-3 rounded-[22px] border border-border bg-surface px-3.5 py-3 text-left active:bg-hover">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-subtle"><Target className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-semibold text-muted">Nima ustida ishlayapsiz?</span>
            <span className={cn("block truncate text-[15.5px] font-semibold", !log.task && "text-faint")}>{log.task ?? "Vazifa tanlash"}</span>
          </span>
          <span className="shrink-0 text-[13px] font-semibold text-muted">{log.task ? "O'zgartirish" : "Tanlash"}</span>
        </button>

        <Stepper mode={mode} value={minutes[mode]} disabled={running} onChange={(d) => p.adjustMinutes(d)} className="mt-3" />

        <div className="mb-1.5 mt-4 flex items-baseline justify-between px-1">
          <p className="text-[13px] font-semibold text-muted">Bugungi sessiyalar</p>
          {log.sessions.length > 0 && <span className="text-[12.5px] tabular-nums text-faint">{duration(focusMin)}</span>}
        </div>
        {log.sessions.length === 0 ? (
          <p className="rounded-[22px] border border-border bg-surface py-8 text-center text-[14px] text-faint">Birinchi fokusni boshlang</p>
        ) : (
          <div className="overflow-hidden rounded-[22px] border border-border bg-surface">
            {[...log.sessions].reverse().map((s, i) => (
              <div key={s.id} className="flex min-h-[60px] items-center gap-3 border-t border-border px-3.5 py-2.5 first:border-t-0">
                <span className="w-6 shrink-0 text-center text-[13px] font-semibold tabular-nums text-faint">{log.sessions.length - i}</span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-[15.5px] font-semibold", !s.task && "text-muted")}>{s.task ?? "Vazifasiz fokus"}</span>
                  <span className="mt-0.5 block text-[13px] tabular-nums text-faint">{hm(s.start)} – {hm(s.end)} · {s.minutes} daq</span>
                </span>
                <span className="grid size-[26px] shrink-0 place-items-center rounded-full border-2 border-accent bg-accent text-accent-ink"><Check className="size-3.5" strokeWidth={3.5} /></span>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      <MonoSheet open={taskSheet} onClose={() => setTaskSheet(false)} label="Fokus vazifasi">
        <TaskPicker value={log.task} onPick={(t) => { setFocusTask(t); setTaskSheet(false); }} onClose={() => setTaskSheet(false)} />
      </MonoSheet>

      <MonoSheet open={settings} onClose={() => setSettings(false)} label="Pomodoro sozlamalari">
        <SettingsBody p={p} onClose={() => setSettings(false)} />
      </MonoSheet>
    </div>
  );
}

function TimerRing({ value, children }: { value: number; children: React.ReactNode }) {
  const size = 280;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--subtle)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - value) }}
          transition={{ duration: 0.4, ease: "linear" }}
        />
      </svg>
      {children}
    </span>
  );
}

function Stepper({ mode, value, disabled, onChange, className }: { mode: Mode; value: number; disabled: boolean; onChange: (delta: number) => void; className?: string }) {
  return (
    <div className={cn("flex min-h-[64px] items-center gap-3 rounded-[22px] border border-border bg-surface px-3.5 py-2.5", className)}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-subtle">{mode === "focus" ? <Timer className="size-5" /> : <Coffee className="size-5" />}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15.5px] font-semibold">{MODE_LABEL[mode]}</span>
        <span className="block truncate text-[13px] text-faint">{disabled ? "Taymer ishlayapti" : `${MIN_MIN[mode]}–${MAX_MIN[mode]} daqiqa`}</span>
      </span>
      <button type="button" disabled={disabled || value <= MIN_MIN[mode]} onClick={() => onChange(-STEP_MIN[mode])} aria-label="Kamaytirish" className="grid size-10 shrink-0 place-items-center rounded-full bg-subtle disabled:opacity-30"><Minus className="size-4" /></button>
      <span className="w-11 text-center leading-none">
        <span className="block text-[18px] font-bold tabular-nums">{value}</span>
        <span className="mt-0.5 block text-[11px] font-medium text-faint">daq</span>
      </span>
      <button type="button" disabled={disabled || value >= MAX_MIN[mode]} onClick={() => onChange(STEP_MIN[mode])} aria-label="Ko'paytirish" className="grid size-10 shrink-0 place-items-center rounded-full bg-subtle disabled:opacity-30"><Plus className="size-4" /></button>
    </div>
  );
}

/* Vazifa: bugungi ochiq tasklardan tanlash yoki o'zi yozish. */
function TaskPicker({ value, onPick, onClose }: { value: string | null; onPick: (t: string | null) => void; onClose: () => void }) {
  const { plans } = usePlans();
  const [draft, setDraft] = useState("");
  const today = dateKey();
  const tasks = useMemo(
    () =>
      plans
        .filter((pl) => pl.scope === "DAILY" && pl.scheduledFor === today && (pl.status === "TODO" || pl.status === "IN_PROGRESS"))
        .sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99") || a.order - b.order)
        .map((pl) => pl.title),
    [plans, today]
  );
  const options = value && !tasks.includes(value) ? [value, ...tasks] : tasks;
  const row = (label: string, on: boolean, pick: () => void, muted?: boolean) => (
    <button key={label} type="button" onClick={pick} className="flex min-h-[60px] w-full items-center gap-3 border-t border-border px-3.5 text-left first:border-t-0 active:bg-hover">
      <span className={cn("min-w-0 flex-1 truncate text-[15.5px] font-semibold", muted && "text-muted")}>{label}</span>
      <span className={cn("grid size-[26px] shrink-0 place-items-center rounded-full border-2", on ? "border-accent bg-accent text-accent-ink" : "border-border-strong")}>{on && <Check className="size-3.5" strokeWidth={3.5} />}</span>
    </button>
  );
  return (
    <>
      <MonoHeader label="Fokus vazifasi" value={draft} onChange={setDraft} placeholder="Nima ustida ishlaysiz?" onEnter={() => draft.trim() && onPick(draft)} onClose={onClose} autoFocus={false} />
      {draft.trim() ? (
        <MonoSave onClick={() => onPick(draft)}>Shu vazifa bilan</MonoSave>
      ) : (
        <>
          <p className="px-2 pt-1 text-[13px] font-semibold text-muted">{tasks.length ? "Bugungi vazifalardan" : "Bugun ochiq vazifa yo'q — o'zingiz yozing"}</p>
          <div className="overflow-hidden rounded-[22px] border border-border bg-surface">
            {options.map((t) => row(t, value === t, () => onPick(t)))}
            {row("Vazifasiz fokus", value === null, () => onPick(null), true)}
          </div>
        </>
      )}
    </>
  );
}

function SettingsBody({ p, onClose }: { p: Pomodoro; onClose: () => void }) {
  // Faqat brauzerda ochiladi (MonoSheet portal) — to'g'ridan-to'g'ri o'qish xavfsiz.
  const [perm, setPerm] = useState<NotificationPermission | "none">(() => (typeof Notification === "undefined" ? "none" : Notification.permission));
  // Ilova bo'yicha umumiy ovoz sozlamasi — Sozlamalar bilan bir joyda saqlanadi.
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  return (
    <>
      <div className="rounded-[24px] border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12.5px] font-semibold text-muted">Pomodoro</p>
            <p className="text-[21px] font-bold tracking-[-0.02em]">Sozlamalar</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Yopish" className="grid size-9 place-items-center rounded-full bg-subtle text-foreground">
            <X className="size-4" strokeWidth={2.4} />
          </button>
        </div>
      </div>
      {(["focus", "break"] as Mode[]).map((m) => (
        <Stepper key={m} mode={m} value={p.minutes[m]} disabled={p.running && m === p.mode} onChange={(d) => p.adjustMinutes(d, m)} />
      ))}
      <div className="overflow-hidden rounded-[22px] border border-border bg-surface [&>*+*]:border-t [&>*+*]:border-border">
        <button
          type="button"
          role="switch"
          aria-checked={soundOn}
          onClick={() => { saveEnabled(!soundOn); setSoundOn(!soundOn); }}
          className="flex min-h-[64px] w-full items-center gap-3 px-3.5 text-left"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-subtle"><Volume2 className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15.5px] font-semibold">Tugash ovozi</span>
            <span className="block text-[13px] text-faint">{soundOn ? "Yog'och / marimba" : "Ovozlar o'chiq"}</span>
          </span>
          <MonoSwitch on={soundOn} />
        </button>
        <button type="button" onClick={() => playTimerEnd("wood-tap")} className="flex min-h-[56px] w-full items-center gap-3 px-3.5 text-left">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-subtle"><Play className="size-4" /></span>
          <span className="flex-1 text-[15.5px] font-semibold">Eshitib ko&apos;rish</span>
        </button>
        <div className="flex min-h-[64px] items-center gap-3 px-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-subtle"><Bell className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15.5px] font-semibold">Bildirishnoma</span>
            <span className="block text-[13px] text-faint">
              {perm === "granted" ? "Yoqilgan — vaqt tugaganda xabar keladi" : perm === "denied" ? "Brauzerda bloklangan" : perm === "none" ? "Bu qurilmada mavjud emas" : "Ruxsat berilmagan"}
            </span>
          </span>
          {perm === "default" && (
            <button type="button" onClick={() => void Notification.requestPermission().then(setPerm)} className="h-10 shrink-0 rounded-full bg-accent px-4 text-[13px] font-semibold text-accent-ink">Ruxsat</button>
          )}
        </div>
      </div>
      <p className="px-2 pb-1 text-[12.5px] leading-relaxed text-faint">Fokus tugagach tanaffus, tanaffusdan keyin yana fokus avtomatik tayyorlanadi — boshlash tugmasini bosish kifoya.</p>
    </>
  );
}
