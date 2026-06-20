"use client";

import { Check, ChevronRight, Plus, X } from "lucide-react";
import type { Subtask } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ─── Yig'iladigan sektsiya (form'dagi izoh / ichki vazifalar) ─── */
export function CollapseSection({
  icon,
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
      >
        <ChevronRight className={cn("size-3.5 text-faint transition-transform", open && "rotate-90")} />
        <span className="text-faint">{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{title}</span>
        {hint && <span className="ml-auto font-mono text-[10px] tabular-nums text-faint">{hint}</span>}
      </button>
      {open && <div className="px-2.5 pb-2.5">{children}</div>}
    </div>
  );
}

/* ─── Ichki vazifalar tahrirlovchisi (form): matn | o'chir | done belgi (o'ngda) ─── */
export function SubtaskEditor({
  subtasks,
  newSub,
  setNewSub,
  onAdd,
  onToggle,
  onRemove,
  onEditTitle,
}: {
  subtasks: Subtask[];
  newSub: string;
  setNewSub: (v: string) => void;
  onAdd: () => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEditTitle: (id: string, t: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {subtasks.map((s) => (
        <div key={s.id} className="flex items-center gap-2">
          <input
            value={s.title}
            onChange={(e) => onEditTitle(s.id, e.target.value)}
            className={cn(
              "min-w-0 flex-1 bg-transparent text-[13px] focus:outline-none",
              s.done && "text-faint line-through"
            )}
          />
          <button
            type="button"
            onClick={() => onRemove(s.id)}
            aria-label="O'chirish"
            className="grid size-6 shrink-0 place-items-center rounded text-faint transition-colors hover:text-danger"
          >
            <X className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onToggle(s.id)}
            aria-label={s.done ? "Bajarilmagan qilish" : "Bajarildi"}
            className={cn(
              "grid size-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors",
              s.done
                ? "border-accent bg-accent text-accent-ink"
                : "border-border-strong text-transparent hover:border-foreground"
            )}
          >
            <Check className="size-3" strokeWidth={3} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 border-t border-border/60 pt-1.5">
        <Plus className="size-3.5 shrink-0 text-faint" />
        <input
          value={newSub}
          onChange={(e) => setNewSub(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder="Ichki vazifa qo'shish..."
          className="min-w-0 flex-1 bg-transparent text-[13px] placeholder:text-faint focus:outline-none"
        />
      </div>
    </div>
  );
}

/* ─── Ichki vazifalar ko'rinishi (read): matn | done belgi (o'ngda) ─── */
export function SubtaskViewList({
  subtasks,
  onToggle,
}: {
  subtasks: Subtask[];
  onToggle: (id: string) => void;
}) {
  return (
    <ul className="overflow-hidden rounded-md border border-border">
      {subtasks.map((s, i) => (
        <li
          key={s.id}
          className={cn(
            "flex items-center gap-2.5 bg-background px-3 py-2.5",
            i > 0 && "border-t border-border/70"
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 text-[14px] sm:text-[13.5px]",
              s.done ? "text-faint line-through" : "text-foreground"
            )}
          >
            {s.title}
          </span>
          <button
            type="button"
            onClick={() => onToggle(s.id)}
            aria-label={s.done ? "Bajarilmagan qilish" : "Bajarildi"}
            className={cn(
              "grid size-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors",
              s.done
                ? "border-accent bg-accent text-accent-ink"
                : "border-border-strong text-transparent hover:border-foreground"
            )}
          >
            <Check className="size-3" strokeWidth={3} />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Subtask id yaratish. */
export function makeSubtaskId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}
