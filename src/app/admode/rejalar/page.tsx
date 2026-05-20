"use client";

import { useState } from "react";
import { Search, Clock, Check } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { cn } from "@/lib/utils";

type Status = "TODO" | "DONE";
type Priority = "HIGH" | "MEDIUM" | "LOW" | undefined;

const PLANS = [
  { id: "p1",  user: "@aliyev_b",  title: "Backend deploy qilish",       date: "2026-05-20", time: "14:00", status: "TODO" as Status, priority: "HIGH"   as Priority },
  { id: "p2",  user: "@zarina_t",  title: "Dizayn briefini tayyorlash",  date: "2026-05-20", time: "10:00", status: "DONE" as Status, priority: "MEDIUM" as Priority },
  { id: "p3",  user: "@uzbektype", title: "Telegram bot test",           date: "2026-05-20", time: "16:30", status: "TODO" as Status, priority: "HIGH"   as Priority },
  { id: "p4",  user: "@nodir_dev", title: "Schema migratsiya",           date: "2026-05-20", time: "09:00", status: "DONE" as Status, priority: "HIGH"   as Priority },
  { id: "p5",  user: "@malika_k",  title: "Mijoz bilan uchrashuv",       date: "2026-05-20", time: "11:00", status: "DONE" as Status, priority: "MEDIUM" as Priority },
  { id: "p6",  user: "@shavkat_t", title: "Hisobotni yozish",            date: "2026-05-20", time: "",      status: "TODO" as Status, priority: "LOW"    as Priority },
  { id: "p7",  user: "@dilshod_a", title: "Code review",                 date: "2026-05-21", time: "13:00", status: "TODO" as Status, priority: "MEDIUM" as Priority },
  { id: "p8",  user: "@aziza_m",   title: "Marketing kampaniyasi",       date: "2026-05-21", time: "",      status: "TODO" as Status, priority: undefined },
  { id: "p9",  user: "@jasur_k",   title: "Maqola yozish",               date: "2026-05-19", time: "20:00", status: "DONE" as Status, priority: "LOW"    as Priority },
  { id: "p10", user: "@firuza_t",  title: "Inglizcha mashg'ulot",        date: "2026-05-19", time: "07:30", status: "DONE" as Status, priority: "MEDIUM" as Priority },
  { id: "p11", user: "@umid_b",    title: "Buxgalteriya hisobi",         date: "2026-05-19", time: "",      status: "TODO" as Status, priority: undefined },
  { id: "p12", user: "@kamola_n",  title: "Loyiha bo'yicha qaror",       date: "2026-05-18", time: "15:00", status: "DONE" as Status, priority: "HIGH"   as Priority },
];

const PRIORITY_DOT: Record<NonNullable<Priority>, string> = {
  HIGH:   "bg-priority-high",
  MEDIUM: "bg-priority-medium",
  LOW:    "bg-priority-low",
};

export default function AdminRejalarPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "TODO" | "DONE">("all");

  const filtered = PLANS.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.user.toLowerCase().includes(q);
  });

  const todoCount = PLANS.filter((p) => p.status === "TODO").length;
  const doneCount = PLANS.filter((p) => p.status === "DONE").length;

  return (
    <>
      <AdminPageHeader
        title="Rejalar"
        subtitle={`${PLANS.length} ta jami · ${todoCount} faol · ${doneCount} bajarilgan`}
      />

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Search + filters */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Reja yoki @username bo'yicha qidirish..."
              className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-[13px] placeholder:text-faint focus:border-border-strong focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
            {(["all", "TODO", "DONE"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded px-3 py-1.5 text-[12px] transition-colors",
                  filter === f
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground"
                )}
              >
                {f === "all" ? "Hammasi" : f === "TODO" ? "Faol" : "Bajarilgan"}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
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
                    done && "bg-subtle/30"
                  )}
                >
                  <span className={cn("size-1.5 shrink-0 rounded-full", dot, done && "opacity-40")} />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[13.5px]",
                      done && "text-faint line-through decoration-faint/60"
                    )}
                  >
                    {p.title}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-faint">{p.user}</span>
                  {p.time && (
                    <span className="flex shrink-0 items-center gap-1 rounded-md bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                      <Clock className="size-2.5" />
                      {p.time}
                    </span>
                  )}
                  <span className="shrink-0 font-mono text-[11px] text-faint">{p.date}</span>
                  <span
                    className={cn(
                      "grid size-[18px] shrink-0 place-items-center rounded-md border",
                      done ? "border-accent bg-accent" : "border-border-strong"
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
      </div>
    </>
  );
}
