"use client";

import { TrendingUp, Users, CheckCircle2, Activity } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { cn } from "@/lib/utils";

// Inline mock data — DB tayyor bo'lganda almashtiriladi.
const STATS = [
  { label: "Jami foydalanuvchi", value: 247, delta: "+12", icon: Users },
  { label: "Faol (7 kun)",       value: 89,  delta: "+5",  icon: Activity },
  { label: "Bugungi tasklar",    value: 412, delta: "+34", icon: CheckCircle2 },
  { label: "Bajarish nisbati",   value: "68%", delta: "+3%", icon: TrendingUp },
];

// Oxirgi 14 kun task soni — mock
const ACTIVITY_DAYS = [12, 18, 15, 22, 28, 14, 9, 24, 31, 27, 33, 29, 38, 42];
const MAX_DAY = Math.max(...ACTIVITY_DAYS);

const RECENT_ACTIONS = [
  { who: "@aliyev_b", action: "ro'yxatdan o'tdi", time: "5 daq oldin" },
  { who: "@zarina_t", action: "12 ta task bajardi",   time: "18 daq oldin" },
  { who: "@uzbektype", action: "yangi sessiya ochdi",  time: "1 soat oldin" },
  { who: "@nodir_dev", action: "haftalik reja yaratdi", time: "2 soat oldin" },
  { who: "@malika_k",  action: "bot orqali kirdi",     time: "3 soat oldin" },
  { who: "@shavkat_t", action: "8 ta task bajardi",    time: "4 soat oldin" },
];

export default function AdminDashboardPage() {
  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Umumiy ko'rsatkichlar va so'nggi faollik"
      />

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_0_var(--border)]"
              >
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
                    {s.label}
                  </p>
                  <div className="grid size-7 place-items-center rounded-md bg-subtle">
                    <Icon className="size-3.5 text-muted" strokeWidth={1.8} />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="font-mono text-[26px] font-semibold tabular-nums tracking-[-0.02em]">
                    {s.value}
                  </p>
                  <p className="font-mono text-[11px] text-accent">{s.delta}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Activity chart */}
        <div className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-[0_1px_0_var(--border)]">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-[14px] font-semibold tracking-[-0.01em]">
                Faollik (oxirgi 14 kun)
              </h2>
              <p className="text-[11px] text-faint">Kun bo&apos;yicha yaratilgan tasklar soni</p>
            </div>
            <p className="font-mono text-[11px] text-faint">
              Jami {ACTIVITY_DAYS.reduce((a, b) => a + b, 0)}
            </p>
          </div>
          <div className="flex h-32 items-end gap-1.5">
            {ACTIVITY_DAYS.map((v, i) => {
              const pct = (v / MAX_DAY) * 100;
              const isLast = i === ACTIVITY_DAYS.length - 1;
              return (
                <div
                  key={i}
                  className="group flex flex-1 flex-col items-center gap-1.5"
                >
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className={cn(
                        "w-full rounded-t-sm transition-colors",
                        isLast ? "bg-foreground" : "bg-subtle group-hover:bg-border-strong"
                      )}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <p className="font-mono text-[9px] text-faint">{v}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent actions */}
        <div className="mt-6 rounded-xl border border-border bg-surface shadow-[0_1px_0_var(--border)]">
          <header className="border-b border-border px-5 py-3">
            <h2 className="text-[14px] font-semibold tracking-[-0.01em]">
              So&apos;nggi harakatlar
            </h2>
          </header>
          <ul className="divide-y divide-border/70">
            {RECENT_ACTIONS.map((a, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-2.5">
                <div className="grid size-7 shrink-0 place-items-center rounded-md bg-subtle font-mono text-[10px] uppercase text-muted">
                  {a.who.slice(1, 3)}
                </div>
                <p className="min-w-0 flex-1 text-[13px]">
                  <span className="font-mono text-muted">{a.who}</span>{" "}
                  <span className="text-foreground">{a.action}</span>
                </p>
                <p className="shrink-0 font-mono text-[10.5px] text-faint">
                  {a.time}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
