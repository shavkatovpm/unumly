"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Clock } from "lucide-react";
import { usePlans } from "@/lib/plans-store";
import {
  formatUzDate,
  greeting,
  parseTimeToMinutes,
  startOfDay,
  toDateInputValue,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import { TaskRow } from "./widgets/task-row";

export function BugunView() {
  const { plans, create, toggleStatus, remove } = usePlans();
  const today = useMemo(() => startOfDay(), []);
  const todayIso = useMemo(() => toDateInputValue(today), [today]);

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const todays = useMemo(
    () =>
      plans
        .filter((p) => p.scope === "DAILY" && p.scheduledFor === todayIso)
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "DONE" ? 1 : -1;
          const at = a.time ? parseTimeToMinutes(a.time) : Number.POSITIVE_INFINITY;
          const bt = b.time ? parseTimeToMinutes(b.time) : Number.POSITIVE_INFINITY;
          if (at !== bt) return at - bt;
          return a.order - b.order || a.createdAt.localeCompare(b.createdAt);
        }),
    [plans, todayIso]
  );

  const total = todays.length;
  const done = todays.filter((p) => p.status === "DONE").length;
  const active = todays.filter((p) => p.status !== "DONE");
  const completed = todays.filter((p) => p.status === "DONE");
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Add task form state
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [showTime, setShowTime] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    create({
      title: t,
      scope: "DAILY",
      scheduledFor: todayIso,
      time: time || undefined,
    });
    setTitle("");
    setTime("");
    setShowTime(false);
    inputRef.current?.focus();
  }

  return (
    <div className="flex h-screen flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex h-12 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-[13px] font-semibold tracking-[-0.01em]">Bugun</h1>
          <span className="text-[12px] text-faint">{formatUzDate(today)}</span>
        </div>
        <p className="font-mono text-[11px] tabular-nums text-faint">
          {now
            ? now.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
            : "—"}
        </p>
      </header>

      {/* Content */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        {/* Greeting block */}
        <div className="rise-in">
          <h2 className="text-[28px] font-semibold tracking-[-0.025em] text-foreground">
            {now ? greeting(now) : "Xayrli kun"}
          </h2>
          <p className="mt-1.5 text-[13.5px] text-muted">
            {total === 0
              ? "Bo'sh varaq. Birinchi rejangizni yozing."
              : done === total
              ? `Hammasi bajarildi — ${total} ta reja. Kunni yopish vaqti.`
              : `${done} / ${total} bajarildi · ${active.length} ta qoldi`}
          </p>

          {total > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-subtle">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-mono text-[11px] tabular-nums text-faint">
                {pct}%
              </span>
            </div>
          )}
        </div>

        {/* Add task */}
        <form
          onSubmit={submit}
          className="rise-in mt-8 overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)] transition-colors focus-within:border-border-strong"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <Plus className="size-3.5 text-faint" />
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bugun nima qilmoqchisiz?"
              className="flex-1 bg-transparent text-[13.5px] placeholder:text-faint focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowTime((v) => !v)}
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
        </form>

        {/* Tasks list */}
        <div
          className="rise-in mt-6"
          style={{ animationDelay: "120ms" }}
        >
          {total === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
              <p className="text-[13.5px] text-muted">
                Ro&apos;yxat bo&apos;sh. Yuqoridagi maydonga birinchi rejangizni yozing.
              </p>
              <p className="mt-1 text-[11px] text-faint">
                Vaqt qo&apos;shish uchun ⏱ tugmasini bosing.
              </p>
            </div>
          ) : (
            <>
              {active.length > 0 && (
                <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
                  <header className="flex items-center justify-between border-b border-border bg-subtle/30 px-3 py-1.5">
                    <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">
                      Faol
                    </p>
                    <p className="font-mono text-[10.5px] tabular-nums text-faint">
                      {active.length}
                    </p>
                  </header>
                  <ul className="divide-y divide-border/70">
                    {active.map((p) => (
                      <TaskRow
                        key={p.id}
                        plan={p}
                        onToggle={toggleStatus}
                        onRemove={remove}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {completed.length > 0 && (
                <section className="mt-3 overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
                  <header className="flex items-center justify-between border-b border-border bg-subtle/30 px-3 py-1.5">
                    <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">
                      Bajarilgan
                    </p>
                    <p className="font-mono text-[10.5px] tabular-nums text-faint">
                      {completed.length}
                    </p>
                  </header>
                  <ul className="divide-y divide-border/70">
                    {completed.map((p) => (
                      <TaskRow
                        key={p.id}
                        plan={p}
                        onToggle={toggleStatus}
                        onRemove={remove}
                      />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
