"use client";

/**
 * "Maqsad" bo'limi — OKR uslubidagi 3 pog'ona: Maqsad → kichik maqsad → qadam.
 * Qadamni istalgan kunga (vaqt bilan) belgilash mumkin → Plan occurrence
 * sifatida Bugun/Agenda/Kalendarda ko'rinadi. Bu yerda maqsadlar boshqaruvi va
 * progress (foiz + muddatga qancha qolgani) vizual ko'rinishi.
 */

import { useMemo, useRef, useState } from "react";
import {
  Archive, ArchiveRestore, ArrowLeft, BookOpen, Brain, Briefcase, Calendar as CalendarIcon, Check, ChevronRight, Clock,
  Code, DollarSign, Dumbbell, Flag, GraduationCap, GripVertical, Heart, Home, Languages, Leaf, MapPin,
  Mountain, Music, Palette, Pencil, Plus, Rocket, Sparkles, Star, Target, Trash2, Trophy, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGoals, useGoalById, goalProgress } from "@/lib/goals-store";
import { usePlans } from "@/lib/plans-store";
import { usePointerReorder } from "@/lib/use-pointer-reorder";
import { occupiedTimeSlots } from "@/lib/dates";
import { ensureVisibleOnFocus } from "@/lib/ensure-visible";
import type { Goal, SubGoal, GoalStep } from "@/lib/types";
import { Dialog } from "./widgets/dialog";
import { ConfirmDialog } from "./widgets/confirm-dialog";
import { TimePickerPopover } from "./widgets/time-picker-popover";
import { DatePickerPopover } from "./widgets/date-picker-popover";

/* ─── Ikonalar ─── */
const ICONS = {
  target: Target, rocket: Rocket, flag: Flag, trophy: Trophy, mountain: Mountain, star: Star,
  sparkles: Sparkles, brain: Brain, dumbbell: Dumbbell, book: BookOpen, briefcase: Briefcase,
  dollar: DollarSign, grad: GraduationCap, heart: Heart, code: Code, languages: Languages,
  palette: Palette, music: Music, home: Home, leaf: Leaf,
} as const;
type IconKey = keyof typeof ICONS;
const ICON_CHOICES = Object.keys(ICONS) as IconKey[];
function randomIcon(): IconKey { return ICON_CHOICES[Math.floor(Math.random() * ICON_CHOICES.length)]; }
function GoalIcon({ k, className }: { k?: string; className?: string }) { const Ic = ICONS[(k as IconKey)] ?? Target; return <Ic className={className} strokeWidth={1.75} />; }

/* ─── Sana ─── */
const UZ_MONTHS = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];
const UZ_DOW = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];
function midnight(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function iso(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function addDays(s: string, n: number): string { const d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); }
const TODAY_ISO = iso(midnight(new Date()));
const TOMORROW_ISO = addDays(TODAY_ISO, 1);
function fromIso(s: string): Date { return new Date(`${s}T00:00:00`); }
function shortDate(s: string): string { const d = fromIso(s); return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}`; }
/** Do'stona sana: "Bugun" / "Ertaga" / "18-iyun, seshanba". */
function friendlyDate(s: string): string {
  if (s === TODAY_ISO) return "Bugun";
  if (s === TOMORROW_ISO) return "Ertaga";
  const d = fromIso(s);
  return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}, ${UZ_DOW[d.getDay()]}`;
}
function daysUntil(deadlineIso: string): number {
  const ms = fromIso(deadlineIso).getTime() - fromIso(TODAY_ISO).getTime();
  return Math.round(ms / 86400000);
}
/** Muddat yorlig'i + holat (xavfli=qizil bo'lsa true). */
function deadlineInfo(deadline?: string): { label: string; danger: boolean } | null {
  if (!deadline) return null;
  const d = daysUntil(deadline);
  if (d < 0) return { label: `${-d} kun o'tdi`, danger: true };
  if (d === 0) return { label: "Bugun", danger: true };
  if (d === 1) return { label: "Ertaga", danger: false };
  return { label: `${d} kun qoldi`, danger: false };
}

