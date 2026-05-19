"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock } from "lucide-react";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

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
}: {
  plan: Plan;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onOpen?: (id: string) => void;
  isNew?: boolean;
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
        visualDone && "bg-subtle/30",
        isNew && "task-pop",
        onOpen && "cursor-pointer"
      )}
      style={{
        maxHeight: pendingDone ? 0 : 64,
        opacity: pendingDone ? 0 : 1,
        paddingTop: pendingDone ? 0 : "0.5rem",
        paddingBottom: pendingDone ? 0 : "0.5rem",
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

      {plan.time && (
        <span
          className={cn(
            "flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums",
            done ? "text-faint" : "bg-subtle text-foreground"
          )}
        >
          <Clock className="size-2.5" />
          {plan.time}
        </span>
      )}

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[15px] leading-snug sm:text-[13.5px]",
          done && "text-faint line-through decoration-faint/60"
        )}
      >
        {plan.title}
      </span>

      <button
        type="button"
        onClick={handleToggle}
        aria-label={visualDone ? "Bekor qilish" : "Bajarildi"}
        className="group/check -my-2 -mr-3 flex shrink-0 cursor-pointer items-center py-2 pl-3 pr-3 transition-colors hover:bg-hover/40"
      >
        <span
          className={cn(
            "grid size-[18px] place-items-center rounded-md border transition-all duration-200",
            visualDone
              ? "border-accent bg-accent check-fill"
              : "border-border-strong group-hover/check:border-accent"
          )}
        >
          {visualDone && (
            <Check className="size-3 text-background check-pop" strokeWidth={5} />
          )}
        </span>
      </button>
    </motion.li>
  );
}
