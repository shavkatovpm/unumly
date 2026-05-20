"use client";

import { useMemo, useState } from "react";
import { Clock, Check, ClipboardList, ListChecks, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export type UserDetailPlan = {
  id: string;
  title: string;
  scope: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  status: "TODO" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
  priority: "HIGH" | "MEDIUM" | "LOW" | null;
  scheduledFor: string;
  time: string | null;
};

export type UserDetailData = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  joinedAt: string;
  lastSeenAt: string;
  isActive: boolean;
  todayIso: string;
  plans: UserDetailPlan[];
};

const PRIORITY_DOT: Record<NonNullable<UserDetailPlan["priority"]>, string> = {
  HIGH: "bg-priority-high",
  MEDIUM: "bg-priority-medium",
  LOW: "bg-priority-low",
};

type Tab = "bugun" | "agenda" | "reja";

export function UserDetail({ data }: { data: UserDetailData }) {
  const [tab, setTab] = useState<Tab>("bugun");

  const { todays, upcoming, longerTerm } = useMemo(() => {
    const todays = data.plans.filter(
      (p) => p.scope === "DAILY" && p.scheduledFor === data.todayIso,
    );
    const upcoming = data.plans.filter(
      (p) => p.scope === "DAILY" && p.scheduledFor > data.todayIso,
    );
    const longerTerm = data.plans.filter((p) => p.scope !== "DAILY");
    return { todays, upcoming, longerTerm };
  }, [data]);

  const displayName =
    [data.firstName, data.lastName].filter(Boolean).join(" ") ||
    data.username ||
    `id:${data.telegramId}`;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* User card */}
      <div className="mb-6 flex items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-[0_1px_0_var(--border)]">
        <div className="grid size-12 place-items-center rounded-lg bg-foreground text-[15px] font-semibold text-background">
          {initials || "??"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">
            {displayName}
          </p>
          <p className="mt-0.5 font-mono text-[11.5px] text-faint">
            {data.username ? `@${data.username}` : `tg:${data.telegramId}`}
            {data.phone && <> · {data.phone}</>}
          </p>
          <p className="mt-0.5 text-[11px] text-faint">
            qo&apos;shilgan {data.joinedAt.slice(0, 10)} · oxirgi kirish {relTime(data.lastSeenAt)}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium",
            data.isActive ? "bg-accent-soft text-accent-ink" : "bg-subtle text-faint",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              data.isActive ? "bg-accent" : "bg-faint/60",
            )}
          />
          {data.isActive ? "Faol" : "Nofaol"}
        </span>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
        <TabButton active={tab === "bugun"} onClick={() => setTab("bugun")} icon={Inbox}>
          Bugun <CountBadge n={todays.length} active={tab === "bugun"} />
        </TabButton>
        <TabButton active={tab === "agenda"} onClick={() => setTab("agenda")} icon={ListChecks}>
          Agenda <CountBadge n={upcoming.length} active={tab === "agenda"} />
        </TabButton>
        <TabButton active={tab === "reja"} onClick={() => setTab("reja")} icon={ClipboardList}>
          Reja <CountBadge n={longerTerm.length} active={tab === "reja"} />
        </TabButton>
      </div>

      {tab === "bugun" && <PlansList plans={todays} emptyText="Bugun uchun reja yo'q" />}
      {tab === "agenda" && (
        <PlansGroupedByDate plans={upcoming} emptyText="Yaqin kunlarda reja yo'q" />
      )}
      {tab === "reja" && (
        <PlansGroupedByScope plans={longerTerm} emptyText="Hafta/oy/yil rejasi yo'q" />
      )}
    </>
  );
}

/* ─── Helpers ─── */

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "hozir";
  if (min < 60) return `${min} daq oldin`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} soat oldin`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d} kun oldin`;
  return iso.slice(0, 10);
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-2 text-[12.5px] transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" strokeWidth={1.8} />
      {children}
    </button>
  );
}

function CountBadge({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      className={cn(
        "ml-1 rounded font-mono text-[10px] tabular-nums",
        active ? "text-background/70" : "text-faint",
      )}
    >
      {n}
    </span>
  );
}

function PlanRow({ plan }: { plan: UserDetailPlan }) {
  const done = plan.status === "DONE";
  const dot = plan.priority ? PRIORITY_DOT[plan.priority] : "bg-faint/40";
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-hover/40",
        done && "bg-subtle/30",
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", dot, done && "opacity-40")} />
      {plan.time && (
        <span className="flex shrink-0 items-center gap-1 rounded-md bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-foreground">
          <Clock className="size-2.5" />
          {plan.time}
        </span>
      )}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[13px]",
          done && "text-faint line-through decoration-faint/60",
        )}
      >
        {plan.title}
      </span>
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
}

function PlansList({ plans, emptyText }: { plans: UserDetailPlan[]; emptyText: string }) {
  if (plans.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-[13px] text-faint">
        {emptyText}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_0_var(--border)]">
      <ul className="divide-y divide-border/70">
        {plans.map((p) => (
          <PlanRow key={p.id} plan={p} />
        ))}
      </ul>
    </div>
  );
}

function PlansGroupedByDate({
  plans,
  emptyText,
}: {
  plans: UserDetailPlan[];
  emptyText: string;
}) {
  if (plans.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-[13px] text-faint">
        {emptyText}
      </div>
    );
  }
  const groups = plans.reduce<Record<string, UserDetailPlan[]>>((acc, p) => {
    (acc[p.scheduledFor] ??= []).push(p);
    return acc;
  }, {});
  const dates = Object.keys(groups).sort();
  return (
    <div className="space-y-4">
      {dates.map((d) => (
        <section key={d}>
          <header className="mb-2 px-1">
            <p className="font-mono text-[11px] text-muted">{d}</p>
          </header>
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_0_var(--border)]">
            <ul className="divide-y divide-border/70">
              {groups[d].map((p) => (
                <PlanRow key={p.id} plan={p} />
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}

const SCOPE_LABEL: Record<UserDetailPlan["scope"], string> = {
  DAILY: "Kunlik",
  WEEKLY: "Haftalik",
  MONTHLY: "Oylik",
  YEARLY: "Yillik",
};

function PlansGroupedByScope({
  plans,
  emptyText,
}: {
  plans: UserDetailPlan[];
  emptyText: string;
}) {
  if (plans.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-[13px] text-faint">
        {emptyText}
      </div>
    );
  }
  const groups = plans.reduce<Record<string, UserDetailPlan[]>>((acc, p) => {
    (acc[p.scope] ??= []).push(p);
    return acc;
  }, {});
  const order: UserDetailPlan["scope"][] = ["WEEKLY", "MONTHLY", "YEARLY"];
  return (
    <div className="space-y-4">
      {order.map((s) => {
        const items = groups[s];
        if (!items?.length) return null;
        return (
          <section key={s}>
            <header className="mb-2 flex items-center justify-between px-1">
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-faint">
                {SCOPE_LABEL[s]}
              </p>
              <p className="font-mono text-[10.5px] text-faint">{items.length}</p>
            </header>
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_0_var(--border)]">
              <ul className="divide-y divide-border/70">
                {items.map((p) => (
                  <PlanRow key={p.id} plan={p} />
                ))}
              </ul>
            </div>
          </section>
        );
      })}
    </div>
  );
}