/* ─── Progress ring ─── */
function Ring({ pct, size = 48, stroke = 4, label, labelClassName }: { pct: number; size?: number; stroke?: number; label?: boolean; labelClassName?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <div className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--foreground)" strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 500ms cubic-bezier(0.16,1,0.3,1)" }} />
      </svg>
      {label && <span className={cn("absolute font-mono font-semibold tabular-nums", labelClassName ?? "text-[12px]")}>{pct}%</span>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */

type Tab = "active" | "done" | "archive";

export function MaqsadView() {
  const g = useGoals();
  const [tab, setTab] = useState<Tab>("active");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const detail = useGoalById(detailId);
  const editGoal = useMemo(() => [...g.active, ...g.done, ...g.archived].find((x) => x.id === editId) ?? null, [g.active, g.done, g.archived, editId]);

  if (detail) {
    return (
      <>
        <GoalDetail goal={detail} onBack={() => setDetailId(null)} onEdit={() => setEditId(detail.id)} api={g} />
        {editGoal && <GoalModal goal={editGoal} onClose={() => setEditId(null)} onSave={(patch) => { g.updateGoal(editGoal.id, patch); setEditId(null); }} />}
      </>
    );
  }

  const list = tab === "active" ? g.active : tab === "done" ? g.done : g.archived;

  return (
    <div className="flex flex-col overflow-y-auto" style={{ height: "var(--tg-vh, 100vh)" }}>
      <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-background/85 backdrop-blur">
        <div className="flex h-12 items-center px-4 md:px-6">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] sm:text-[13px]">Maqsad</h1>
        </div>
        <div className="flex gap-1 px-4 pb-2 md:px-6">
          {([["active", "Faol"], ["done", "Bajarilgan"], ["archive", "Arxiv"]] as [Tab, string][]).map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn("rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors", tab === k ? "bg-subtle text-foreground" : "text-faint hover:text-foreground")}>{lbl}</button>
          ))}
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-5 md:px-6 md:pb-12">
        {list.length === 0 ? (
          <EmptyState tab={tab} onAdd={() => setShowAdd(true)} />
        ) : (
          <div className="space-y-2.5">
            {list.map((goal) => <GoalCard key={goal.id} goal={goal} onOpen={() => setDetailId(goal.id)} />)}
            {tab === "active" && (
              <button type="button" onClick={() => setShowAdd(true)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3.5 text-[13px] font-medium text-faint transition-colors hover:border-border-strong hover:text-foreground"><Plus className="size-4" /> Maqsad qo&apos;shish</button>
            )}
          </div>
        )}
      </div>

      {showAdd && <GoalModal onClose={() => setShowAdd(false)} onSave={(patch) => { g.createGoal(patch); setShowAdd(false); }} />}
    </div>
  );
}

function EmptyState({ tab, onAdd }: { tab: Tab; onAdd: () => void }) {
  if (tab === "done") return <div className="grid place-items-center py-20 text-center"><Trophy className="size-7 text-faint" /><p className="mt-3 text-[14px] text-muted">Hali bajarilgan maqsad yo&apos;q</p></div>;
  if (tab === "archive") return <div className="grid place-items-center py-20 text-center"><Archive className="size-7 text-faint" /><p className="mt-3 text-[14px] text-muted">Arxiv bo&apos;sh</p></div>;
  return (
    <button type="button" onClick={onAdd} className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center transition-colors hover:border-border-strong">
      <span className="grid size-12 place-items-center rounded-full bg-subtle"><Target className="size-6 text-muted" /></span>
      <span className="text-[15px] font-medium text-foreground">Birinchi maqsadingizni qo&apos;shing</span>
      <span className="max-w-xs text-[12.5px] leading-relaxed text-faint">Katta maqsad qo&apos;ying, uni kichik maqsad va qadamlarga bo&apos;ling — har qadamni kunlik rejaga belgilab boring.</span>
    </button>
  );
}

