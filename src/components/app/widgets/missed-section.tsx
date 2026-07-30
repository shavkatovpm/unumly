"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, Check, ChevronDown, Ban } from "lucide-react";
import type { Plan } from "@/lib/types";
import { DEFER_LIMIT, daysBetween, deferLabel, todayInTashkent } from "@/lib/plan-status";
import { formatDateLong, fromDateInputValue } from "@/lib/dates";
import { playOnComplete } from "@/lib/sounds";
import { cn } from "@/lib/utils";

/** Belgilangandan keyin qator yo'qolib ketishidan oldin animatsiya
 *  ko'rinib qolishi uchun kichik kechikish (TaskRow bilan bir xil). */
const DONE_DELAY_MS = 700;

/** Bugun sahifasining eng pastidagi yopiq bo'lim: muddati o'tgan, lekin
 *  hali 7 kun to'lmagan bajarilmagan rejalar. Har biri uchun ikki amal —
 *  bugunga ko'chirish yoki "kerak emas ekan" (CANCELLED). Hech narsa
 *  o'chirilmaydi. */
export function MissedSection({
  plans,
  onDefer,
  onCancel,
  onToggle,
  onOpen,
}: {
  plans: Plan[];
  onDefer: (id: string) => void;
  onCancel: (id: string, cancelled: boolean) => void;
  /** "Bajardim" — vazifa bajarilgan, faqat belgilash esdan chiqqan bo'lsa. */
  onToggle: (id: string) => void;
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
                  onToggle={onToggle}
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
  onToggle,
  onOpen,
}: {
  plan: Plan;
  today: string;
  onDefer: (id: string) => void;
  onCancel: (id: string, cancelled: boolean) => void;
  onToggle: (id: string) => void;
  onOpen?: (id: string) => void;
}) {
  const daysAgo = daysBetween(plan.scheduledFor, today);
  const defers = deferLabel(plan.deferCount);
  const blocked = plan.deferCount >= DEFER_LIMIT;

  // Belgilangach qator ro'yxatdan chiqib ketadi — shuning uchun avval
  // belgi ko'rinadi, keyin haqiqiy o'zgarish yuboriladi.
  const [pendingDone, setPendingDone] = useState(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function handleToggle() {
    if (pendingDone) {
      // Ikkinchi bosish — bekor qilish
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      setPendingDone(false);
      return;
    }
    playOnComplete();
    setPendingDone(true);
    timerRef.current = window.setTimeout(() => {
      onToggle(plan.id);
      timerRef.current = null;
    }, DONE_DELAY_MS);
  }

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={handleToggle}
          aria-label={pendingDone ? "Bekor qilish" : "Bajarildi"}
          title="Bajardim — belgilash esdan chiqqan bo'lsa"
          className="group/check mt-px shrink-0 cursor-pointer"
        >
          <span
            className={cn(
              "grid size-[21px] place-items-center rounded-md border transition-all duration-200",
              pendingDone
                ? "border-accent bg-accent check-fill"
                : "border-border-strong group-hover/check:border-accent"
            )}
          >
            {pendingDone && (
              <Check className="size-[14px] text-background check-pop" strokeWidth={5} />
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onOpen?.(plan.id)}
          className="min-w-0 flex-1 text-left"
        >
          <p
            className={cn(
              "truncate text-[13.5px] transition-colors",
              pendingDone ? "text-faint line-through" : "text-foreground"
            )}
          >
            {plan.title}
          </p>
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

      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[31px]">
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
        <p className="mt-1.5 pl-[31px] text-[10.5px] text-warning">
          {DEFER_LIMIT} marta ko&apos;chirilgan — bugun bajaring yoki kerak emas deb belgilang.
        </p>
      )}
    </li>
  );
}
