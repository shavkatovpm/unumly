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
  variant = "classic",
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
  /** "wide" — sozlamalardagi "Kengaytirilgan tasklar" yoqilganda: har bir
   *  task o'z alohida kartasida, kattaroq matn/tugmalar bilan. Faqat
   *  ko'rinish — hamma xatti-harakat (toggle, drag, ochish) bir xil. */
  variant?: "classic" | "wide";
}) {
  const done = plan.status === "DONE";
  const priorityDot = plan.priority ? PRIORITY_DOT[plan.priority] : "bg-faint/40";
  const wide = variant === "wide";

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
        "group flex items-center overflow-hidden hover:bg-hover/60",
        wide ? "gap-3.5 rounded-xl border border-border px-4" : "gap-3 px-3",
        plan.habitId && !visualDone && "bg-accent-soft/40",
        visualDone && "bg-subtle/30",
        isNew && "task-pop",
        onOpen && "cursor-pointer",
        !pendingDone && (wide ? "max-h-[110px] py-4" : "max-h-[78px] py-3 sm:max-h-[64px] sm:py-2")
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
          "shrink-0 rounded-full transition-opacity",
          wide ? "size-2" : "size-1.5",
          priorityDot,
          done && "opacity-40"
        )}
      />

      {plan.time ? (
        <span
          className={cn(
            "flex items-center rounded-md font-mono tabular-nums",
            wide ? "gap-1.5 px-2 py-1 text-[13px]" : "gap-1 px-1.5 py-0.5 text-[11px]",
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
          <Clock className={wide ? "size-3" : "size-2.5"} />
          {overdueDateLabel ? `${overdueDateLabel} ${plan.time}` : plan.time}
        </span>
      ) : staleUntimed && !done && overdueDateLabel ? (
        <span className={cn("flex items-center rounded-md bg-warning-soft font-mono tabular-nums text-warning", wide ? "gap-1.5 px-2 py-1 text-[13px]" : "gap-1 px-1.5 py-0.5 text-[11px]")}>
          <AlertCircle className={wide ? "size-3" : "size-2.5"} />
          {overdueDateLabel}
        </span>
      ) : null}

      <span
        className={cn(
          "min-w-0 flex-1 truncate leading-snug",
          wide ? "text-[19px]" : "text-[17px] sm:text-[13.5px]",
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
            className={cn("max-w-[80px] truncate font-medium", wide ? "inline text-[12.5px]" : "hidden text-[11px] sm:inline")}
            style={{ color: rejaCategory.color }}
          >
            {rejaCategory.label}
          </span>
          <Tag className={wide ? "size-4" : "size-3.5"} style={{ color: rejaCategory.color }} />
        </span>
      )}
      {plan.habitId && <Repeat className={cn("shrink-0 text-faint", wide ? "size-4" : "size-3.5")} aria-label="Odat" />}
      {plan.goalStepId && <Target className={cn("shrink-0 text-faint", wide ? "size-4" : "size-3.5")} aria-label="Maqsad qadami" />}

      <button
        type="button"
        onClick={handleToggle}
        aria-label={visualDone ? "Bekor qilish" : "Bajarildi"}
        className={cn("group/check flex shrink-0 cursor-pointer items-center transition-colors hover:bg-hover/40", wide ? "-my-4 -mr-4 py-4 pl-3 pr-4" : "-my-2 -mr-3 py-2 pl-3 pr-3")}
      >
        <span
          className={cn(
            "grid place-items-center rounded-md border transition-all duration-200",
            wide ? "size-[26px]" : "size-[21px]",
            visualDone
              ? "border-accent bg-accent check-fill"
              : "border-border-strong group-hover/check:border-accent"
          )}
        >
          {visualDone && (
            <Check className={cn("text-background check-pop", wide ? "size-[17px]" : "size-[14px]")} strokeWidth={5} />
          )}
        </span>
      </button>
    </motion.li>
  );
}