function GoalCard({ goal, onOpen }: { goal: Goal; onOpen: () => void }) {
  const { pct, done, total } = goalProgress(goal);
  const dl = deadlineInfo(goal.deadline);
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3.5 rounded-xl border border-border bg-surface px-4 py-3.5 text-left transition-colors hover:border-border-strong">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-subtle"><GoalIcon k={goal.icon} className="size-5 text-foreground" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-medium tracking-[-0.01em]">{goal.title}</p>
        <div className="mt-1 flex items-center gap-2 text-[11.5px] text-faint">
          <span>{total > 0 ? `${done}/${total} qadam` : "qadam yo'q"}</span>
          {dl && <><span className="text-border-strong">·</span><span className={cn(dl.danger && "text-danger")}>{dl.label}</span></>}
        </div>
      </div>
      <Ring pct={pct} size={44} stroke={4} label />
      <ChevronRight className="size-4 shrink-0 text-faint" />
    </button>
  );
}

/* ─── Maqsad detali ─── */
function GoalDetail({ goal, onBack, onEdit, api }: { goal: Goal; onBack: () => void; onEdit: () => void; api: ReturnType<typeof useGoals> }) {
  const { plans } = usePlans();
  const { pct, done, total } = goalProgress(goal);
  const dl = deadlineInfo(goal.deadline);
  const [addingSub, setAddingSub] = useState(false);
  const [subLabel, setSubLabel] = useState("");
  const [pending, setPending] = useState<{ kind: "goal" | "sub" | "step"; id: string; name: string } | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [schedStep, setSchedStep] = useState<GoalStep | null>(null);
  const allDone = total > 0 && done === total;
  const archived = goal.status === "ARCHIVED";
  const subDrag = usePointerReorder((dragged, before) => api.reorderSubGoals(goal.id, dragged, before));

  function addSub() { if (!subLabel.trim()) return; api.addSubGoal(goal.id, subLabel.trim()); setSubLabel(""); setAddingSub(false); }
  function confirmDel() {
    if (!pending) return;
    if (pending.kind === "goal") { api.removeGoal(pending.id); onBack(); }
    else if (pending.kind === "sub") api.removeSubGoal(pending.id);
    else api.removeStep(pending.id);
    setPending(null);
  }

  return (
    <div className="flex flex-col overflow-y-auto" style={{ height: "var(--tg-vh, 100vh)" }}>
      <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-background/85 backdrop-blur">
        <div className="flex h-12 items-center justify-between px-4 md:px-6">
          <button type="button" onClick={onBack} className="-ml-1 flex items-center gap-1.5 rounded-md py-1 pl-1 pr-2 text-[13px] text-muted hover:text-foreground"><ArrowLeft className="size-4" /> Orqaga</button>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onEdit} aria-label="Tahrirlash" className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><Pencil className="size-4" /></button>
            {archived ? (
              <button type="button" onClick={() => { api.restoreGoal(goal.id); onBack(); }} aria-label="Arxivdan qaytarish" className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><ArchiveRestore className="size-4" /></button>
            ) : (
              <button type="button" onClick={() => setConfirmArchive(true)} aria-label="Arxivlash" className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><Archive className="size-4" /></button>
            )}
            <button type="button" onClick={() => setPending({ kind: "goal", id: goal.id, name: goal.title })} aria-label="O'chirish" className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-danger"><Trash2 className="size-4" /></button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-6 md:px-6 md:pb-12">
        {/* Maqsad sarlavhasi + progress */}
        <div className="flex flex-col items-center text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-subtle"><GoalIcon k={goal.icon} className="size-6 text-foreground" /></span>
          <h2 className="mt-3 text-[19px] font-semibold tracking-[-0.02em]">{goal.title}</h2>
          {dl && <p className={cn("mt-1 text-[12.5px]", dl.danger ? "text-danger" : "text-faint")}>{dl.label}</p>}
          <div className="my-5"><Ring pct={pct} size={168} stroke={11} label labelClassName="text-[40px] tracking-[-0.02em]" /></div>
          <p className="text-[12.5px] text-muted">{total > 0 ? `${done} / ${total} qadam bajarildi` : "Hali qadam qo'shilmagan"}</p>
        </div>

        {/* ── Yo'l xaritasi: start → bekatlar → finish ── */}
        <div className="relative mt-8 pl-10">
          <span aria-hidden className="absolute left-[15px] top-4 bottom-4 w-0.5 rounded bg-gradient-to-b from-foreground/15 via-foreground/45 to-foreground" />

          {/* Start */}
          <div className="relative mb-6">
            <span className="absolute -left-10 top-0 grid size-[30px] place-items-center rounded-full border-2 border-foreground bg-foreground text-background"><MapPin className="size-4" /></span>
            <p className="pt-1 text-[12px] font-medium uppercase tracking-[0.14em] text-faint">Boshlanish</p>
          </div>

          {/* Bekatlar (kichik maqsadlar) */}
          {goal.subGoals.map((sub, i) => (
            <SubGoalBlock key={sub.id} index={i} sub={sub} api={api} drag={subDrag} onSchedule={setSchedStep} onAskDelSub={(s) => setPending({ kind: "sub", id: s.id, name: s.title })} onAskDelStep={(st) => setPending({ kind: "step", id: st.id, name: st.title })} />
          ))}

          {/* + Kichik maqsad bekati */}
          <div className="relative mb-6">
            <span className="absolute -left-10 top-0 grid size-[30px] place-items-center rounded-full border-2 border-dashed border-border bg-background text-faint"><Plus className="size-4" /></span>
            {addingSub ? (
              <div className="rounded-xl border border-border bg-surface p-3">
                <input autoFocus onFocus={ensureVisibleOnFocus} value={subLabel} onChange={(e) => setSubLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addSub(); if (e.key === "Escape") { setAddingSub(false); setSubLabel(""); } }} placeholder="Kichik maqsad nomi" className="w-full bg-transparent text-[14px] outline-none placeholder:text-faint" />
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => { setAddingSub(false); setSubLabel(""); }} className="rounded-md px-3 py-1.5 text-[12.5px] text-faint hover:text-foreground">Bekor</button>
                  <button type="button" onClick={addSub} disabled={!subLabel.trim()} className="rounded-md bg-foreground px-3 py-1.5 text-[12.5px] font-medium text-background transition-opacity disabled:opacity-30">Qo&apos;shish</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setAddingSub(true)} className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 pl-3.5 text-[12.5px] font-medium text-faint transition-colors hover:border-border-strong hover:text-foreground"><Plus className="size-3.5" /> Kichik maqsad qo&apos;shish</button>
            )}
          </div>

          {/* Finish — maqsad */}
          <div className="relative">
            <span className={cn("absolute -left-10 top-0 grid size-[30px] place-items-center rounded-full text-background", allDone ? "bg-foreground" : "bg-foreground/85")}><Flag className="size-4" /></span>
            <div className="rounded-xl border-2 border-foreground bg-foreground/[0.04] p-4">
              <p className="text-[13.5px] font-semibold tracking-[-0.01em]">🏁 {goal.title}</p>
              <p className="mt-0.5 text-[11.5px] text-faint">{goal.deadline ? `${dl?.label} · ` : ""}{pct}% bosib o&apos;tildi</p>
              <button type="button" onClick={() => api.updateGoal(goal.id, { status: goal.status === "DONE" ? "ACTIVE" : "DONE" })} className={cn("mt-3 w-full rounded-lg border py-2.5 text-[12.5px] font-medium transition-colors", goal.status === "DONE" ? "border-border text-muted hover:text-foreground" : allDone ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:border-border-strong hover:text-foreground")}>
                {goal.status === "DONE" ? "Faolga qaytarish" : allDone ? "🎉 Maqsadni yakunlash" : "Maqsadni yakunlash"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {schedStep && <ScheduleStepModal step={schedStep} plans={plans} onClose={() => setSchedStep(null)} onRename={(t) => api.updateStep(schedStep.id, t)} onSave={(date, time) => { api.scheduleStep(schedStep.id, date, time); setSchedStep(null); }} onRemove={() => { api.unscheduleStep(schedStep.id); setSchedStep(null); }} onDelete={() => { setPending({ kind: "step", id: schedStep.id, name: schedStep.title }); setSchedStep(null); }} />}
      <ConfirmDialog open={!!pending} title="O'chirilsinmi?" description={pending ? `"${pending.name}" o'chiriladi.` : ""} confirmLabel="O'chirish" destructive onConfirm={confirmDel} onClose={() => setPending(null)} />
      <ConfirmDialog open={confirmArchive} title="Maqsadni arxivlash?" description={`"${goal.title}" arxivga o'tkaziladi. Keyin arxivdan qaytarishingiz mumkin.`} confirmLabel="Arxivlash" onConfirm={() => { api.archiveGoal(goal.id); setConfirmArchive(false); onBack(); }} onClose={() => setConfirmArchive(false)} />
    </div>
  );
}

function SubGoalBlock({ index, sub, api, drag, onSchedule, onAskDelSub, onAskDelStep }: {
  index: number; sub: SubGoal; api: ReturnType<typeof useGoals>;
  drag: ReturnType<typeof usePointerReorder>;
  onSchedule: (s: GoalStep) => void; onAskDelSub: (s: SubGoal) => void; onAskDelStep: (s: GoalStep) => void;
}) {
  const [addingStep, setAddingStep] = useState(false);
  const [stepLabel, setStepLabel] = useState("");
  const [editing, setEditing] = useState(false);
  const [titleVal, setTitleVal] = useState(sub.title);
  const stepDrag = usePointerReorder((d, b) => api.reorderSteps(sub.id, d, b));
  const total = sub.steps.length;
  const done = sub.steps.filter((s) => s.done).length;
  const complete = total > 0 && done === total;
  function addStep() { if (!stepLabel.trim()) return; api.addStep(sub.id, stepLabel.trim()); setStepLabel(""); }
  function saveTitle() { const t = titleVal.trim(); if (t && t !== sub.title) api.updateSubGoal(sub.id, t); setEditing(false); }

  return (
    <div data-reorder-id={sub.id} className={cn("relative mb-6 transition-[opacity,box-shadow] duration-150", drag.draggingId === sub.id && "opacity-40", drag.overId === sub.id && drag.draggingId !== sub.id && "shadow-[inset_0_3px_0_var(--foreground)]")}>
      {/* Bekat tuguni — yo'l chizig'i ustida; sudrash uchun ham ushlagich */}
      <span onPointerDown={(e) => drag.start(e, sub.id)} className={cn("absolute -left-10 top-0 grid size-[30px] cursor-grab touch-none select-none place-items-center rounded-full border-2 border-foreground font-mono text-[12px] font-semibold transition-colors active:cursor-grabbing", complete ? "bg-foreground text-background" : "bg-background text-foreground")}>
        {complete ? <Check className="size-4" strokeWidth={3.5} /> : index + 1}
      </span>
      <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex items-center gap-1.5 border-b border-border bg-subtle/30 px-2.5 py-2.5">
        <span onPointerDown={(e) => drag.start(e, sub.id)} aria-label="Sudrab ko'chirish" className="grid size-6 shrink-0 cursor-grab touch-none place-items-center text-faint/60 transition-colors hover:text-muted active:cursor-grabbing"><GripVertical className="size-3.5" /></span>
        {editing ? (
          <input autoFocus onFocus={ensureVisibleOnFocus} value={titleVal} onChange={(e) => setTitleVal(e.target.value)} onBlur={saveTitle} onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditing(false); }} className="min-w-0 flex-1 border-b border-foreground bg-transparent pb-0.5 text-[13.5px] font-medium outline-none" />
        ) : (
          <button type="button" onClick={() => { setTitleVal(sub.title); setEditing(true); }} className="min-w-0 flex-1 truncate text-left text-[13.5px] font-medium hover:text-foreground">{sub.title}</button>
        )}
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-faint">{done}/{total}</span>
        <button type="button" onClick={() => onAskDelSub(sub)} aria-label="O'chirish" className="grid size-6 shrink-0 place-items-center rounded text-faint hover:text-danger"><Trash2 className="size-3.5" /></button>
      </header>
      <ul className="divide-y divide-border/60">
        {sub.steps.map((st) => (
          <StepRow key={st.id} step={st} dragging={stepDrag.draggingId === st.id} over={stepDrag.overId === st.id && stepDrag.draggingId !== st.id} onHandlePointerDown={(e) => stepDrag.start(e, st.id)} onToggle={() => api.toggleStep(st.id, !st.done)} onSchedule={() => onSchedule(st)} onDelete={() => onAskDelStep(st)} />
        ))}
      </ul>
      <div className="px-3.5 py-2.5">
        {addingStep ? (
          <div>
            <input autoFocus onFocus={ensureVisibleOnFocus} value={stepLabel} onChange={(e) => setStepLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addStep(); if (e.key === "Escape") { setAddingStep(false); setStepLabel(""); } }} placeholder="Qadam nomi" className="w-full border-b border-border bg-transparent pb-1.5 text-[13.5px] outline-none placeholder:text-faint focus:border-foreground" />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => { setAddingStep(false); setStepLabel(""); }} className="rounded-md px-2.5 py-1 text-[12px] text-faint hover:text-foreground">Yopish</button>
              <button type="button" onClick={addStep} disabled={!stepLabel.trim()} className="rounded-md bg-foreground px-2.5 py-1 text-[12px] font-medium text-background transition-opacity disabled:opacity-30">Qo&apos;shish</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAddingStep(true)} className="flex items-center gap-1.5 text-[12.5px] font-medium text-faint transition-colors hover:text-foreground"><Plus className="size-3.5" /> Qadam qo&apos;shish</button>
        )}
      </div>
      </section>
    </div>
  );
}

