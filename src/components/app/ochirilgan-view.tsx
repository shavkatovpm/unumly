"use client";

import { useMemo, useState } from "react";
import { Clock, Flag, Hourglass, RotateCcw, Trash2, X } from "lucide-react";
import {
  purgePlan,
  restorePlan,
  useDeletedPlans,
  useHydrated,
} from "@/lib/plans-store";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useConfirmRemove } from "./widgets/confirm-dialog";
import { ListLoader } from "./widgets/list-loader";
import { MonoSheet, MonoTile } from "./widgets/mono-sheet";
import { MONO_GROUP, MonoCount, MonoEmpty, MonoLabel, MonoTitle } from "./widgets/mono-bits";

const PRIORITY_DOT: Record<NonNullable<Plan["priority"]>, string> = {
  HIGH: "bg-priority-high",
  MEDIUM: "bg-priority-medium",
  LOW: "bg-priority-low",
};

const TRASH_TTL_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysLeft(deletedAt?: string): number {
  if (!deletedAt) return TRASH_TTL_DAYS;
  const t = Date.parse(deletedAt);
  if (Number.isNaN(t)) return TRASH_TTL_DAYS;
  const elapsed = Date.now() - t;
  return Math.max(0, Math.ceil((TRASH_TTL_DAYS * MS_PER_DAY - elapsed) / MS_PER_DAY));
}

export function OchirilganView() {
  const deleted = useDeletedPlans();
  const hydrated = useHydrated();
  const { askRemove, confirmEl } = useConfirmRemove(deleted, purgePlan, {
    title: "Butunlay o'chirish",
    description:
      '"{title}" butunlay o\'chiriladi. Bu amalni qaytarib bo\'lmaydi.',
    confirmLabel: "Butunlay o'chirish",
  });

  const sorted = useMemo(
    () =>
      deleted
        .slice()
        .sort((a, b) =>
          (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "")
        ),
    [deleted]
  );

  return (
    <>
    <OchirilganMobile plans={sorted} loading={deleted.length === 0 && !hydrated} onRestore={restorePlan} onPurge={askRemove} />
    <div data-scroll-lock-on-focus className="hidden h-screen flex-col overflow-y-auto md:flex">
      <header className="flex h-12 items-center justify-between gap-2 border-b border-border px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] sm:text-[13px]">
            O&apos;chirilgan
          </h1>
          <span className="truncate text-[13px] text-faint sm:text-[12px]">
            30 kundan keyin avtomatik o&apos;chadi
          </span>
        </div>
        <p className="shrink-0 font-mono text-[11px] tabular-nums text-faint">
          {deleted.length}
        </p>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:py-8 md:pb-8 lg:max-w-3xl xl:max-w-4xl">
        {deleted.length === 0 && !hydrated ? (
          <ListLoader />
        ) : deleted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
            <Trash2 className="mx-auto size-6 text-faint" strokeWidth={1.5} />
            <p className="mt-3 text-[13.5px] text-muted">
              Savatcha bo&apos;sh.
            </p>
            <p className="mt-1 text-[11.5px] text-faint">
              O&apos;chirilgan rejalar 30 kun davomida shu yerda saqlanadi.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
            {sorted.map((p) => (
              <DeletedRow
                key={p.id}
                plan={p}
                onRestore={() => restorePlan(p.id)}
                onPurge={() => askRemove(p.id)}
              />
            ))}
          </ul>
        )}
      </div>

    </div>
    {confirmEl}
    </>
  );
}

function DeletedRow({
  plan,
  onRestore,
  onPurge,
}: {
  plan: Plan;
  onRestore: () => void;
  onPurge: () => void;
}) {
  const priorityDot = plan.priority ? PRIORITY_DOT[plan.priority] : "bg-faint/40";
  const left = daysLeft(plan.deletedAt);
  const urgent = left <= 3;

  return (
    <li className="group flex items-center gap-3 border-b border-border/70 px-3 py-2.5 last:border-b-0 hover:bg-hover/40">
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full opacity-60", priorityDot)}
      />

      {plan.time ? (
        <span className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-faint">
          <Clock className="size-2.5" />
          {plan.time}
        </span>
      ) : (
        <span className="w-[58px] shrink-0 text-center font-mono text-[10.5px] text-faint">
          vaqtsiz
        </span>
      )}

      <span className="min-w-0 flex-1 truncate text-[14px] text-muted sm:text-[13.5px]">
        {plan.title}
      </span>

      <span
        className={cn(
          "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
          urgent
            ? "bg-danger-soft text-danger"
            : "bg-subtle text-faint"
        )}
        title={`${left} kun qoldi`}
      >
        {left}k
      </span>

      <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-60 sm:transition-opacity sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={onRestore}
          aria-label="Qayta tiklash"
          title="Qayta tiklash"
          className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
        >
          <RotateCcw className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onPurge}
          aria-label="Butunlay o'chirish"
          title="Butunlay o'chirish"
          className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

/* ─── Mobil ko'rinish ─── */

const MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];
const PRIO_LABEL: Record<string, string> = { HIGH: "Muhim", MEDIUM: "O'rta", LOW: "Past" };

