"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, Check, Clock, Plus, X } from "lucide-react";
import { usePlans } from "@/lib/plans-store";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  formatUzDate,
  fromDateInputValue,
  parseTimeToMinutes,
  startOfDay,
  toDateInputValue,
} from "@/lib/dates";
import { MiniMonth } from "./kalendar/mini-month";

const UZ_WEEKDAYS = [
  "yakshanba", "dushanba", "seshanba", "chorshanba",
  "payshanba", "juma", "shanba",
];

function labelFor(date: Date, today: Date): string {
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 1) return "Ertaga";
  if (diff > 1 && diff < 7) return UZ_WEEKDAYS[date.getDay()];
  return formatUzDate(date);
}

function shortDateLabel(date: Date, today: Date): string {
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 1) return "Ertaga";
  if (diff > 1 && diff < 7) return UZ_WEEKDAYS[date.getDay()];
  const day = date.getDate();
  const month = date.toLocaleDateString("uz-UZ", { month: "short" });
  return `${day} ${month}`;
}

export function AgendaView() {
  const { plans, create, toggleStatus, remove } = usePlans();
  const today = useMemo(() => startOfDay(), []);
  const todayIso = useMemo(() => toDateInputValue(today), [today]);

  // Form state
  const tomorrow = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }, [today]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>(tomorrow);
  const [time, setTime] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showCalendar) return;
    function onClick(e: MouseEvent) {
      if (!calendarWrapRef.current?.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showCalendar]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    create({
      title: t,
      scope: "DAILY",
      scheduledFor: toDateInputValue(date),
      time: time || undefined,
    });
    setTitle("");
    setTime("");
    setShowTime(false);
    setShowCalendar(false);
    inputRef.current?.focus();
  }

  const upcoming = useMemo(() => {
    return plans
      .filter((p) => p.scope === "DAILY" && p.scheduledFor > todayIso)
      .sort((a, b) => {
        if (a.scheduledFor !== b.scheduledFor) {
          return a.scheduledFor.localeCompare(b.scheduledFor);
        }
        if (a.status !== b.status) return a.status === "DONE" ? 1 : -1;
        const at = a.time ? parseTimeToMinutes(a.time) : Number.POSITIVE_INFINITY;
        const bt = b.time ? parseTimeToMinutes(b.time) : Number.POSITIVE_INFINITY;
        if (at !== bt) return at - bt;
        return a.createdAt.localeCompare(b.createdAt);
      });
  }, [plans, todayIso]);

  const groups = useMemo(() => {
    const map = new Map<string, Plan[]>();
    for (const p of upcoming) {
      const arr = map.get(p.scheduledFor) ?? [];
      arr.push(p);
      map.set(p.scheduledFor, arr);
    }
    return Array.from(map.entries()).map(([iso, items]) => ({
      iso,
      date: fromDateInputValue(iso),
      items,
    }));
  }, [upcoming]);

  const total = upcoming.length;
  const done = upcoming.filter((p) => p.status === "DONE").length;
  const isPastSelected = toDateInputValue(date) <= todayIso;

  return (
    <div className="flex h-screen flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex h-12 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-[13px] font-semibold tracking-[-0.01em]">Agenda</h1>
          <span className="text-[12px] text-faint">Yaqin kunlar</span>
        </div>
        {total > 0 && (
          <p className="font-mono text-[11px] tabular-nums text-faint">
            {done}/{total}
          </p>
        )}
      </header>

      {/* Content */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        {/* Add task form */}
        <form
          onSubmit={submit}
          className="rise-in overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)] transition-colors focus-within:border-border-strong"
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <Plus className="size-3.5 text-faint" />
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Yangi reja qo'shish..."
              className="flex-1 bg-transparent text-[13.5px] placeholder:text-faint focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setShowCalendar((v) => !v);
                setShowTime(false);
              }}
              className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors",
                showCalendar
                  ? "bg-accent-soft text-accent-ink"
                  : isPastSelected
                  ? "bg-warm/10 text-warm hover:bg-warm/20"
                  : "text-muted hover:bg-hover hover:text-foreground"
              )}
            >
              <CalendarIcon className="size-3" />
              {shortDateLabel(date, today)}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowTime((v) => !v);
                setShowCalendar(false);
              }}
              className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] transition-colors",
                showTime
                  ? "bg-accent-soft text-accent-ink"
                  : "text-faint hover:bg-hover hover:text-foreground"
              )}
            >
              <Clock className="size-3" />
              {time || "vaqt"}
            </button>
            <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-faint sm:inline">
              ↵
            </kbd>
          </div>

          {showTime && (
            <div className="border-t border-border bg-subtle/40 px-3 py-2">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-[12px] tabular-nums focus:border-border-strong focus:outline-none"
              />
            </div>
          )}

          {showCalendar && (
            <div
              ref={calendarWrapRef}
              className="border-t border-border bg-subtle/40 p-3"
            >
              <MiniMonth
                today={today}
                selected={date}
                plans={plans}
                onSelect={(d) => {
                  setDate(d);
                  setShowCalendar(false);
                }}
              />
              <p className="mt-2 text-center text-[11px] text-faint">
                Bugundan keyingi kunni tanlang. Bugun uchun{" "}
                <span className="text-muted">Bugun</span> bo&apos;limidan foydalaning.
              </p>
            </div>
          )}
        </form>

        {/* List */}
        <div className="rise-in mt-6" style={{ animationDelay: "60ms" }}>
          {groups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
              <p className="text-[13.5px] text-muted">
                Yaqin kunlarda hech narsa yo&apos;q.
              </p>
              <p className="mt-1 text-[11px] text-faint">
                Yuqoridagi maydondan ertangi yoki keyingi kunlarga reja qo&apos;shing.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((g) => (
                <section key={g.iso}>
                  <header className="mb-2 flex items-baseline gap-3 px-1">
                    <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
                      {labelFor(g.date, today)}
                    </h3>
                    <span className="text-[11.5px] text-faint">{formatUzDate(g.date)}</span>
                    <span className="ml-auto font-mono text-[10.5px] tabular-nums text-faint">
                      {g.items.filter((p) => p.status === "DONE").length}/{g.items.length}
                    </span>
                  </header>

                  <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
                    {g.items.map((p) => {
                      const isDone = p.status === "DONE";
                      return (
                        <li
                          key={p.id}
                          className={cn(
                            "group flex items-center gap-3 border-b border-border/70 px-3 py-2 last:border-b-0 transition-colors hover:bg-hover/60",
                            isDone && "bg-subtle/30"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleStatus(p.id)}
                            aria-label="Holatni o'zgartirish"
                            className={cn(
                              "grid size-[18px] shrink-0 place-items-center rounded-md border transition-all",
                              isDone ? "border-accent bg-accent" : "border-border-strong hover:border-accent"
                            )}
                          >
                            {isDone && <Check className="size-2.5 text-white" strokeWidth={4} />}
                          </button>

                          {p.time ? (
                            <span
                              className={cn(
                                "flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums",
                                isDone ? "text-faint" : "bg-subtle text-foreground"
                              )}
                            >
                              <Clock className="size-2.5" />
                              {p.time}
                            </span>
                          ) : (
                            <span className="w-[58px] shrink-0 text-center font-mono text-[10.5px] text-faint">
                              vaqtsiz
                            </span>
                          )}

                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate text-[13.5px]",
                              isDone && "text-faint line-through"
                            )}
                          >
                            {p.title}
                          </span>

                          <button
                            type="button"
                            onClick={() => remove(p.id)}
                            aria-label="O'chirish"
                            className="grid size-6 shrink-0 place-items-center rounded text-faint opacity-0 transition-all hover:text-foreground group-hover:opacity-100"
                          >
                            <X className="size-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