function StepRow({ step, onToggle, onSchedule, onDelete, onHandlePointerDown, dragging, over }: { step: GoalStep; onToggle: () => void; onSchedule: () => void; onDelete: () => void; onHandlePointerDown: (e: React.PointerEvent) => void; dragging?: boolean; over?: boolean }) {
  function stop(e: React.MouseEvent, fn: () => void) { e.stopPropagation(); fn(); }
  return (
    // Qatorga bosilsa — sana/vaqt belgilash oynasi ochiladi.
    <li data-reorder-id={step.id} onClick={onSchedule} className={cn("group flex cursor-pointer items-center gap-2 px-2.5 py-2.5 transition-[background,opacity,box-shadow] hover:bg-hover/50", dragging && "opacity-40", over && "shadow-[inset_0_2px_0_var(--foreground)]")}>
      <span onPointerDown={onHandlePointerDown} onClick={(e) => e.stopPropagation()} aria-label="Sudrab ko'chirish" className="grid size-6 shrink-0 cursor-grab touch-none place-items-center text-faint/50 transition-colors hover:text-muted active:cursor-grabbing"><GripVertical className="size-3.5" /></span>
      <span className={cn("min-w-0 flex-1 truncate text-[13.5px]", step.done && "text-faint line-through decoration-faint/60")}>{step.title}</span>
      {step.scheduledFor ? (
        <span className="flex shrink-0 items-center gap-1 rounded-md bg-subtle px-1.5 py-0.5 font-mono text-[10.5px] tabular-nums text-muted">
          <CalendarIcon className="size-2.5" />{shortDate(step.scheduledFor)}{step.time ? ` ${step.time}` : ""}
        </span>
      ) : (
        <CalendarIcon className="hidden size-3.5 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100 sm:block" aria-hidden />
      )}
      {/* O'chirish — faqat desktopda (hover). Mobilda sana oynasi ichida. */}
      <button type="button" onClick={(e) => stop(e, onDelete)} aria-label="O'chirish" className="hidden size-6 shrink-0 place-items-center rounded-md text-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 sm:grid"><X className="size-3.5" /></button>
      <button type="button" onClick={(e) => stop(e, onToggle)} aria-label={step.done ? "Bekor qilish" : "Bajarildi"} className="shrink-0">
        <span className={cn("grid size-[19px] place-items-center rounded-md border transition-[border-color]", step.done ? "border-foreground bg-foreground" : "border-border-strong hover:border-foreground")}>
          {step.done && <Check className="size-[13px] text-background" strokeWidth={4} />}
        </span>
      </button>
    </li>
  );
}

