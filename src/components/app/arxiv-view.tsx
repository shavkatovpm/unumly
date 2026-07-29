"use client";

import { useMemo } from "react";
import { Archive, Ban, CalendarPlus, Clock } from "lucide-react";
import {
  restorePlanToToday,
  useArchivedPlans,
  useCancelledPlans,
  useHydrated,
} from "@/lib/plans-store";
import { daysBetween, deferLabel, todayInTashkent } from "@/lib/plan-status";
import { formatDateLong, fromDateInputValue } from "@/lib/dates";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ListLoader } from "./widgets/list-loader";

/** Arxiv — bu yerga tushgan reja hech qachon o'chirilmaydi.
 *
 *  Ikki guruh:
 *    • Arxivlangan — 7 kundan ortiq bajarilmay qolgan (holat o'qishda
 *      hisoblanadi, DB'da hamon TODO turadi).
 *    • Kerak emas  — foydalanuvchi "Kerak emas ekan" degan (CANCELLED).
 */
export function ArxivView() {
  const archived = useArchivedPlans();
  const cancelled = useCancelledPlans();
  const hydrated = useHydrated();
  const today = useMemo(() => todayInTashkent(), []);

  const empty = archived.length === 0 && cancelled.length === 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-5">
        <h1 className="text-[19px] font-semibold tracking-tight text-foreground">
          Arxiv
        </h1>
        <p className="mt-1 text-[12.5px] text-muted">
          Bajarilmay qolgan va kerak emas deb belgilangan rejalar. Bu yerdan
          hech narsa o&apos;chirilmaydi — istagan vaqtda bugunga qaytarish mumkin.
        </p>
      </header>

      {empty && !hydrated ? (
        <ListLoader />
      ) : empty ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <p className="text-[13.5px] text-muted">Arxiv bo&apos;sh.</p>
          <p className="mt-1 text-[11px] text-faint">
            7 kundan ortiq bajarilmagan rejalar shu yerga tushadi.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Group
            icon={<Archive className="size-3.5" />}
            label="Arxivlangan"
            hint="7 kundan ortiq bajarilmagan"
            plans={archived}
            today={today}
          />
          <Group
            icon={<Ban className="size-3.5" />}
            label="Kerak emas"
            hint="o'zingiz bekor qilgan"
            plans={cancelled}
            today={today}
          />
        </div>
      )}
    </div>
  );
}

function Group({
  icon,
  label,
  hint,
  plans,
  today,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  plans: Plan[];
  today: string;
}) {
  if (plans.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
      <header className="flex items-center justify-between border-b border-border bg-subtle/30 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded text-faint">
            {icon}
          </span>
          <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">
            {label}
          </p>
          <p className="text-[10.5px] text-faint/70">{hint}</p>
        </div>
        <p className="font-mono text-[10.5px] tabular-nums text-faint">
          {plans.length}
        </p>
      </header>
      <ul className="divide-y divide-border/70">
        {plans.map((p) => (
          <ArxivRow key={p.id} plan={p} today={today} />
        ))}
      </ul>
    </section>
  );
}

function ArxivRow({ plan, today }: { plan: Plan; today: string }) {
  const daysAgo = daysBetween(plan.scheduledFor, today);
  const defers = deferLabel(plan.deferCount);

  return (
    <li className="flex items-start justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[13.5px] text-muted")}>{plan.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-faint">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {formatDateLong(fromDateInputValue(plan.scheduledFor))}
            {daysAgo > 0 && ` · ${daysAgo} kun oldin`}
          </span>
          {defers && <span className="text-warning">{defers}</span>}
        </p>
      </div>
      <button
        type="button"
        onClick={() => restorePlanToToday(plan.id)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11.5px] text-foreground transition-colors hover:bg-subtle"
      >
        <CalendarPlus className="size-3.5" />
        Bugunga
      </button>
    </li>
  );
}
