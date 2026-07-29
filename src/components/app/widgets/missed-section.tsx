"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, ChevronDown, Ban } from "lucide-react";
import type { Plan } from "@/lib/types";
import { DEFER_LIMIT, daysBetween, deferLabel, todayInTashkent } from "@/lib/plan-status";
import { formatDateLong, fromDateInputValue } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Bugun sahifasining eng pastidagi yopiq bo'lim: muddati o'tgan, lekin
 *  hali 7 kun to'lmagan bajarilmagan rejalar. Har biri uchun ikki amal —
 *  bugunga ko'chirish yoki "kerak emas ekan" (CANCELLED). Hech narsa
 *  o'chirilmaydi. */
export function MissedSection({
  plans,
  onDefer,
  onCancel,
  onOpen,
}: {
  plans: Plan[];
  onDefer: (id: string) => void;
  onCancel: (id: string, cancelled: boolean) => void;
  onOpen?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = todayInTashkent();

  if (plans.length === 0) return null;

  return (
    <section className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-border",
          "bg-subtle/30 px-3 py-2 text-left transition-colors hover:bg-subtle/60"
        )}
      >
        <span className="flex items-center gap-2">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">
            Bajarilmagan
          </span>
          <span className="font-mono text-[10.5px] tabular-nums text-faint">
            {plans.length}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-faint transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <ul className="mt-2 divide-y divide-border/70 overflow-hidden rounded-lg border border-border bg-surface">
              {plans.map((p) => (
                <MissedRow
                  key={p.id}
                  plan={p}
                  today={today}
                  onDefer={onDefer}
                  onCancel={onCancel}
                  onOpen={onOpen}
                />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function MissedRow({
  plan,
  today,
  onDefer,
  onCancel,
  onOpen,
}: {
  plan: Plan;
  today: string;
  onDefer: (id: string) => void;
  onCancel: (id: string, cancelled: boolean) => void;
  onOpen?: (id: string) => void;
}) {
  const daysAgo = daysBetween(plan.scheduledFor, today);
  const defers = deferLabel(plan.deferCount);
  const blocked = plan.deferCount >= DEFER_LIMIT;

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpen?.(plan.id)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-[13.5px] text-foreground">{plan.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-faint">
            <span>
              {formatDateLong(fromDateInputValue(plan.scheduledFor))}
              {" · "}
              {daysAgo === 1 ? "kecha" : `${daysAgo} kun oldin`}
            </span>
            {defers && <span className="text-warning">{defers}</span>}
          </p>
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={blocked}
          onClick={() => onDefer(plan.id)}
          title={
            blocked
              ? `${DEFER_LIMIT} marta ko'chirilgan — endi ko'chirib bo'lmaydi. Bajaring yoki "Kerak emas ekan" deng.`
              : undefined
          }
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] transition-colors",
            blocked
              ? "cursor-not-allowed border-border/60 text-faint/60"
              : "border-border text-foreground hover:bg-subtle"
          )}
        >
          <CalendarPlus className="size-3.5" />
          Bugunga ko&apos;chirish
        </button>
        <button
          type="button"
          onClick={() => onCancel(plan.id, true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11.5px] text-muted transition-colors hover:bg-subtle"
        >
          <Ban className="size-3.5" />
          Kerak emas ekan
        </button>
      </div>

      {blocked && (
        <p className="mt-1.5 text-[10.5px] text-warning">
          {DEFER_LIMIT} marta ko&apos;chirilgan — bugun bajaring yoki kerak emas deb belgilang.
        </p>
      )}
    </li>
  );
}
