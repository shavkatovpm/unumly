"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Clock, ListChecks, RotateCcw, Trash2, X } from "lucide-react";
import {
  togglePlanStatus,
  removePlan,
  useCompletedPlans,
  useHydrated,
} from "@/lib/plans-store";
import {
  removeList,
  restoreCompletedList,
  useCompletedQuickLists,
} from "@/lib/tezkor-store";
import { useIdeas } from "@/lib/ideas-store";
import type { Idea, Plan } from "@/lib/types";
import type { QuickList } from "@/lib/tezkor-types";
import { cn } from "@/lib/utils";
import { formatUzDate } from "@/lib/dates";
import { ConfirmDialog, useConfirmRemove } from "./widgets/confirm-dialog";
import { MonoSheet } from "./widgets/mono-sheet";
import { MONO_GROUP, MonoCount, MonoEmpty, MonoLabel, MonoTick, MonoTitle } from "./widgets/mono-bits";
import { ListLoader } from "./widgets/list-loader";

const PRIORITY_DOT: Record<NonNullable<Plan["priority"]>, string> = {
  HIGH: "bg-priority-high",
  MEDIUM: "bg-priority-medium",
  LOW: "bg-priority-low",
};

function dayKey(iso?: string): string {
  if (!iso) return "—";
  return iso.slice(0, 10); // YYYY-MM-DD
}

type FeedEntry =
  | { kind: "plan"; id: string; completedAt: string; plan: Plan }
  | { kind: "list"; id: string; completedAt: string; list: QuickList }
  | { kind: "idea"; id: string; completedAt: string; idea: Idea };

