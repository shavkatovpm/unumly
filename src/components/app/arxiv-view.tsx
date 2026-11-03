"use client";

import { useMemo, useState } from "react";
import { Archive, Ban, CalendarPlus, Clock, Flag, History, Repeat, X } from "lucide-react";
import {
  restorePlanToToday,
  useArchivedPlans,
  useCancelledPlans,
  useHydrated,
} from "@/lib/plans-store";
import { daysBetween, deferLabel, todayInTashkent } from "@/lib/plan-status";
import { formatDateLong, fromDateInputValue } from "@/lib/dates";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ListLoader } from "./widgets/list-loader";
import { MonoSheet, MonoTile } from "./widgets/mono-sheet";
import { MONO_GROUP, MonoCount, MonoEmpty, MonoLabel, MonoSeg, MonoTitle } from "./widgets/mono-bits";

/** Arxiv — bu yerga tushgan reja hech qachon o'chirilmaydi.
 *
 *  Ikki guruh:
 *    • Arxivlangan — 7 kundan ortiq bajarilmay qolgan (holat o'qishda
 *      hisoblanadi, DB'da hamon TODO turadi).
 *    • Kerak emas  — foydalanuvchi "Kerak emas ekan" degan (CANCELLED).
 */
export function ArxivView() {
  const archived = useArchivedPlans();
  const cancelled = useCancelledPlans();
  const hydrated = useHydrated();
  const today = useMemo(() => todayInTashkent(), []);

  const empty = archived.length === 0 && cancelled.length === 0;

  return (
    <>
    <ArxivMobile archived={archived} cancelled={cancelled} loading={empty && !hydrated} today={today} />
    <div className="mx-auto hidden w-full max-w-2xl px-4 py-6 md:block">
      <header className="mb-5">
        <h1 className="text-[19px] font-semibold tracking-tight text-foreground">
          Arxiv
        </h1>
        <p className="mt-1 text-[12.5px] text-muted">
          Bajarilmay qolgan va kerak emas deb belgilangan rejalar. Bu yerdan
          hech narsa o&apos;chirilmaydi — istagan vaqtda bugunga qaytarish mumkin.
        </p>
      </header>

      {empty && !hydrated ? (
        <ListLoader />
      ) : empty ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <p className="text-[13.5px] text-muted">Arxiv bo&apos;sh.</p>
          <p className="mt-1 text-[11px] text-faint">
            7 kundan ortiq bajarilmagan rejalar shu yerga tushadi.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Group
            icon={<Archive className="size-3.5" />}
            label="Arxivlangan"
            hint="7 kundan ortiq bajarilmagan"
            plans={archived}
            today={today}
          />
          <Group
            icon={<Ban className="size-3.5" />}
            label="Kerak emas"
            hint="o'zingiz bekor qilgan"
            plans={cancelled}
            today={today}
          />
        </div>
      )}
    </div>
    </>
  );
}

function Group({
  icon,
  label,
  hint,
  plans,
  today,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  plans: Plan[];
  today: string;
}) {
  if (plans.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
      <header className="flex items-center justify-between border-b border-border bg-subtle/30 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded text-faint">
            {icon}
          </span>
          <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">
            {label}
          </p>
          <p className="text-[10.5px] text-faint/70">{hint}</p>
        </div>
        <p className="font-mono text-[10.5px] tabular-nums text-faint">
          {plans.length}
        </p>
      </header>
      <ul className="divide-y divide-border/70">
        {plans.map((p) => (
          <ArxivRow key={p.id} plan={p} today={today} />
        ))}
      </ul>
    </section>
  );
}

function ArxivRow({ plan, today }: { plan: Plan; today: string }) {
  const daysAgo = daysBetween(plan.scheduledFor, today);
  const defers = deferLabel(plan.deferCount);

  return (
    <li className="flex items-start justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[13.5px] text-muted")}>{plan.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-faint">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {formatDateLong(fromDateInputValue(plan.scheduledFor))}
            {daysAgo > 0 && ` · ${daysAgo} kun oldin`}
          </span>
          {defers && <span className="text-warning">{defers}</span>}
        </p>
      </div>
      <button
        type="button"
        onClick={() => restorePlanToToday(plan.id)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11.5px] text-foreground transition-colors hover:bg-subtle"
      >
        <CalendarPlus className="size-3.5" />
        Bugunga
      </button>
    </li>
  );
}

/* ─── Mobil ko'rinish ─── */

const PRIO: Record<string, { label: string; dot: string }> = {
  HIGH: { label: "Muhim", dot: "bg-priority-high" },
  MEDIUM: { label: "O'rta", dot: "bg-priority-medium" },
  LOW: { label: "Past", dot: "bg-priority-low" },
  none: { label: "Darajasiz", dot: "bg-faint/40" },
};
type Kind = "archived" | "cancelled";
const KINDS = {
  archived: { label: "Arxivlangan", hint: "7 kundan ortiq bajarilmagan", icon: Archive },
  cancelled: { label: "Kerak emas", hint: "O'zingiz bekor qilgan", icon: Ban },
} as const;

