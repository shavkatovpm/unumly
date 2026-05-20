"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, RotateCcw, Trash2 } from "lucide-react";
import {
  togglePlanStatus,
  removePlan,
  useCompletedPlans,
  useHydrated,
} from "@/lib/plans-store";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatUzDate } from "@/lib/dates";
import { useConfirmRemove } from "./widgets/confirm-dialog";
import { ListLoader } from "./widgets/list-loader";

const PRIORITY_DOT: Record<NonNullable<Plan["priority"]>, string> = {
  HIGH: "bg-priority-high",
  MEDIUM: "bg-priority-medium",
  LOW: "bg-priority-low",
};

function dayKey(iso?: string): string {
  if (!iso) return "—";
  return iso.slice(0, 10); // YYYY-MM-DD
}

export function BajarilganView() {
  const completed = useCompletedPlans();
  const hydrated = useHydrated();
  const { askRemove, confirmEl } = useConfirmRemove(completed, removePlan, {
    description:
      '"{title}" o\'chiriladi va 30 kun davomida "O\'chirilgan" bo\'limida saqlanadi.',
  });

  const groups = useMemo(() => {
    const map = new Map<string, Plan[]>();
    for (const p of completed) {
      const key = dayKey(p.completedAt) || dayKey(p.createdAt);
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .map(([key, items]) => ({
        key,
        date: new Date(key + "T00:00:00"),
        items: items
          .slice()
          .sort((a, b) =>
            (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt)
          ),
      }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [completed]);

  return (
    <div data-scroll-lock-on-focus className="flex h-screen flex-col overflow-y-auto">
      <header className="flex h-12 items-center justify-between gap-2 border-b border-border px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] sm:text-[13px]">
            Bajarilgan
          </h1>
          <span className="truncate text-[13px] text-faint sm:text-[12px]">
            Yakunlangan rejalar
          </span>
        </div>
        <p className="shrink-0 font-mono text-[11px] tabular-nums text-faint">
          {completed.length}
        </p>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:py-8 md:pb-8">
        {completed.length === 0 && !hydrated ? (
          <ListLoader />
        ) : completed.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
            <CheckCircle2 className="mx-auto size-6 text-faint" strokeWidth={1.5} />
            <p className="mt-3 text-[13.5px] text-muted">
              Hozircha bajarilgan reja yo&apos;q.
            </p>
            <p className="mt-1 text-[11.5px] text-faint">
              Bajarilgan ishlar shu yerda saqlanadi va o&apos;chmaydi.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.key}>
                <header className="mb-2 flex items-baseline gap-3 px-1">
                  <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
                    {formatUzDate(g.date)}
                  </h3>
                  <span className="ml-auto font-mono text-[10.5px] tabular-nums text-faint">
                    {g.items.length}
                  </span>
                </header>

                <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
                  {g.items.map((p) => (
                    <CompletedRow
                      key={p.id}
                      plan={p}
                      onRestore={() => togglePlanStatus(p.id)}
                      onRemove={() => askRemove(p.id)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {confirmEl}
    </div>
  );
}

function CompletedRow({
  plan,
  onRestore,
  onRemove,
}: {
  plan: Plan;
  onRestore: () => void;
  onRemove: () => void;
}) {
  const priorityDot = plan.priority ? PRIORITY_DOT[plan.priority] : "bg-faint/40";

  return (
    <li className="group flex items-center gap-3 border-b border-border/70 px-3 py-2.5 last:border-b-0 hover:bg-hover/40">
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full opacity-60", priorityDot)}
      />

      {plan.time ? (
        <span className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-faint">
          <Clock className="size-2.5" />
          {plan.time}
        </span>
      ) : (
        <span className="w-[58px] shrink-0 text-center font-mono text-[10.5px] text-faint">
          vaqtsiz
        </span>
      )}

      <span className="min-w-0 flex-1 truncate text-[14px] text-muted line-through sm:text-[13.5px]">
        {plan.title}
      </span>

      <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-60 sm:transition-opacity sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={onRestore}
          aria-label="Qayta tiklash"
          title="Qayta tiklash"
          className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
        >
          <RotateCcw className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="O'chirish"
          title="O'chirish"
          className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}
