import { TrendingUp, Users, CheckCircle2, Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const DAYS_BACK = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function relTime(d: Date): string {
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "hozir";
  if (min < 60) return `${min} daq oldin`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} soat oldin`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} kun oldin`;
  return d.toISOString().slice(0, 10);
}

function displayName(u: { firstName: string | null; lastName: string | null; username: string | null; telegramId: bigint }): string {
  const parts = [u.firstName, u.lastName].filter(Boolean);
  if (parts.length) return parts.join(" ");
  if (u.username) return `@${u.username}`;
  return `id:${u.telegramId.toString()}`;
}

export default async function AdminDashboardPage() {
  const since14d = new Date(Date.now() - DAYS_BACK * DAY_MS);
  const since7d = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const tIso = todayIso();

  const [
    totalUsers,
    activeUsers7d,
    newUsersThisWeek,
    todayPlansCount,
    todayDoneCount,
    last14dPlans,
    recentPlans,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastSeenAt: { gte: since7d } } }),
    prisma.user.count({ where: { createdAt: { gte: since7d } } }),
    prisma.plan.count({
      where: { scope: "DAILY", scheduledFor: tIso, deletedAt: null },
    }),
    prisma.plan.count({
      where: { scope: "DAILY", scheduledFor: tIso, status: "DONE", deletedAt: null },
    }),
    prisma.plan.findMany({
      where: { createdAt: { gte: since14d }, deletedAt: null },
      select: { createdAt: true },
    }),
    prisma.plan.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
            telegramId: true,
          },
        },
      },
    }),
  ]);

  const doneRate = todayPlansCount > 0
    ? Math.round((todayDoneCount / todayPlansCount) * 100)
    : 0;

  // 14 kunlik chart
  const byDay = new Map<string, number>();
  for (let i = DAYS_BACK - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const p of last14dPlans) {
    const key = p.createdAt.toISOString().slice(0, 10);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const days = Array.from(byDay.values());
  const maxDay = Math.max(1, ...days);
  const totalLast14d = days.reduce((a, b) => a + b, 0);

  const stats = [
    { label: "Jami foydalanuvchi",   value: totalUsers,        delta: newUsersThisWeek > 0 ? `+${newUsersThisWeek}` : "", icon: Users },
    { label: "Faol (7 kun)",          value: activeUsers7d,    delta: "",                                                  icon: Activity },
    { label: "Bugungi tasklar",       value: todayPlansCount,  delta: "",                                                  icon: CheckCircle2 },
    { label: "Bajarish nisbati",      value: `${doneRate}%`,   delta: `${todayDoneCount}/${todayPlansCount}`,              icon: TrendingUp },
  ];

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Real ko'rsatkichlar va so'nggi faollik"
      />

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => {
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
                  {s.delta && (
                    <p className="font-mono text-[11px] text-accent">{s.delta}</p>
                  )}
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
                Faollik (oxirgi {DAYS_BACK} kun)
              </h2>
              <p className="text-[11px] text-faint">Kun bo&apos;yicha yaratilgan tasklar soni</p>
            </div>
            <p className="font-mono text-[11px] text-faint">Jami {totalLast14d}</p>
          </div>
          <div className="flex h-32 items-end gap-1.5">
            {days.map((v, i) => {
              const pct = (v / maxDay) * 100;
              const isLast = i === days.length - 1;
              return (
                <div
                  key={i}
                  className="group flex flex-1 flex-col items-center gap-1.5"
                >
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className={cn(
                        "w-full rounded-t-sm transition-colors",
                        isLast
                          ? "bg-foreground"
                          : "bg-subtle group-hover:bg-border-strong",
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

        {/* Recent plans */}
        <div className="mt-6 rounded-xl border border-border bg-surface shadow-[0_1px_0_var(--border)]">
          <header className="border-b border-border px-5 py-3">
            <h2 className="text-[14px] font-semibold tracking-[-0.01em]">
              So&apos;nggi yaratilgan rejalar
            </h2>
          </header>
          {recentPlans.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-faint">
              Hozircha hech narsa yaratilmagan
            </div>
          ) : (
            <ul className="divide-y divide-border/70">
              {recentPlans.map((p) => {
                const name = displayName(p.user);
                return (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div className="grid size-7 shrink-0 place-items-center rounded-md bg-subtle font-mono text-[10px] uppercase text-muted">
                      {(name.replace("@", "").slice(0, 2) || "??").toUpperCase()}
                    </div>
                    <p className="min-w-0 flex-1 truncate text-[13px]">
                      <span className="text-foreground">{p.title}</span>{" "}
                      <span className="font-mono text-[11px] text-faint">— {name}</span>
                    </p>
                    <p className="shrink-0 font-mono text-[10.5px] text-faint">
                      {relTime(p.createdAt)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
