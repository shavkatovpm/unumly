"use client";

/* Bugun — mobil ko'rinish. Ma'lumot va amallar BugunView'dan keladi;
   desktop ko'rinishi o'zgarmagan. */

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  AlertCircle, Ban, CalendarPlus, Check, ChevronRight, Clock, Coffee, HandCoins, Inbox,
  Moon, Plus, Sun, Sunrise, Sunset, Wallet, X, type LucideIcon,
} from "lucide-react";
import type { Plan } from "@/lib/types";
import type { DebtReminder } from "@/lib/debt-reminders";
import { shiftIso } from "@/lib/debt-reminders";
import { DEFER_LIMIT, daysBetween } from "@/lib/plan-status";
import { formatDateLong, formatUzDate, fromDateInputValue, parseTimeToMinutes } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { useLongPressReorder } from "@/lib/use-long-press-reorder";
import { cn } from "@/lib/utils";
import { TodayPanel } from "./today-panel";
import { MonoSheet } from "../widgets/mono-sheet";
import { ListLoader } from "../widgets/list-loader";
import {
  Collapsed, DoneList, Glide, MobileHeader, MoveCard, PriorityDot, ROW_MOTION, Ring, TaskBadges, Tick, byCompletedDesc, groupCls,
  hasBadges, usePendingDone,
} from "./mobile-ui";

export type BucketKey = "overdue" | "midnight" | "morning" | "noon" | "evening" | "anytime";
const ICONS: Record<BucketKey, LucideIcon> = {
  overdue: AlertCircle, midnight: Moon, morning: Sunrise, noon: Sun, evening: Sunset, anytime: Coffee,
};

type RejaMap = Map<string, { label: string; color: string }>;