function OchirilganMobile({ plans, loading, onRestore, onPurge }: { plans: Plan[]; loading: boolean; onRestore: (id: string) => void; onPurge: (id: string) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const found = plans.find((p) => p.id === openId) ?? null;
  const [last, setLast] = useState<Plan | null>(null);
  if (found && found !== last) setLast(found);
  const detail = found ?? last;
  const left = detail ? daysLeft(detail.deletedAt) : 0;
  const deletedAt = detail?.deletedAt ? new Date(detail.deletedAt) : null;

  return (
    <div className="flex flex-col overflow-hidden md:hidden" style={{ height: "calc(var(--tg-vh, 100vh) - var(--tg-safe-top, 0px))" }}>
      <header className="shrink-0 px-4 pb-1 pt-1">
        <MonoTitle sub={`${TRASH_TTL_DAYS} kun saqlanadi`} aside={<MonoCount>{plans.length}</MonoCount>}>O&apos;chirilgan</MonoTitle>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-32">
        {loading ? (
          <ListLoader />
        ) : plans.length === 0 ? (
          <MonoEmpty icon={Trash2} title="Savatcha bo'sh" text={`O'chirilgan rejalar ${TRASH_TTL_DAYS} kun davomida shu yerda saqlanadi.`} />
        ) : (
          <>
            <MonoLabel aside="kun qoldi" className="mt-2">Rejalar</MonoLabel>
            <div className={MONO_GROUP}>
              {plans.map((p) => {
                const d = daysLeft(p.deletedAt);
                return (
                  <button key={p.id} type="button" onClick={() => setOpenId(p.id)} className="flex min-h-[64px] w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-hover">
                    <span className={cn("size-2 shrink-0 rounded-full", p.priority ? PRIORITY_DOT[p.priority] : "bg-faint/40")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15.5px] text-muted">{p.title}</span>
                      <span className="flex items-center gap-1 text-[12.5px] tabular-nums text-faint"><Clock className="size-3" />{p.time ?? "Vaqtsiz"}</span>
                    </span>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[12.5px] font-semibold tabular-nums", d <= 3 ? "bg-danger-soft text-danger" : "bg-subtle text-muted")}>{d} kun</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        <div className="mt-5 flex gap-3 rounded-[22px] border border-border bg-surface p-4">
          <Hourglass className="mt-0.5 size-5 shrink-0 text-muted" />
          <p className="text-[13.5px] leading-relaxed text-muted">O&apos;chirilgan rejalar {TRASH_TTL_DAYS} kun saqlanadi, so&apos;ng avtomatik o&apos;chib ketadi. Shu muddat ichida istalganini qayta tiklash mumkin.</p>
        </div>
      </div>

      <MonoSheet open={!!found} onClose={() => setOpenId(null)} label={detail?.title ?? "O'chirilgan"}>
        {detail && (
          <>
            <div className="rounded-[24px] border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-muted">O&apos;chirilgan reja</p>
                  <p className="mt-0.5 text-[21px] font-bold leading-tight tracking-[-0.02em]">{detail.title}</p>
                </div>
                <button type="button" onClick={() => setOpenId(null)} aria-label="Yopish" className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle"><X className="size-4" strokeWidth={2.4} /></button>
              </div>
              <div className="mt-3 flex items-baseline justify-between text-[13px]">
                <span className="text-muted">{left} kundan keyin butunlay o&apos;chadi</span>
                <span className="tabular-nums text-faint">{left}/{TRASH_TTL_DAYS}</span>
              </div>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-subtle">
                <span className={cn("block h-full rounded-full", left <= 3 ? "bg-danger" : "bg-foreground")} style={{ width: `${(left / TRASH_TTL_DAYS) * 100}%` }} />
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MonoTile icon={Trash2} label="O'chirilgan" value={deletedAt ? `${deletedAt.getDate()}-${MONTHS_SHORT[deletedAt.getMonth()]}` : undefined} onClick={() => {}} />
              <MonoTile icon={Clock} label="Vaqt" value={detail.time ?? "Vaqtsiz"} onClick={() => {}} />
              <MonoTile icon={Flag} label="Muhimlik" value={detail.priority ? PRIO_LABEL[detail.priority] : "Yo'q"} onClick={() => {}} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { onRestore(detail.id); setOpenId(null); }} className="flex h-[70px] flex-col items-center justify-center gap-1 rounded-[20px] bg-accent text-[12.5px] font-semibold text-accent-ink">
                <RotateCcw className="size-5" /> Qayta tiklash
              </button>
              <button type="button" onClick={() => { setOpenId(null); onPurge(detail.id); }} className="flex h-[70px] flex-col items-center justify-center gap-1 rounded-[20px] border border-border bg-surface text-[12.5px] font-semibold text-danger">
                <Trash2 className="size-5" /> Butunlay o&apos;chirish
              </button>
            </div>
          </>
        )}
      </MonoSheet>
    </div>
  );
}
