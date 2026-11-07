"use client";

/* Agenda — mobil ko'rinish: oraliq filtrlari, kunlar bo'yicha guruhlar,
   vaqtsizlarni tutqich bilan tartiblash. Desktop o'zgarmagan. */

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock } from "lucide-react";
import type { Plan } from "@/lib/types";
import { daysBetween } from "@/lib/plan-status";
import { formatDateLong, fromDateInputValue, parseTimeToMinutes } from "@/lib/dates";
import { useLongPressReorder } from "@/lib/use-long-press-reorder";
import { cn } from "@/lib/utils";
import { ListLoader } from "../widgets/list-loader";
import { MobileHeader, PriorityDot, ROW_MOTION, TaskBadges, Tick, groupCls, hasBadges, usePendingDone } from "./mobile-ui";

const WEEKDAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
type Filter = "all" | "tomorrow" | "week" | "later";
type RejaMap = Map<string, { label: string; color: string }>;

export function AgendaMobile({ hydrated, upcoming, todayIso, rejaCatMap, onToggle, onOpen, onAdd, onMoveUntimed }: {
  hydrated: boolean;
  upcoming: Plan[];
  todayIso: string;
  rejaCatMap: RejaMap;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onMoveUntimed: (draggedId: string, beforeId: string | null) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const listRef = useRef<HTMLDivElement>(null);
  // Vaqtsiz rejalar uzoq bosib suriladi; boshqa kunga o'tkazish ruxsat etilmaydi (onMoveUntimed).
  const drag = useLongPressReorder(listRef, onMoveUntimed);
  const inFilter = (p: Plan, f: Filter) => {
    const d = daysBetween(todayIso, p.scheduledFor);
    return f === "all" || (f === "tomorrow" ? d === 1 : f === "week" ? d <= 7 : d > 7);
  };
  const groups = useMemo(() => {
    const map = new Map<string, Plan[]>();
    for (const p of upcoming) if (inFilter(p, filter)) map.set(p.scheduledFor, [...(map.get(p.scheduledFor) ?? []), p]);
    return [...map.entries()];
  }, [upcoming, filter, todayIso]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: "Hammasi" },
    { id: "tomorrow", label: "Ertaga" },
    { id: "week", label: "7 kun ichida" },
    { id: "later", label: "Keyinroq" },
  ];

  function heading(iso: string) {
    const d = daysBetween(todayIso, iso);
    if (d === 1) return "Ertaga";
    if (d < 7) return WEEKDAYS[fromDateInputValue(iso).getDay()];
    return formatDateLong(fromDateInputValue(iso));
  }
  function sub(iso: string) {
    const d = daysBetween(todayIso, iso);
    return d < 7 ? formatDateLong(fromDateInputValue(iso)) : WEEKDAYS[fromDateInputValue(iso).getDay()].toLowerCase();
  }

  return (
    <div ref={listRef} className={cn("pb-32 md:hidden", drag.dragId && "touch-none")}>
      <MobileHeader title="Agenda" sub="Yaqin kunlar" aside={upcoming.length > 0 ? `${upcoming.length} ta reja` : null} />

      <div className="px-4">
        {upcoming.length > 0 && (
          <div className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {tabs.map((t) => {
              const on = filter === t.id;
              return (
                <button key={t.id} type="button" onClick={() => setFilter(t.id)} className={cn("flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[14px] font-semibold transition-colors", on ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface text-muted")}>
                  {t.label}
                  <span className={cn("tabular-nums", on ? "opacity-70" : "text-faint")}>{upcoming.filter((p) => inFilter(p, t.id)).length}</span>
                </button>
              );
            })}
          </div>
        )}

        {upcoming.length === 0 && !hydrated ? (
          <ListLoader />
        ) : upcoming.length === 0 ? (
          <EmptyState title="Keyinroq qilinadigan rejalar" text="Bugun emas, lekin ertaga, bu hafta yoki keyinroq bajarish kerak bo'lgan ishlarni shu yerga yozing." onAdd={onAdd} />
        ) : groups.length === 0 ? (
          <EmptyState title="Bu oraliqda reja yo'q" text="Boshqa oraliqni tanlang yoki yangi reja qo'shing." />
        ) : (
          <AnimatePresence initial={false}>
            {groups.map(([iso, items]) => {
              const timed = items.filter((p) => p.time);
              const untimed = items.filter((p) => !p.time);
              return (
                <motion.section key={iso} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ height: { duration: 0.34, ease: [0.32, 0.72, 0, 1] }, opacity: { duration: 0.2 } }} className="overflow-hidden">
                  <div className="mb-1.5 mt-4 flex items-baseline gap-2 px-1">
                    <h2 className="text-[15px] font-bold tracking-[-0.01em]">{heading(iso)}</h2>
                    <span className="truncate text-[12.5px] text-faint">{sub(iso)}</span>
                    <span className="ml-auto text-[12.5px] font-semibold tabular-nums text-faint">{items.length}</span>
                  </div>
                  <div className={groupCls}>
                    <AnimatePresence initial={false}>
                      {timed.map((p) => (
                        <motion.div key={p.id} {...ROW_MOTION}>
                          <AgendaRow plan={p} reja={rejaCatMap.get(p.id)} onToggle={() => onToggle(p.id)} onOpen={() => onOpen(p.id)} />
                        </motion.div>
                      ))}
                      {untimed.map((p) => (
                        <motion.div
                          key={p.id}
                          {...ROW_MOTION}
                          data-reorder-id={p.id}
                          className={cn(
                            "relative select-none transition-[box-shadow,transform] [-webkit-touch-callout:none]",
                            drag.dragId === p.id && "z-10 scale-[1.02] shadow-lg",
                            drag.overId === p.id && drag.dragId !== p.id && "shadow-[inset_0_2px_0_var(--foreground)]",
                          )}
                        >
                          <AgendaRow
                            plan={p}
                            reja={rejaCatMap.get(p.id)}
                            onToggle={() => onToggle(p.id)}
                            onOpen={() => onOpen(p.id)}
                            lead={<span className="flex w-[52px] shrink-0 items-center justify-center text-[11px] font-medium text-faint">vaqtsiz</span>}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.section>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, text, onAdd }: { title: string; text: string; onAdd?: () => void }) {
  return (
    <div className="px-6 py-12 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-subtle text-faint"><CalendarClock className="size-6" /></span>
      <p className="mt-3 text-[17px] font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-[270px] text-[14px] leading-relaxed text-muted">{text}</p>
      {onAdd && <button type="button" onClick={onAdd} className="mx-auto mt-5 h-11 rounded-full bg-accent px-5 text-[14.5px] font-semibold text-accent-ink">Reja qo&apos;shish</button>}
    </div>
  );
}

function AgendaRow({ plan, reja, onToggle, onOpen, lead }: { plan: Plan; reja?: { label: string; color: string }; onToggle: () => void; onOpen: () => void; lead?: React.ReactNode }) {
  const { visual, toggle } = usePendingDone(plan.status === "DONE", onToggle);
  const end = plan.time && plan.duration ? parseTimeToMinutes(plan.time) + plan.duration : null;
  return (
    <div role="button" tabIndex={0} onClick={onOpen} className={cn("flex min-h-[66px] cursor-pointer items-center gap-3 bg-surface py-2.5 pl-2 pr-3.5 active:bg-hover")}>
      {lead ?? (
        <span className="flex w-[52px] shrink-0 flex-col items-center leading-tight">
          <span className={cn("text-[15px] font-bold tabular-nums", visual && "text-faint")}>{plan.time}</span>
          {end !== null && <span className="text-[11px] tabular-nums text-faint">{`${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`}</span>}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <PriorityDot p={plan.priority} dim={visual} />
          <span className={cn("truncate text-[15.5px] font-semibold", visual && "text-faint line-through decoration-faint/60")}>{plan.title}</span>
        </span>
        {hasBadges(plan, reja) && <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-4 text-[12.5px] text-faint"><TaskBadges plan={plan} reja={reja} /></span>}
      </span>
      <Tick on={visual} onClick={toggle} />
    </div>
  );
}
