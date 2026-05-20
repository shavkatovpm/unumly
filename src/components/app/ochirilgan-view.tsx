"use client";

import { useMemo } from "react";
import { Clock, RotateCcw, Trash2 } from "lucide-react";
import {
  purgePlan,
  restorePlan,
  useDeletedPlans,
  useHydrated,
} from "@/lib/plans-store";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useConfirmRemove } from "./widgets/confirm-dialog";
import { ListLoader } from "./widgets/list-loader";

const PRIORITY_DOT: Record<NonNullable<Plan["priority"]>, string> = {
  HIGH: "bg-priority-high",
  MEDIUM: "bg-priority-medium",
  LOW: "bg-priority-low",
};

const TRASH_TTL_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysLeft(deletedAt?: string): number {
  if (!deletedAt) return TRASH_TTL_DAYS;
  const t = Date.parse(deletedAt);
  if (Number.isNaN(t)) return TRASH_TTL_DAYS;
  const elapsed = Date.now() - t;
  return Math.max(0, Math.ceil((TRASH_TTL_DAYS * MS_PER_DAY - elapsed) / MS_PER_DAY));
}

export function OchirilganView() {
  const deleted = useDeletedPlans();
  const hydrated = useHydrated();
  const { askRemove, confirmEl } = useConfirmRemove(deleted, purgePlan, {
    title: "Butunlay o'chirish",
    description:
      '"{title}" butunlay o\'chiriladi. Bu amalni qaytarib bo\'lmaydi.',
    confirmLabel: "Butunlay o'chirish",
  });

  const sorted = useMemo(
    () =>
      deleted
        .slice()
        .sort((a, b) =>
          (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "")
        ),
    [deleted]
  );

  return (
    <div data-scroll-lock-on-focus className="flex h-screen flex-col overflow-y-auto">
      <header className="flex h-12 items-center justify-between gap-2 border-b border-border px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] sm:text-[13px]">
            O&apos;chirilgan
          </h1>
          <span className="truncate text-[13px] text-faint sm:text-[12px]">
            30 kundan keyin avtomatik o&apos;chadi
          </span>
        </div>
        <p className="shrink-0 font-mono text-[11px] tabular-nums text-faint">
          {deleted.length}
        </p>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:py-8 md:pb-8">
        {deleted.length === 0 && !hydrated ? (
          <ListLoader />
        ) : deleted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
            <Trash2 className="mx-auto size-6 text-faint" strokeWidth={1.5} />
            <p className="mt-3 text-[13.5px] text-muted">
              Savatcha bo&apos;sh.
            </p>
            <p className="mt-1 text-[11.5px] text-faint">
              O&apos;chirilgan rejalar 30 kun davomida shu yerda saqlanadi.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
            {sorted.map((p) => (
              <DeletedRow
                key={p.id}
                plan={p}
                onRestore={() => restorePlan(p.id)}
                onPurge={() => askRemove(p.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {confirmEl}
    </div>
  );
}

function DeletedRow({
  plan,
  onRestore,
  onPurge,
}: {
  plan: Plan;
  onRestore: () => void;
  onPurge: () => void;
}) {
  const priorityDot = plan.priority ? PRIORITY_DOT[plan.priority] : "bg-faint/40";
  const left = daysLeft(plan.deletedAt);
  const urgent = left <= 3;

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

      <span className="min-w-0 flex-1 truncate text-[14px] text-muted sm:text-[13.5px]">
        {plan.title}
      </span>

      <span
        className={cn(
          "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
          urgent
            ? "bg-danger-soft text-danger"
            : "bg-subtle text-faint"
        )}
        title={`${left} kun qoldi`}
      >
        {left}k
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
          onClick={onPurge}
          aria-label="Butunlay o'chirish"
          title="Butunlay o'chirish"
          className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}
