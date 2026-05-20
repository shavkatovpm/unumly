"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminPlanRow = {
  id: string;
  title: string;
  scope: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  status: "TODO" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
  priority: "HIGH" | "MEDIUM" | "LOW" | null;
  scheduledFor: string;
  time: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    displayName: string;
  };
};

const PRIORITY_DOT: Record<NonNullable<AdminPlanRow["priority"]>, string> = {
  HIGH: "bg-priority-high",
  MEDIUM: "bg-priority-medium",
  LOW: "bg-priority-low",
};

const SCOPE_LABEL: Record<AdminPlanRow["scope"], string> = {
  DAILY: "Kun",
  WEEKLY: "Hafta",
  MONTHLY: "Oy",
  YEARLY: "Yil",
};

export function PlansList({ plans }: { plans: AdminPlanRow[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "TODO" | "DONE">("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | AdminPlanRow["scope"]>("all");

  const filtered = useMemo(() => {
    return plans.filter((p) => {
      if (statusFilter === "TODO" && p.status !== "TODO") return false;
      if (statusFilter === "DONE" && p.status !== "DONE") return false;
      if (scopeFilter !== "all" && p.scope !== scopeFilter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.user.username ?? "").toLowerCase().includes(q) ||
        p.user.displayName.toLowerCase().includes(q)
      );
    });
  }, [plans, query, statusFilter, scopeFilter]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Reja yoki foydalanuvchi bo'yicha qidirish..."
            className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-[13px] placeholder:text-faint focus:border-border-strong focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
          {(["all", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScopeFilter(s)}
              className={cn(
                "rounded px-2.5 py-1.5 text-[11.5px] transition-colors",
                scopeFilter === s
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground",
              )}
            >
              {s === "all" ? "Hammasi" : SCOPE_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
          {(["all", "TODO", "DONE"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded px-2.5 py-1.5 text-[11.5px] transition-colors",
                statusFilter === s
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground",
              )}
            >
              {s === "all" ? "Holat" : s === "TODO" ? "Faol" : "Bajarilgan"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_0_var(--border)]">
        <ul className="divide-y divide-border/70">
          {filtered.map((p) => {
            const dot = p.priority ? PRIORITY_DOT[p.priority] : "bg-faint/40";
            const done = p.status === "DONE";
            return (
              <li
                key={p.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover/40",
                  done && "bg-subtle/30",
                )}
              >
                <span className={cn("size-1.5 shrink-0 rounded-full", dot, done && "opacity-40")} />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[13.5px]",
                    done && "text-faint line-through decoration-faint/60",
                  )}
                >
                  {p.title}
                </span>
                <Link
                  href={`/admode/foydalanuvchilar/${p.user.id}`}
                  className="shrink-0 font-mono text-[11px] text-muted hover:text-foreground"
                >
                  {p.user.username ? `@${p.user.username}` : p.user.displayName}
                </Link>
                <span className="shrink-0 rounded bg-subtle px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-faint">
                  {SCOPE_LABEL[p.scope]}
                </span>
                {p.time && (
                  <span className="flex shrink-0 items-center gap-1 rounded-md bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                    <Clock className="size-2.5" />
                    {p.time}
                  </span>
                )}
                <span className="shrink-0 font-mono text-[11px] text-faint">{p.scheduledFor}</span>
                <span
                  className={cn(
                    "grid size-[18px] shrink-0 place-items-center rounded-md border",
                    done ? "border-accent bg-accent" : "border-border-strong",
                  )}
                >
                  {done && <Check className="size-3 text-background" strokeWidth={5} />}
                </span>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-4 py-12 text-center text-[13px] text-faint">
              Hech narsa topilmadi
            </li>
          )}
        </ul>
      </div>
    </>
  );
}