export function BugunMobile({
  hydrated, now, today, todayIso, plans, total, doneList, blocks, missed, debtReminders, rejaCatMap,
  onToggle, onOpen, onAdd, onMoveUntimed, onDefer, onCancel, onSettleDebt, onSnoozeDebt,
}: {
  hydrated: boolean;
  now: Date | null;
  today: Date;
  todayIso: string;
  plans: Plan[];
  total: number;
  doneList: Plan[];
  blocks: { key: BucketKey; label: string; items: Plan[]; danger?: boolean }[];
  missed: Plan[];
  debtReminders: DebtReminder[];
  rejaCatMap: RejaMap;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onMoveUntimed: (draggedId: string, beforeId: string | null) => void;
  onDefer: (id: string) => void;
  onCancel: (id: string) => void;
  onSettleDebt: (id: string) => void;
  onSnoozeDebt: (id: string, untilIso: string) => void;
}) {
  const [debtId, setDebtId] = useState<string | null>(null);
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : null;
  const done = doneList.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const active = blocks.reduce((n, b) => n + b.items.length, 0);

  return (
    <div className="pb-32 md:hidden">
      <MobileHeader
        title="Bugun"
        sub={formatUzDate(today)}
        aside={
          total > 0 ? (
            <span className="flex items-center gap-1.5 text-[13px] font-semibold tabular-nums text-muted">
              <Ring value={pct / 100} size={22} stroke={3}>{pct === 100 && <Check className="size-3" strokeWidth={3} />}</Ring>
              {done}/{total}
            </span>
          ) : null
        }
      />

      <div className="px-4">
        {/* Bugun paneli: Analitika · Maqsad · Reja · Agenda (Boshqaruv'da sozlanadi) */}
        <TodayPanel plans={plans} today={today} todayIso={todayIso} onToggle={onToggle} onOpen={onOpen} />

        {/* Qarz muddati eslatmalari */}
        {debtReminders.length > 0 && (
          <>
            <SectionLabel label="Qarz eslatmalari" count={debtReminders.length} />
            <div className={groupCls}>
              <AnimatePresence initial={false}>
                {debtReminders.map((r) => (
                  <motion.div key={r.debt.id} {...ROW_MOTION}>
                    <DebtRow reminder={r} todayIso={todayIso} onOpen={() => setDebtId(r.debt.id)} onSettle={() => onSettleDebt(r.debt.id)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Bugungi ro'yxat — bitta LayoutGroup: kartochkalar "Bajarilgan"ga suzib o'tadi */}
        <LayoutGroup>
        {total === 0 && !hydrated ? (
          <ListLoader />
        ) : total === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-subtle text-faint"><Inbox className="size-6" /></span>
            <p className="mt-3 text-[17px] font-semibold">Ro&apos;yxat bo&apos;sh</p>
            <p className="mx-auto mt-1 max-w-[260px] text-[14px] leading-relaxed text-muted">Pastdagi + tugmasi orqali birinchi rejangizni qo&apos;shing. Vaqt bersangiz, kun bo&apos;laklariga o&apos;zi joylashadi.</p>
            <button type="button" onClick={onAdd} className="mx-auto mt-5 flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[14.5px] font-semibold text-accent-ink">
              <Plus className="size-4" strokeWidth={2.6} /> Reja qo&apos;shish
            </button>
          </div>
        ) : active === 0 ? (
          <div className="mt-4 rounded-[24px] border border-dashed border-border px-6 py-8 text-center">
            <p className="text-[16px] font-semibold">Bugungi ishlar tugadi</p>
            <p className="mt-1 text-[13.5px] text-muted">Dam oling yoki ertangi kunga reja qo&apos;shing.</p>
          </div>
        ) : (
          blocks.map((b) => {
            if (b.items.length === 0) return null;
            const Icon = ICONS[b.key];
            return (
              <Glide key={b.key}>
                <SectionLabel label={b.label} count={b.items.length} icon={Icon} danger={b.danger} />
                {b.key === "anytime" ? (
                  <UntimedList items={b.items} rejaCatMap={rejaCatMap} onToggle={onToggle} onOpen={onOpen} onMove={onMoveUntimed} />
                ) : (
                  <div className="space-y-1.5">
                    {b.items.map((p) => {
                      // Vaqti kelgan, davomiyligi tugamagan — "Hozir".
                      const activeNow = !!p.time && nowMin !== null && parseTimeToMinutes(p.time) <= nowMin && nowMin <= parseTimeToMinutes(p.time) + (p.duration ?? 0);
                      return (
                        <MoveCard key={p.id} id={p.id} className={cn(b.danger && "border-danger/40")}>
                          <TaskRow plan={p} reja={rejaCatMap.get(p.id)} overdue={b.danger} activeNow={activeNow} onToggle={() => onToggle(p.id)} onOpen={() => onOpen(p.id)} />
                        </MoveCard>
                      );
                    })}
                  </div>
                )}
              </Glide>
            );
          })
        )}

        {/* Bugun bajarilganlar — belgilangan reja shu yerga suzib tushadi, belgini
            olib tashlasa joyiga qaytadi. Ochiq/yopiqligi eslab qolinadi. */}
        <DoneList label="Bugun bajarilgan" count={done} storageKey="bugun" className="mt-4">
          {[...doneList].sort(byCompletedDesc).map((p) => (
            <MoveCard key={p.id} id={p.id}>
              <TaskRow plan={p} reja={rejaCatMap.get(p.id)} onToggle={() => onToggle(p.id)} onOpen={() => onOpen(p.id)} />
            </MoveCard>
          ))}
        </DoneList>

        {/* Muddati o'tgan, 7 kundan kam */}
        {missed.length > 0 && (
          <Glide>
          <Collapsed label="Bajarilmagan" count={missed.length} hint="O'tgan 7 kun" className="mt-2.5">
            <div className={groupCls}>
              <AnimatePresence initial={false}>
                {missed.map((p) => (
                  <motion.div key={p.id} {...ROW_MOTION}>
                    <MissedRow plan={p} todayIso={todayIso} onToggle={() => onToggle(p.id)} onOpen={() => onOpen(p.id)} onDefer={() => onDefer(p.id)} onCancel={() => onCancel(p.id)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Collapsed>
          </Glide>
        )}
        </LayoutGroup>
      </div>

      <DebtSheet
        reminder={debtReminders.find((r) => r.debt.id === debtId) ?? null}
        todayIso={todayIso}
        onClose={() => setDebtId(null)}
        onSettle={(id) => { onSettleDebt(id); setDebtId(null); }}
        onSnooze={(id, days) => { onSnoozeDebt(id, shiftIso(todayIso, days)); setDebtId(null); }}
      />
    </div>
  );
}

function SectionLabel({ label, count, icon: Icon, danger }: { label: string; count: number; icon?: LucideIcon; danger?: boolean }) {
  return (
    <div className={cn("mb-1.5 mt-4 flex items-center justify-between px-1 text-[13px] font-semibold", danger ? "text-danger" : "text-muted")}>
      <span className="flex items-center gap-1.5">{Icon && <Icon className="size-4" />} {label}</span>
      <span className="tabular-nums opacity-70">{count}</span>
    </div>
  );
}

function TaskRow({ plan, reja, overdue, activeNow, onToggle, onOpen, handle }: {
  plan: Plan; reja?: { label: string; color: string }; overdue?: boolean; activeNow?: boolean; onToggle: () => void; onOpen: () => void; handle?: React.ReactNode;
}) {
  const { visual, toggle } = usePendingDone(plan.status === "DONE", onToggle);
  const end = plan.time && plan.duration ? minToHm(parseTimeToMinutes(plan.time) + plan.duration) : null;
  return (
    <div role="button" tabIndex={0} onClick={onOpen} className={cn("flex min-h-[64px] cursor-pointer items-center gap-3 bg-surface px-3.5 py-2.5 transition-colors active:bg-hover", handle && "pl-1.5")}>
      {handle}
      <PriorityDot p={plan.priority} dim={visual} />
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[15.5px] font-semibold leading-snug transition-colors", visual && "text-faint line-through decoration-faint/60")}>{plan.title}</span>
        {(plan.time || hasBadges(plan, reja)) && (
          <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-faint">
            {plan.time && (
              <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tabular-nums", visual ? "bg-subtle text-faint" : overdue ? "bg-danger-soft text-danger" : activeNow ? "bg-accent text-accent-ink" : "bg-subtle text-foreground")}>
                <Clock className="size-3" /> {plan.time}{end ? `–${end}` : ""}
              </span>
            )}
            {activeNow && !visual && <span className="font-semibold text-foreground">Hozir</span>}
            <TaskBadges plan={plan} reja={reja} />
          </span>
        )}
      </span>
      <Tick on={visual} onClick={toggle} />
    </div>
  );
}

const minToHm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/* Vaqtsiz: qatorni uzoq bosib surib tartiblash (Tezkor ro'yhati bilan bir xil). */
function UntimedList({ items, rejaCatMap, onToggle, onOpen, onMove }: {
  items: Plan[]; rejaCatMap: RejaMap; onToggle: (id: string) => void; onOpen: (id: string) => void; onMove: (draggedId: string, beforeId: string | null) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const { dragId, overId } = useLongPressReorder(listRef, onMove);
  return (
    <div ref={listRef} className={cn("space-y-1.5", dragId && "touch-none")}>
      {items.map((p) => (
        <MoveCard
          key={p.id}
          id={p.id}
          data-reorder-id={p.id}
          className={cn(
            "relative select-none transition-[box-shadow] [-webkit-touch-callout:none]",
            dragId === p.id && "z-10 shadow-lg",
            overId === p.id && dragId !== p.id && "shadow-[inset_0_2px_0_var(--foreground)]",
          )}
        >
          <TaskRow
            plan={p}
            reja={rejaCatMap.get(p.id)}
            onToggle={() => onToggle(p.id)}
            onOpen={() => onOpen(p.id)}
          />
        </MoveCard>
      ))}
    </div>
  );
}

function MissedRow({ plan, todayIso, onToggle, onOpen, onDefer, onCancel }: {
  plan: Plan; todayIso: string; onToggle: () => void; onOpen: () => void; onDefer: () => void; onCancel: () => void;
}) {
  // "Bajardim" — belgilash esdan chiqqan bo'lsa.
  const { visual, toggle } = usePendingDone(false, onToggle);
  const ago = daysBetween(plan.scheduledFor, todayIso);
  const blocked = plan.deferCount >= DEFER_LIMIT;
  return (
    <div className="px-3.5 py-3">
      <div role="button" tabIndex={0} onClick={onOpen} className="flex cursor-pointer items-center gap-3">
        <PriorityDot p={plan.priority} dim={visual} />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[15.5px] font-semibold", visual && "text-faint line-through")}>{plan.title}</span>
          <span className="mt-0.5 flex flex-wrap gap-x-2 text-[12.5px] text-faint">
            <span>{formatDateLong(fromDateInputValue(plan.scheduledFor))}{plan.time ? `, ${plan.time}` : ""} · {ago === 1 ? "kecha" : `${ago} kun oldin`}</span>
            {plan.deferCount > 0 && <span className="font-semibold text-warning">{plan.deferCount} marta ko&apos;chirilgan</span>}
          </span>
        </span>
        <Tick on={visual} onClick={toggle} label="Bajardim" />
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2 pl-5">
        <button type="button" disabled={blocked} onClick={onDefer} className="flex h-10 items-center justify-center gap-1.5 rounded-[14px] border border-border text-[13px] font-semibold disabled:border-dashed disabled:text-faint/60">
          <CalendarPlus className="size-4" /> Bugunga
        </button>
        <button type="button" onClick={onCancel} className="flex h-10 items-center justify-center gap-1.5 rounded-[14px] border border-border text-[13px] font-semibold text-muted">
          <Ban className="size-4" /> Kerak emas
        </button>
      </div>
      {blocked && <p className="mt-2 pl-5 text-[12px] leading-snug text-warning">{DEFER_LIMIT} marta ko&apos;chirilgan — bugun bajaring yoki kerak emas deb belgilang.</p>}
    </div>
  );
}

function DebtRow({ reminder, todayIso, onOpen, onSettle }: { reminder: DebtReminder; todayIso: string; onOpen: () => void; onSettle: () => void }) {
  const { debt, overdue, outstanding } = reminder;
  const borrowed = debt.type === "BORROWED";
  const Icon = borrowed ? Wallet : HandCoins;
  const late = debt.dueDate ? daysBetween(debt.dueDate, todayIso) : 0;
  return (
    <div role="button" tabIndex={0} onClick={onOpen} className="flex min-h-[66px] cursor-pointer items-center gap-3 px-3.5 py-3 active:bg-hover">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", overdue ? "bg-danger-soft text-danger" : "bg-subtle text-foreground")}><Icon className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15.5px] font-semibold">{debt.counterparty} · <span className="tabular-nums">{formatMoney(outstanding, debt.currency)}</span></span>
        <span className={cn("mt-0.5 block text-[12.5px]", overdue ? "text-danger" : "text-muted")}>
          {borrowed ? "Qaytarishim kerak" : "Menga qaytaradi"} · {overdue ? `muddati ${late} kun o'tdi` : debt.dueDate === todayIso ? "muddati bugun" : `muddati ${formatDateLong(fromDateInputValue(debt.dueDate!))}`}
        </span>
      </span>
      <Tick on={false} onClick={onSettle} label="Hal qilindi" />
    </div>
  );
}

const SNOOZE = [{ days: 1, label: "Ertaga" }, { days: 3, label: "3 kun" }, { days: 7, label: "1 hafta" }];

function DebtSheet({ reminder, todayIso, onClose, onSettle, onSnooze }: {
  reminder: DebtReminder | null; todayIso: string; onClose: () => void; onSettle: (id: string) => void; onSnooze: (id: string, days: number) => void;
}) {
  // Yopilish animatsiyasi paytida ham oxirgi qiymat ko'rinsin.
  const last = useRef(reminder);
  if (reminder) last.current = reminder;
  const r = reminder ?? last.current;
  return (
    <MonoSheet open={!!reminder} onClose={onClose} label="Qarz eslatmasi">
      {r && (
        <>
          <div className="rounded-[24px] border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-muted">Qarz eslatmasi</p>
                <p className="mt-0.5 text-[21px] font-bold leading-tight tracking-[-0.02em]">{r.debt.counterparty}</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Yopish" className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle"><X className="size-4" strokeWidth={2.4} /></button>
            </div>
            <p className="mt-3 text-[30px] font-bold tabular-nums tracking-[-0.03em]">{formatMoney(r.outstanding, r.debt.currency)}</p>
            <p className={cn("mt-1 text-[13.5px]", r.overdue ? "text-danger" : "text-muted")}>
              {r.debt.type === "BORROWED" ? "Men oldim — qaytarishim kerak" : "Men berdim — menga qaytaradi"}
              {r.debt.dueDate && ` · muddat ${formatDateLong(fromDateInputValue(r.debt.dueDate))}${r.debt.dueDate < todayIso ? " (o'tgan)" : ""}`}
            </p>
          </div>
          <button type="button" onClick={() => onSettle(r.debt.id)} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[22px] bg-accent text-[15.5px] font-semibold text-accent-ink">
            <Check className="size-5" strokeWidth={2.6} /> Hal qilindi
          </button>
          <p className="px-2 pt-1 text-[13px] font-semibold text-muted">Keyinroq eslatish</p>
          <div className="grid grid-cols-3 gap-2">
            {SNOOZE.map((o) => (
              <button key={o.days} type="button" onClick={() => onSnooze(r.debt.id, o.days)} className="h-12 rounded-[16px] border border-border bg-surface text-[14.5px] font-semibold">{o.label}</button>
            ))}
          </div>
          <Link href="/moliya" onClick={onClose} className="flex h-12 items-center justify-center gap-1.5 rounded-[16px] text-[14px] font-semibold text-muted active:bg-hover">
            Moliyada ochish <ChevronRight className="size-4" />
          </Link>
        </>
      )}
    </MonoSheet>
  );
}