export function BajarilganView() {
  const completedPlans = useCompletedPlans();
  const completedLists = useCompletedQuickLists();
  const { ideas, hydrated: ideasHydrated, toggleDone: restoreIdea, remove: removeIdea } = useIdeas();
  const hydrated = useHydrated();

  // Sanasiz, rejada bajarilgan g'oyalar (sanali g'oyalar Plan sifatida
  // yuqorida allaqachon ko'rinadi — takror bo'lmasligi uchun ularni chiqaramiz).
  const completedIdeas = useMemo(
    () => ideas.filter((i) => i.done && !i.scheduledFor),
    [ideas]
  );

  const { askRemove: askRemovePlan, confirmEl: confirmPlanEl } = useConfirmRemove(
    completedPlans,
    removePlan,
    {
      description:
        '"{title}" o\'chiriladi va 30 kun davomida "O\'chirilgan" bo\'limida saqlanadi.',
    }
  );
  const { askRemove: askRemoveIdea, confirmEl: confirmIdeaEl } = useConfirmRemove(
    completedIdeas.map((i) => ({ id: i.id, title: i.title })),
    removeIdea,
    {
      itemLabel: "G'oyani",
      description: '"{title}" butunlay o\'chiriladi. Bu amalni qaytarib bo\'lmaydi.',
    }
  );

  // Build a unified day-grouped feed of completed plans + lists.
  const groups = useMemo(() => {
    const map = new Map<string, FeedEntry[]>();
    for (const p of completedPlans) {
      const at = p.completedAt ?? p.createdAt;
      const key = dayKey(at);
      const arr = map.get(key) ?? [];
      arr.push({ kind: "plan", id: p.id, completedAt: at, plan: p });
      map.set(key, arr);
    }
    for (const l of completedLists) {
      const at = l.completedAt ?? l.updatedAt;
      const key = dayKey(at);
      const arr = map.get(key) ?? [];
      arr.push({ kind: "list", id: l.id, completedAt: at, list: l });
      map.set(key, arr);
    }
    for (const idea of completedIdeas) {
      const at = idea.completedAt ?? idea.createdAt;
      const key = dayKey(at);
      const arr = map.get(key) ?? [];
      arr.push({ kind: "idea", id: idea.id, completedAt: at, idea });
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .map(([key, entries]) => ({
        key,
        date: new Date(key + "T00:00:00"),
        entries: entries
          .slice()
          .sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
      }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [completedPlans, completedLists, completedIdeas]);

  // Mobil: ro'yxatni o'chirish ham umumiy tasdiqlash oynasi orqali
  const [askList, setAskList] = useState<QuickList | null>(null);

  const totalCount = completedPlans.length + completedLists.length + completedIdeas.length;

  function confirmRemoveList(id: string, name: string) {
    if (typeof window !== "undefined" && !window.confirm(`"${name}" o'chirilsinmi? (30 kun davomida tiklash mumkin)`)) return;
    removeList(id);
  }

  return (
    <>
    <BajarilganMobile
      groups={groups}
      total={totalCount}
      loading={totalCount === 0 && (!hydrated || !ideasHydrated)}
      onRestore={(e) => (e.kind === "plan" ? togglePlanStatus(e.id) : e.kind === "list" ? restoreCompletedList(e.id) : restoreIdea(e.id))}
      onRemove={(e) => (e.kind === "plan" ? askRemovePlan(e.id) : e.kind === "idea" ? askRemoveIdea(e.id) : setAskList(e.list))}
    />
    <ConfirmDialog
      open={!!askList}
      title="Ro'yxatni o'chirish"
      description={askList ? `"${askList.name}" o'chiriladi va 30 kun davomida «O'chirilgan» bo'limida saqlanadi.` : undefined}
      confirmLabel="O'chirish"
      destructive
      onConfirm={() => { if (askList) removeList(askList.id); setAskList(null); }}
      onClose={() => setAskList(null)}
    />
    <div data-scroll-lock-on-focus className="hidden h-screen flex-col overflow-y-auto md:flex">
      <header className="flex h-12 items-center justify-between gap-2 border-b border-border px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] sm:text-[13px]">
            Bajarilgan
          </h1>
          <span className="truncate text-[13px] text-faint sm:text-[12px]">
            Yakunlangan rejalar va ro&apos;yhatlar
          </span>
        </div>
        <p className="shrink-0 font-mono text-[11px] tabular-nums text-faint">
          {totalCount}
        </p>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:py-8 md:pb-8 lg:max-w-3xl xl:max-w-4xl">
        {totalCount === 0 && (!hydrated || !ideasHydrated) ? (
          <ListLoader />
        ) : totalCount === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
            <CheckCircle2 className="mx-auto size-6 text-faint" strokeWidth={1.5} />
            <p className="mt-3 text-[13.5px] text-muted">
              Hozircha bajarilgan reja yo&apos;q.
            </p>
            <p className="mt-1 text-[11.5px] text-faint">
              Bajarilgan ishlar shu yerda saqlanadi va o&apos;chmaydi.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.key}>
                <header className="mb-2 flex items-baseline gap-3 px-1">
                  <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
                    {formatUzDate(g.date)}
                  </h3>
                  <span className="ml-auto font-mono text-[10.5px] tabular-nums text-faint">
                    {g.entries.length}
                  </span>
                </header>

                <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
                  {g.entries.map((entry) =>
                    entry.kind === "plan" ? (
                      <CompletedPlanRow
                        key={`p-${entry.id}`}
                        plan={entry.plan}
                        onRestore={() => togglePlanStatus(entry.plan.id)}
                        onRemove={() => askRemovePlan(entry.plan.id)}
                      />
                    ) : entry.kind === "list" ? (
                      <CompletedListRow
                        key={`l-${entry.id}`}
                        list={entry.list}
                        onRestore={() => restoreCompletedList(entry.list.id)}
                        onRemove={() => confirmRemoveList(entry.list.id, entry.list.name)}
                      />
                    ) : (
                      <CompletedIdeaRow
                        key={`i-${entry.id}`}
                        idea={entry.idea}
                        onRestore={() => restoreIdea(entry.idea.id)}
                        onRemove={() => askRemoveIdea(entry.idea.id)}
                      />
                    )
                  )}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

    </div>
    {confirmPlanEl}
    {confirmIdeaEl}
    </>
  );
}

function CompletedPlanRow({
  plan,
  onRestore,
  onRemove,
}: {
  plan: Plan;
  onRestore: () => void;
  onRemove: () => void;
}) {
  const priorityDot = plan.priority ? PRIORITY_DOT[plan.priority] : "bg-faint/40";

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

      <span className="min-w-0 flex-1 truncate text-[14px] text-muted line-through sm:text-[13.5px]">
        {plan.title}
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
          onClick={onRemove}
          aria-label="O'chirish"
          title="O'chirish"
          className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

function CompletedIdeaRow({
  idea,
  onRestore,
  onRemove,
}: {
  idea: Idea;
  onRestore: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 border-b border-border/70 px-3 py-2.5 last:border-b-0 hover:bg-hover/40">
      <span
        aria-hidden
        className="grid size-5 shrink-0 place-items-center rounded text-faint/70"
      >
        <ClipboardList className="size-3.5" />
      </span>

      <span className="w-[58px] shrink-0 text-center font-mono text-[10.5px] text-faint">
        reja
      </span>

      <span className="min-w-0 flex-1 truncate text-[14px] text-muted line-through sm:text-[13.5px]">
        {idea.title}
      </span>

      <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-60 sm:transition-opacity sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={onRestore}
          aria-label="Qayta tiklash"
          title="Qayta tiklash (Reja'ga)"
          className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
        >
          <RotateCcw className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="O'chirish"
          title="O'chirish"
          className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

function CompletedListRow({
  list,
  onRestore,
  onRemove,
}: {
  list: QuickList;
  onRestore: () => void;
  onRemove: () => void;
}) {
  const total = list.items.length;
  const done = list.items.filter((i) => i.done).length;

  return (
    <li className="group flex items-center gap-3 border-b border-border/70 px-3 py-2.5 last:border-b-0 hover:bg-hover/40">
      <span
        aria-hidden
        className="grid size-5 shrink-0 place-items-center rounded text-faint/70"
      >
        <ListChecks className="size-3.5" />
      </span>

      <span className="w-[58px] shrink-0 text-center font-mono text-[10.5px] tabular-nums text-faint">
        {done}/{total}
      </span>

      <span className="min-w-0 flex-1 truncate text-[14px] text-muted line-through sm:text-[13.5px]">
        {list.name}
      </span>

      <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-60 sm:transition-opacity sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={onRestore}
          aria-label="Qayta tiklash"
          title="Qayta tiklash (Tezkor'ga)"
          className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
        >
          <RotateCcw className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="O'chirish"
          title="O'chirish"
          className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

/* ─── Mobil ko'rinish ─── */

const MOBILE_PRIO: Record<string, { label: string; dot: string }> = {
  HIGH: { label: "Muhim", dot: "bg-priority-high" },
  MEDIUM: { label: "O'rta", dot: "bg-priority-medium" },
  LOW: { label: "Past", dot: "bg-priority-low" },
  none: { label: "Darajasiz", dot: "bg-faint/40" },
};
const KIND = {
  plan: { label: "Reja", back: "Bugunga qaytadi", filter: "Rejalar" },
  list: { label: "Tezkor ro'yxat", back: "Tezkor'ga qaytadi", filter: "Ro'yxatlar" },
  idea: { label: "Reja g'oyasi", back: "Reja'ga qaytadi", filter: "G'oyalar" },
} as const;
type Filter = "all" | FeedEntry["kind"];

function entryTitle(e: FeedEntry) {
  return e.kind === "plan" ? e.plan.title : e.kind === "list" ? e.list.name : e.idea.title;
}
function entrySub(e: FeedEntry) {
  if (e.kind === "plan") return `${e.plan.time ?? "Vaqtsiz"} · ${MOBILE_PRIO[e.plan.priority ?? "none"].label}`;
  if (e.kind === "list") return `${e.list.items.filter((i) => i.done).length}/${e.list.items.length} band · Tezkor`;
  return "Reja";
}
function dayLabel(date: Date) {
  const t = new Date();
  const k = (d: Date) => d.toDateString();
  if (k(date) === k(t)) return "Bugun";
  if (k(date) === k(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1))) return "Kecha";
  return formatUzDate(date);
}

function BajarilganMobile({ groups, total, loading, onRestore, onRemove }: {
  groups: { key: string; date: Date; entries: FeedEntry[] }[];
  total: number;
  loading: boolean;
  onRestore: (e: FeedEntry) => void;
  onRemove: (e: FeedEntry) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const all = groups.flatMap((g) => g.entries);
  const found = all.find((e) => `${e.kind}-${e.id}` === openKey) ?? null;
  const [last, setLast] = useState<FeedEntry | null>(null);
  if (found && found !== last) setLast(found);
  const detail = found ?? last;
  const count = (f: Filter) => all.filter((e) => f === "all" || e.kind === f).length;
  const shown = groups
    .map((g) => ({ ...g, entries: g.entries.filter((e) => filter === "all" || e.kind === filter) }))
    .filter((g) => g.entries.length > 0);

  return (
    <div className="flex flex-col overflow-hidden md:hidden" style={{ height: "calc(var(--tg-vh, 100vh) - var(--tg-safe-top, 0px))" }}>
      <header className="shrink-0 px-4 pb-2.5 pt-1">
        <MonoTitle sub="Yakunlangan ishlar" aside={<MonoCount>{total}</MonoCount>}>Bajarilgan</MonoTitle>
        <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
          {(["all", "plan", "list", "idea"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={cn("flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-semibold transition-colors", filter === f ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface text-muted")}>
              {f === "all" ? "Hammasi" : KIND[f].filter}
              <span className={cn("tabular-nums", filter === f ? "opacity-70" : "text-faint")}>{count(f)}</span>
            </button>
          ))}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-32">
        {loading ? (
          <ListLoader />
        ) : shown.length === 0 ? (
          <MonoEmpty icon={CheckCircle2} title="Hozircha bajarilgan reja yo'q" text="Bajarilgan ishlar shu yerda saqlanadi va o'chmaydi." />
        ) : (
          shown.map((g) => (
            <section key={g.key}>
              <MonoLabel aside={g.entries.length} className="first:mt-1">{dayLabel(g.date)}</MonoLabel>
              <div className={MONO_GROUP}>
                {g.entries.map((e) => (
                  <div key={`${e.kind}-${e.id}`} className="flex min-h-[64px] items-center gap-3 px-3.5">
                    <button type="button" onClick={() => setOpenKey(`${e.kind}-${e.id}`)} className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 py-2.5 text-left">
                      <span className="relative grid size-10 shrink-0 place-items-center rounded-[12px] bg-subtle text-muted">
                        {e.kind === "plan" ? <Clock className="size-[18px]" /> : e.kind === "list" ? <ListChecks className="size-[18px]" /> : <ClipboardList className="size-[18px]" />}
                        {e.kind === "plan" && <span className={cn("absolute right-1 top-1 size-2 rounded-full ring-2 ring-subtle", MOBILE_PRIO[e.plan.priority ?? "none"].dot)} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15.5px] text-muted line-through decoration-faint/60">{entryTitle(e)}</span>
                        <span className="block truncate text-[12.5px] tabular-nums text-faint">{entrySub(e)}</span>
                      </span>
                    </button>
                    <MonoTick on label="Qayta tiklash" onClick={() => onRestore(e)} />
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
        {total > 0 && <p className="mt-4 px-1 text-center text-[12.5px] text-faint">Belgini bossangiz — ish joyiga qaytadi.</p>}
      </div>

      <MonoSheet open={!!found} onClose={() => setOpenKey(null)} label={detail ? entryTitle(detail) : "Bajarilgan"}>
        {detail && (
          <>
            <div className="rounded-[24px] border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-muted">{KIND[detail.kind].label}</p>
                  <p className="mt-0.5 text-[21px] font-bold leading-tight tracking-[-0.02em] text-faint line-through decoration-faint/60">{entryTitle(detail)}</p>
                </div>
                <button type="button" onClick={() => setOpenKey(null)} aria-label="Yopish" className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle"><X className="size-4" strokeWidth={2.4} /></button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="flex h-8 items-center gap-1.5 rounded-full bg-subtle px-3 text-[13px] font-medium"><CheckCircle2 className="size-3.5" /> {dayLabel(new Date(detail.completedAt))}</span>
                <span className="flex h-8 items-center gap-1.5 rounded-full bg-subtle px-3 text-[13px] font-medium tabular-nums">{entrySub(detail)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { onRestore(detail); setOpenKey(null); }} className="flex h-[70px] flex-col items-center justify-center gap-1 rounded-[20px] bg-accent text-[12.5px] font-semibold text-accent-ink">
                <RotateCcw className="size-5" /> Qayta tiklash
              </button>
              <button type="button" onClick={() => { setOpenKey(null); onRemove(detail); }} className="flex h-[70px] flex-col items-center justify-center gap-1 rounded-[20px] border border-border bg-surface text-[12.5px] font-semibold text-danger">
                <Trash2 className="size-5" /> O&apos;chirish
              </button>
            </div>
            <p className="px-2 pb-1 text-center text-[12.5px] text-faint">{KIND[detail.kind].back} · {detail.kind === "idea" ? "o'chirilsa qaytarib bo'lmaydi" : "o'chirilsa 30 kun saqlanadi"}</p>
          </>
        )}
      </MonoSheet>
    </div>
  );
}
