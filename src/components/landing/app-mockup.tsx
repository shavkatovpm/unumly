"use client";

import {
  Check,
  Clock,
  Plus,
  Sunrise,
  Sun,
  Sunset,
  Coffee,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "./i18n";

type Task = {
  title: string;
  time?: string;
  priority: string;
  done?: boolean;
};
type Section = { label: string; tasks: Task[] };

const SECTION_ICONS: LucideIcon[] = [Sunrise, Sun, Sunset, Coffee];

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
  none: "bg-faint/40",
};

function useBugun() {
  const t = useT();
  const sections = t.bugun.sections as unknown as Section[];
  const all = sections.flatMap((s) => s.tasks);
  const total = all.length;
  const done = all.filter((x) => x.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { b: t.bugun, sections, total, done, pct };
}

/** Qotib turadigan yuqori qism: sarlavha + progress + qo'shish satri */
export function BugunHead() {
  const { b, total, done, pct } = useBugun();
  return (
    <>
      <header className="flex h-11 items-center justify-between border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-[13px] font-semibold tracking-[-0.01em]">
            {b.header}
          </h3>
          <span className="truncate text-[12px] text-faint">{b.date}</span>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-faint">
          14:32
        </span>
      </header>

      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <h4 className="min-w-0 truncate text-[15px] font-semibold leading-tight tracking-[-0.02em]">
            {b.greeting}
          </h4>
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="text-right leading-none">
              <p className="font-mono text-[16px] font-semibold tabular-nums leading-none">
                {pct}%
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                {done}/{total}
              </p>
            </div>
            <ProgressRing pct={pct} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 shadow-[0_1px_0_var(--border)]">
          <Plus className="size-3.5 text-faint" />
          <span className="flex-1 text-[13px] text-faint">
            {b.addPlaceholder}
          </span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-faint">
            <Clock className="size-3" />
            {b.timeLabel}
          </span>
          <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-faint sm:inline">
            ↵
          </kbd>
        </div>
      </div>
    </>
  );
}

/** Scroll bo'ladigan pastki qism: vazifa bo'limlari */
export function BugunBody() {
  const { sections } = useBugun();
  return (
    <div className="space-y-3 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
      {sections.map((s, si) => {
        const Icon = SECTION_ICONS[si] ?? Coffee;
        return (
          <section
            key={s.label}
            className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]"
          >
            <header className="flex items-center justify-between border-b border-border bg-subtle/30 px-3 py-1.5">
              <div className="flex items-center gap-2">
                <span className="grid size-5 place-items-center text-faint">
                  <Icon className="size-3.5" />
                </span>
                <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">
                  {s.label}
                </p>
              </div>
              <p className="font-mono text-[10.5px] tabular-nums text-faint">
                {s.tasks.length}
              </p>
            </header>
            <ul className="divide-y divide-border/70">
              {s.tasks.map((task) => (
                <TaskRow key={task.title} task={task} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const done = !!task.done;
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-3 py-2.5",
        done && "bg-subtle/30"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          PRIORITY_DOT[task.priority] ?? "bg-faint/40",
          done && "opacity-40"
        )}
      />

      {task.time && (
        <span
          className={cn(
            "flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums",
            done ? "text-faint" : "bg-subtle text-foreground"
          )}
        >
          <Clock className="size-2.5" />
          {task.time}
        </span>
      )}

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[13px] leading-snug",
          done && "text-faint line-through decoration-faint/60"
        )}
      >
        {task.title}
      </span>

      <span
        className={cn(
          "grid size-[20px] shrink-0 place-items-center rounded-md border",
          done ? "border-accent bg-accent" : "border-border-strong"
        )}
      >
        {done && (
          <Check className="size-[13px] text-background" strokeWidth={4} />
        )}
      </span>
    </li>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  return (
    <div className="relative grid size-10 place-items-center">
      <svg viewBox="0 0 36 36" className="-rotate-90">
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="var(--subtle)"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