/* ─── Maqsad qo'shish / tahrirlash modali ─── */
function GoalModal({ goal, onClose, onSave }: { goal?: Goal; onClose: () => void; onSave: (patch: { title: string; icon: string; deadline: string | null }) => void }) {
  const [title, setTitle] = useState(goal?.title ?? "");
  const [icon, setIcon] = useState<IconKey>((goal?.icon as IconKey) ?? randomIcon);
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  function submit() { if (!title.trim()) return; onSave({ title: title.trim(), icon, deadline: deadline || null }); }
  return (
    <Dialog open onClose={onClose} mobilePlacement="center">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4"><p className="text-[16px] font-semibold tracking-[-0.01em]">{goal ? "Maqsadni tahrirlash" : "Yangi maqsad"}</p><button type="button" onClick={onClose} aria-label="Yopish" className="-mr-1 grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><X className="size-4" /></button></header>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6">
        <div><Lbl>Nomi</Lbl><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Ingliz tilini B2 ga yetkazish" className="mt-1.5 w-full border-b border-border bg-transparent pb-2 text-[16px] outline-none placeholder:text-faint focus:border-foreground" /></div>
        <div><Lbl>Muddat (ixtiyoriy)</Lbl><div className="mt-1.5"><DateField valueIso={deadline} plans={[]} onChange={setDeadline} onClear={() => setDeadline("")} placeholder="Muddat belgilanmagan" /></div></div>
        <div><Lbl>Ikona</Lbl><div className="mt-1.5 grid grid-cols-8 gap-1.5">{ICON_CHOICES.map((k) => (<button key={k} type="button" onClick={() => setIcon(k)} className={cn("grid aspect-square place-items-center rounded-lg border transition-colors", icon === k ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:text-foreground")}><GoalIcon k={k} className="size-4" /></button>))}</div></div>
      </div>
      <div className="shrink-0 border-t border-border px-5 py-4"><button type="button" onClick={submit} disabled={!title.trim()} className="w-full rounded-lg bg-foreground py-3 text-[14px] font-medium text-background transition-opacity disabled:opacity-30">{goal ? "Saqlash" : "Qo'shish"}</button></div>
    </Dialog>
  );
}

/* ─── Qadamni kunga belgilash modali ─── */
function ScheduleStepModal({ step, plans, onClose, onSave, onRemove, onDelete, onRename }: { step: GoalStep; plans: import("@/lib/types").Plan[]; onClose: () => void; onSave: (date: string, time?: string) => void; onRemove: () => void; onDelete: () => void; onRename: (title: string) => void }) {
  const [title, setTitle] = useState(step.title);
  const [date, setDate] = useState(step.scheduledFor ?? TODAY_ISO);
  const [time, setTime] = useState(step.time ?? "");
  const occupied = useMemo(() => occupiedTimeSlots(plans, date, step.planId), [plans, date, step.planId]);
  const quick: [string, string][] = [["Bugun", TODAY_ISO], ["Ertaga", TOMORROW_ISO], ["Indinga", addDays(TODAY_ISO, 2)]];
  function save() { const t = title.trim(); if (t && t !== step.title) onRename(t); onSave(date, time || undefined); }
  return (
    <Dialog open onClose={onClose} mobilePlacement="center">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4"><p className="text-[16px] font-semibold tracking-[-0.01em]">Qadamni tahrirlash</p><button type="button" onClick={onClose} aria-label="Yopish" className="-mr-1 grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><X className="size-4" /></button></header>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6">
        <div><Lbl>Nomi</Lbl><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Qadam nomi" className="mt-1.5 w-full border-b border-border bg-transparent pb-2 text-[15px] outline-none placeholder:text-faint focus:border-foreground" /></div>

        <div>
          <Lbl>Sana</Lbl>
          <div className="mt-2 flex gap-1.5">
            {quick.map(([lbl, val]) => (
              <button key={val} type="button" onClick={() => setDate(val)} className={cn("flex-1 rounded-lg border py-2 text-[12.5px] font-medium transition-colors", date === val ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:border-border-strong hover:text-foreground")}>{lbl}</button>
            ))}
          </div>
          <div className="mt-2"><DateField valueIso={date} plans={plans} onChange={setDate} /></div>
        </div>

        <div><Lbl>Vaqt (ixtiyoriy)</Lbl><div className="mt-2"><TimeField value={time} occupiedSlots={occupied} onChange={(t) => setTime(t ?? "")} /></div></div>
      </div>
      <div className="shrink-0 space-y-2 border-t border-border px-5 py-4">
        <button type="button" onClick={save} disabled={!date || !title.trim()} className="w-full rounded-lg bg-foreground py-3 text-[14px] font-medium text-background transition-opacity disabled:opacity-30">Saqlash</button>
        {step.scheduledFor && <button type="button" onClick={onRemove} className="w-full rounded-lg border border-border py-2.5 text-[13px] font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground">Belgilashni olib tashlash</button>}
        <button type="button" onClick={onDelete} className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-medium text-danger transition-colors hover:bg-danger-soft"><Trash2 className="size-3.5" /> Qadamni o&apos;chirish</button>
      </div>
    </Dialog>
  );
}

/* Sana tanlash — do'stona matn + MiniMonth kalendar popover. */
function DateField({ valueIso, plans, onChange, onClear, placeholder }: { valueIso: string; plans: import("@/lib/types").Plan[]; onChange: (iso: string) => void; onClear?: () => void; placeholder?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const empty = !valueIso;
  return (
    <>
      <button ref={ref} type="button" onClick={() => setOpen((v) => !v)} className={cn("flex w-full items-center gap-2 rounded-md border px-3 py-2.5 text-[14px] transition-colors", open ? "border-border-strong bg-subtle text-foreground" : "border-border bg-background hover:border-border-strong", empty ? "text-faint" : "text-foreground")}>
        <CalendarIcon className="size-4 text-faint" />
        <span className="flex-1 text-left">{empty ? (placeholder ?? "Sana tanlash") : friendlyDate(valueIso)}</span>
        {!empty && onClear ? (
          <span role="button" tabIndex={0} aria-label="Tozalash" onClick={(e) => { e.stopPropagation(); onClear(); }} className="grid size-5 place-items-center rounded text-faint hover:text-danger"><X className="size-3.5" /></span>
        ) : (
          <ChevronRight className={cn("size-4 text-faint transition-transform", open && "rotate-90")} />
        )}
      </button>
      <DatePickerPopover open={open} triggerRef={ref} today={fromIso(TODAY_ISO)} selected={fromIso(valueIso || TODAY_ISO)} plans={plans} onSelect={(d) => { onChange(iso(d)); setOpen(false); }} onClose={() => setOpen(false)} />
    </>
  );
}

function Lbl({ children }: { children: React.ReactNode }) { return <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">{children}</p>; }

/* Vaqt tanlash — boshqa tasklardagidek (TimePickerPopover). */
function TimeField({ value, onChange, occupiedSlots }: { value: string; onChange: (v: string | undefined) => void; occupiedSlots?: string[] }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button ref={ref} type="button" onClick={() => setOpen((v) => !v)} className={cn("flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-[14px] tabular-nums transition-colors", open ? "border-border-strong bg-subtle text-foreground" : "border-border bg-background text-foreground hover:border-border-strong", !value && "text-faint")}>
        <Clock className="size-3.5 text-faint" />
        <span>{value || "Vaqt tanlash"}</span>
      </button>
      <TimePickerPopover open={open} triggerRef={ref} value={value} occupiedSlots={occupiedSlots} onChange={(v) => onChange(v)} onClear={() => { onChange(undefined); setOpen(false); }} onClose={() => setOpen(false)} />
    </>
  );
}
