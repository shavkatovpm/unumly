"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Check, Clock, Repeat, Tag, Target } from "lucide-react";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { playOnComplete } from "@/lib/sounds";

const PRIORITY_DOT: Record<NonNullable<Plan["priority"]>, string> = {
  HIGH:   "bg-priority-high",
  MEDIUM: "bg-priority-medium",
  LOW:    "bg-priority-low",
};

const DONE_DELAY_MS = 700;

export function TaskRow({
  plan,
  onToggle,
  onRemove,
  onOpen,
  isNew = false,
  overdue = false,
  active = false,
  overdueDateLabel,
  staleUntimed = false,
  rejaCategory,
}: {
  plan: Plan;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onOpen?: (id: string) => void;
  isNew?: boolean;
  /** Reja'dan kelgan task — qaysi toifadan ekanini ko'rsatuvchi belgi. */
  rejaCategory?: { label: string; color: string };
  /** When true, time pill renders in red (overdue task). */
  overdue?: boolean;
  /** Vaqti kelgan, davomiyligi tugamagan, bajarilmagan task — ko'k pill. */
  active?: boolean;
  /** Optional date prefix shown inside the red time pill (e.g. "20-may"). */
  overdueDateLabel?: string;
  /** Vaqti belgilanmagan, bajarilmagan va o'tib ketgan kundagi task — sariq
   *  sana belgisi bilan ko'rsatiladi (o'sha kunda qolaveradi). */
  staleUntimed?: boolean;
}) {
  const done = plan.status === "DONE";
  const priorityDot = plan.priority ? PRIORITY_DOT[plan.priority] : "bg-faint/40";

  // Delay the actual status change so the user sees the check animation before
  // the row slides into the completed section.
  const [pendingDone, setPendingDone] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // Cancel any pending if the plan's actual status changes externally
  useEffect(() => {
    if (done && pendingDone) {
      setPendingDone(false);
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [done, pendingDone]);

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (done) {
      onToggle(plan.id);
      return;
    }
    if (pendingDone) {
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

  const visualDone = done || pendingDone;

  return (
    <motion.li
      layout
      transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
      onClick={() => onOpen?.(plan.id)}
      className={cn(
        "group flex items-center gap-3 overflow-hidden px-3 hover:bg-hover/60",
        plan.habitId && !visualDone && "bg-accent-soft/40",
        visualDone && "bg-subtle/30",
        isNew && "task-pop",
        onOpen && "cursor-pointer",
        !pendingDone && "max-h-[78px] py-3 sm:max-h-[64px] sm:py-2"
      )}
      style={pendingDone ? {
        maxHeight: 0,
        opacity: 0,
        paddingTop: 0,
        paddingBottom: 0,
        transition:
          "max-height 400ms 200ms cubic-bezier(0.16,1,0.3,1), opacity 350ms 200ms ease-out, padding 400ms 200ms cubic-bezier(0.16,1,0.3,1)",
      } : {
        transition:
          "max-height 400ms 200ms cubic-bezier(0.16,1,0.3,1), opacity 350ms 200ms ease-out, padding 400ms 200ms cubic-bezier(0.16,1,0.3,1), background-color 200ms ease-out",
      }}
    >
      {/* Priority dot */}
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full transition-opacity",
          priorityDot,
          done && "opacity-40"
        )}
      />

      {plan.time ? (
        <span
          className={cn(
            "flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums",
            done && "text-faint",
            !done && overdue && "bg-danger-soft text-danger",
            !done && !overdue && !active && "bg-subtle text-foreground"
          )}
          style={
            !done && !overdue && active
              ? { background: "var(--info-soft)", color: "var(--info)" }
              : undefined
          }
        >
          <Clock className="size-2.5" />
          {overdueDateLabel ? `${overdueDateLabel} ${plan.time}` : plan.time}
        </span>
      ) : staleUntimed && !done && overdueDateLabel ? (
        <span className="flex items-center gap-1 rounded-md bg-warning-soft px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-warning">
          <AlertCircle className="size-2.5" />
          {overdueDateLabel}
        </span>
      ) : null}

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[17px] leading-snug sm:text-[13.5px]",
          done && "text-faint line-through decoration-faint/60"
        )}
      >
        {plan.title}
      </span>

      {rejaCategory && (
        <span
          className="inline-flex shrink-0 items-center gap-1 opacity-50"
          title={`Reja: ${rejaCategory.label}`}
          aria-label={`Reja: ${rejaCategory.label}`}
        >
          <span
            className="hidden max-w-[80px] truncate text-[11px] font-medium sm:inline"
            style={{ color: rejaCategory.color }}
          >
            {rejaCategory.label}
          </span>
          <Tag className="size-3.5" style={{ color: rejaCategory.color }} />
        </span>
      )}
      {plan.habitId && <Repeat className="size-3.5 shrink-0 text-faint" aria-label="Odat" />}
      {plan.goalStepId && <Target className="size-3.5 shrink-0 text-faint" aria-label="Maqsad qadami" />}

      <button
        type="button"
        onClick={handleToggle}
        aria-label={visualDone ? "Bekor qilish" : "Bajarildi"}
        className="group/check -my-2 -mr-3 flex shrink-0 cursor-pointer items-center py-2 pl-3 pr-3 transition-colors hover:bg-hover/40"
      >
        <span
          className={cn(
            "grid size-[21px] place-items-center rounded-md border transition-all duration-200",
            visualDone
              ? "border-accent bg-accent check-fill"
              : "border-border-strong group-hover/check:border-accent"
          )}
        >
          {visualDone && (
            <Check className="size-[14px] text-background check-pop" strokeWidth={5} />
          )}
        </span>
      </button>
    </motion.li>
  );
}