function ArxivMobile({ archived, cancelled, loading, today }: { archived: Plan[]; cancelled: Plan[]; loading: boolean; today: string }) {
  const [kind, setKind] = useState<Kind>("archived");
  const [openId, setOpenId] = useState<string | null>(null);
  const all = [...archived, ...cancelled];
  const found = all.find((p) => p.id === openId) ?? null;
  const [last, setLast] = useState<Plan | null>(null);
  if (found && found !== last) setLast(found);
  const detail = found ?? last;
  const rows = kind === "archived" ? archived : cancelled;
  const meta = KINDS[kind];
  const detailKind: Kind = detail && cancelled.some((p) => p.id === detail.id) ? "cancelled" : "archived";

  function restore(p: Plan) {
    restorePlanToToday(p.id);
    setOpenId(null);
  }

  return (
    <div className="flex flex-col overflow-hidden md:hidden" style={{ height: "calc(var(--tg-vh, 100vh) - var(--tg-safe-top, 0px))" }}>
      <header className="shrink-0 px-4 pb-2.5 pt-1">
        <MonoTitle sub="Hech narsa o'chmaydi" aside={<MonoCount>{all.length}</MonoCount>}>Arxiv</MonoTitle>
        <div className="mt-2">
          <MonoSeg<Kind> value={kind} onChange={setKind} options={[{ id: "archived", label: `Arxivlangan · ${archived.length}` }, { id: "cancelled", label: `Kerak emas · ${cancelled.length}` }]} />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-32">
        {loading ? (
          <ListLoader />
        ) : rows.length === 0 ? (
          <MonoEmpty icon={meta.icon} title={kind === "archived" ? "Arxiv bo'sh" : "«Kerak emas» bo'sh"} text={kind === "archived" ? "7 kundan ortiq bajarilmagan rejalar shu yerga tushadi." : "«Kerak emas ekan» deb belgilagan rejalaringiz shu yerda turadi."} />
        ) : (
          <>
            <MonoLabel aside={rows.length} className="mt-1"><span className="flex items-center gap-1.5"><meta.icon className="size-3.5" /> {meta.hint}</span></MonoLabel>
            <div className={MONO_GROUP}>
              {rows.map((p) => {
                const ago = daysBetween(p.scheduledFor, today);
                return (
                  <div key={p.id} className="flex min-h-[66px] items-center gap-2 pl-3.5 pr-2.5">
                    <button type="button" onClick={() => setOpenId(p.id)} className="flex min-h-[66px] min-w-0 flex-1 items-center gap-3 py-2.5 text-left">
                      <span className={cn("size-2 shrink-0 rounded-full", PRIO[p.priority ?? "none"].dot)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15.5px] font-medium">{p.title}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-faint">
                          <span className="flex items-center gap-1 tabular-nums"><Clock className="size-3" />{ago > 0 ? `${ago} kun oldin` : formatDateLong(fromDateInputValue(p.scheduledFor))}</span>
                          {p.deferCount > 0 && <span className="text-warning">{deferLabel(p.deferCount)}</span>}
                        </span>
                      </span>
                    </button>
                    <button type="button" onClick={() => restore(p)} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-subtle px-3.5 text-[13.5px] font-semibold active:bg-hover">
                      <CalendarPlus className="size-4" /> Bugunga
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <div className="mt-5 flex gap-3 rounded-[22px] border border-border bg-surface p-4">
          <History className="mt-0.5 size-5 shrink-0 text-muted" />
          <p className="text-[13.5px] leading-relaxed text-muted">Bajarilmay qolgan va «Kerak emas» deb belgilangan rejalar shu yerda turadi. Istalgan vaqtda bugunga qaytarish mumkin.</p>
        </div>
      </div>

      <MonoSheet open={!!found} onClose={() => setOpenId(null)} label={detail?.title ?? "Arxiv"}>
        {detail && (
          <>
            <div className="rounded-[24px] border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-muted">{KINDS[detailKind].label} · {KINDS[detailKind].hint.toLowerCase()}</p>
                  <p className="mt-0.5 text-[21px] font-bold leading-tight tracking-[-0.02em]">{detail.title}</p>
                </div>
                <button type="button" onClick={() => setOpenId(null)} aria-label="Yopish" className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle"><X className="size-4" strokeWidth={2.4} /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MonoTile icon={Clock} label="Sana" value={formatDateLong(fromDateInputValue(detail.scheduledFor))} onClick={() => {}} />
              <MonoTile icon={Clock} label="Vaqt" value={detail.time ?? "Vaqtsiz"} onClick={() => {}} />
              <MonoTile icon={Flag} label="Muhimlik" value={PRIO[detail.priority ?? "none"].label} onClick={() => {}} />
              <MonoTile icon={Repeat} label="Ko'chirilgan" value={detail.deferCount > 0 ? `${detail.deferCount} marta` : "Hech qachon"} onClick={() => {}} />
            </div>
            <button type="button" onClick={() => restore(detail)} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[22px] bg-accent text-[15.5px] font-bold text-accent-ink">
              <CalendarPlus className="size-5" /> Bugunga qaytarish
            </button>
          </>
        )}
      </MonoSheet>
    </div>
  );
}
