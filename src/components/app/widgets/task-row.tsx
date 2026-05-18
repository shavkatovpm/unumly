"use client";

import { Check, Clock, Trash2 } from "lucide-react";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskRow({
  plan,
  onToggle,
  onRemove,
}: {
  plan: Plan;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const done = plan.status === "DONE";

  return (
    <li
      className={cn(
        "group flex items-center gap-3 px-3 py-2 transition-colors hover:bg-hover/60",
        done && "bg-subtle/30"
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(plan.id)}
        aria-label={done ? "Bekor qilish" : "Bajarildi"}
        className={cn(
          "grid size-[18px] shrink-0 place-items-center rounded-md border transition-all",
          done
            ? "border-accent bg-accent"
            : "border-border-strong hover:border-accent"
        )}
      >
        {done && <Check className="size-2.5 text-white" strokeWidth={4} />}
      </button>

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
          "min-w-0 flex-1 truncate text-[13.5px] leading-snug",
          done && "text-faint line-through decoration-faint/60"
        )}
      >
        {plan.title}
      </span>

      <button
        type="button"
        onClick={() => onRemove(plan.id)}
        aria-label="O'chirish"
        className="grid size-7 shrink-0 place-items-center rounded-md text-faint opacity-0 transition-all hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}
